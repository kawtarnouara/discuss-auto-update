const { session, BrowserWindow, app, ipcMain } = require('electron');
const ProgressBar = require('electron-progressbar');

let dialogFile;
let isDownloading = false;
var progressBar = null;
exports.downloadManager = function (win, i18n) {
    app.on('before-quit', (event) =>{
        app.isQuitting = true;
        if (isDownloading){
            const choice = require('electron').dialog.showMessageBoxSync(this,
                {
                    type: 'question',
                    buttons: [i18n.t('quit'), i18n.t('cancel')],
                    title: i18n.t('warning'),
                    message: i18n.t('downloading')
                });
            if (choice === 1) {
                event.preventDefault();
            } else {
                if (progressBar){
                    progressBar.close();
                    progressBar = null;
                }
                BrowserWindow.getAllWindows().map(window => {
                    window.destroy();
                });
            }
        } else {
            BrowserWindow.getAllWindows().map(window => {
                window.destroy();
            });
        }
    });

    win.on('close', function (event) {
        if (!app.isQuitting) {
            event.preventDefault();
            win.hide();
        }
    });

    ipcMain.on('close_dialog', () => {
        if (dialogFile){
            dialogFile.destroy();
            dialogFile = null;
            isDownloading = false;
        }
    });
    session.defaultSession.on('will-download', function(event, downloadItem, webContents){
        "use strict";
        // .replace : to trim all "/" characters from downloads path
        progressBar = null;
        const separator = process.platform === 'darwin' ? '/' :'\\';
        let downloadPath = (process.platform === 'darwin' ? '/' : '') + app.getPath('downloads').replace(/^\/+|\/+$/g, '') + separator + downloadItem.getFilename();
        const fs = require('fs');
        const downloadFolder = (process.platform === 'darwin' ? '/' : '')  + app.getPath('downloads').replace(/^\/+|\/+$/g, '') + separator;
        let downloadFileName = downloadItem.getFilename();
        let downloadFilePath;
        isDownloading = true;
        try {
            let suffix = "";
            let splitArray = downloadFileName.split(".");
            if (splitArray.length === 2) {
                const filename = splitArray[0];
                const extension = splitArray[1];
                let increment = 1;
                do {
                    downloadFilePath = downloadFolder + filename + suffix + '.' + extension;
                    suffix = suffix + "_" + increment;
                    increment++;
                } while (fs.existsSync(downloadFilePath));
            } else {
                downloadFilePath = downloadFolder + downloadFileName;
            }
        } catch(err) {
            downloadFilePath = downloadFolder + downloadFileName;
        }
        downloadItem.setSavePath(downloadFilePath);

        // var util = require('util');
        var totalByte = downloadItem.getTotalBytes();
        var totalMByte = parseFloat((totalByte / 1000000).toFixed(2));
        downloadItem.on('updated', function (event, state) {
            "use strict";
            let receviedBytes = downloadItem.getReceivedBytes();
            let receviedMBytes = parseFloat((receviedBytes / 1000000).toFixed(2));
            if (state === 'interrupted') {
                isDownloading = false;
            } else if (state === 'progressing') {
                if (totalByte> 0 && receviedBytes > 0) {
                    // Download progressing + started
                    if (progressBar === null) {

                        progressBar = new ProgressBar({
                            indeterminate: false,
                            title: 'Téléchargement - Piman Discuss',
                            text: 'En téléchargement ...',
                            detail: 'Préparation des données ...',
                            closeOnComplete: false,
                            browserWindow: {
                                parent: null,
                                modal: true,
                                resizable: false,
                                closable: true,
                                minimizable: true,
                                maximizable: false,
                                width: 500,
                                height: 170,
                                webPreferences: {
                                    contextIsolation: false,
                                    nodeIntegration: true
                                }
                            }
                        });
                        progressBar.on('aborted', () => {
                            if (progressBar){
                                win.setProgressBar(-1);
                                progressBar.setCompleted();
                                progressBar.close();
                                progressBar = null;
                            }
                            downloadItem.cancel();
                        })
                    }
                    if (progressBar && progressBar.value !== 100) {
                        progressBar.value = (receviedBytes / totalByte) * 100;
                    }
                    if (progressBar){
                        progressBar.detail = `Téléchargé ${receviedMBytes} MB sur ${totalMByte} MB ...`;
                    }
                }
            }
        });

        downloadItem.once('done', function(event, state) {
            isDownloading = false;
            if (state === 'completed') {
                if (progressBar) {
                    let path = downloadItem.getSavePath();
                    progressBar.close();
                     dialogFile = new BrowserWindow({
                        title: "Téléchargement - Piman Discuss",
                        width: 500,
                        height: 200,
                        backgroundColor: '#eeeeee',
                        nodeIntegration: 'iframe',
                        resizable: false,
                         webPreferences: {
                            contextIsolation: false,
                            nodeIntegration: true
                        }
                    });
                    dialogFile.loadURL(`file://${__dirname}/assets/dialogFile.html?file=${path}`);
                }
            } else {
                if (progressBar) {
                    progressBar.text = `Échec du téléchargement`;
                    setTimeout(function () {
                        progressBar.close();
                    }, 3000);
                }
            }
        });
        // session.defaultSession.clearStorageData([], function () {// console.log(' cleared all storages after download ');});
    });
};
