const { app, ipcMain } = require('electron');
const {autoUpdater} = require("electron-updater");
const ProgressBar = require('electron-progressbar');
const { BrowserWindow } = require('electron')
const { dialog } = require('electron')
const Sentry = require("@sentry/electron");
var showNoUpdatesDialog = false;
var dialogUpdate;
var dialogCheckUpdate;
let backendData;
let autoUpdateVersion;
let mainWindow;
let i18n;
exports.initUpdater = (window, i18nParam) => {
    i18n = i18nParam;
    mainWindow = window;
    getUpdateInfo(false);
//s    autoUpdater.requestHeaders = { "PRIVATE-TOKEN": "Yra7hy4NWZPvgsNFWWo_" };
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    let progressBar;
    autoUpdater.on('checking-for-update', () => {
        // sendStatusToWindow('Checking for update...');
    });
    autoUpdater.on('update-available', (info) => {
        autoUpdateVersion = info.version;
        // mainWindow.webContents.send('update_available');

        if (backendData){
            if (versionCompare(app.getVersion(), backendData.version ) < 0) {
                if(backendData.version.toString() === info.version.toString()) {
                    openUpdateModal();
                    return;
                }
            }
        }   if (showNoUpdatesDialog){
            dialog.showMessageBox({
                title: 'Piman Discuss',
                message: 'Piman Discuss ' + i18n.t('is_uptodate'),
                detail: i18n.t('version') + ' ' + app.getVersion()
            });
        }
    });
    autoUpdater.on('update-not-available', () => {
        if (showNoUpdatesDialog){
            dialog.showMessageBox({
                title: 'Piman Discuss',
                message: 'Piman Discuss ' + i18n.t('is_uptodate'),
                detail: i18n.t('version') + ' ' + app.getVersion()
            });
        }
    });

    autoUpdater.on('error', (err) => {
        // sendStatusToWindow('Error in auto-updater. ' + err);
        // mainWindow.webContents.send('update_error');
        if (progressBar){
            progressBar.close();
            updateDialog(i18n.t('update_') + ' - Piman Discuss', {
                title: i18n.t('update_failed') ,
                details: i18n.t('retry_later'),
                withButtons: 0,
                success : 0
            });
        }
        if (!backendData) {
            throw new Error('Error : get releases from backend');
        }
        if (backendData && backendData.type === 'auto') {
            if (versionCompare(app.getVersion(), backendData.version ) < 0) {
                if(backendData.version.toString() === info.version.toString()) {
                    backendData.type = 'manual';
                    openUpdateModal();
                }
            }
        }
        handleError(err);

    });
    autoUpdater.on('download-progress', (progressObj) => {
        if (progressBar != null) {
            progressBar.value = progressObj.percent;
            let MbytesPerSecond = parseFloat((progressObj.bytesPerSecond / 1000000).toFixed(2));
            let log_message = i18n.t('download_speed') + MbytesPerSecond + "MB/s  \n";
            let transferredMBytes = parseFloat((progressObj.transferred / 1000000).toFixed(2));
            let totalMBytes = parseFloat((progressObj.total / 1000000).toFixed(2));
            progressBar.detail = log_message + i18n.t('downloaded') +` ${transferredMBytes} MB ${i18n.t('out_of')} ${totalMBytes} MB ...`;
        }
        // sendStatusToWindow(log_message);
    });
    autoUpdater.on('update-downloaded', (info) => {
        // sendStatusToWindow('Update downloaded');
        // setTimeout(function() {
        //     autoUpdater.quitAndInstall();
        // }, 5000)
        // mainWindow.webContents.send('update_downloaded');
        if (progressBar){
            progressBar.close();
        }

         dialogUpdate = updateDialog(i18n.t('update_') +  ' - Piman Discuss', {
            title: i18n.t('update_done'),
            details: i18n.t('update_done_restart'),
            withButtons: 1,
            success : 1
        });

    });

    ipcMain.on('restart_app', () => {
            dialogUpdate.destroy();
            dialogUpdate = null;
        setImmediate(() => {
            app.removeAllListeners('window-all-closed');
            app.isQuitting = true;
            autoUpdater.quitAndInstall();

        });
    });


    ipcMain.on('update-app', () => {
        getUpdateInfo(true)
    });


    ipcMain.on('cancel_update', () => {
        dialogCheckUpdate.destroy();
        dialogCheckUpdate = null;
    });


    ipcMain.on('update_app', () => {
        autoUpdater.downloadUpdate();
        dialogCheckUpdate.destroy();
        dialogCheckUpdate = null;
        if (!progressBar) {
            progressBar = new ProgressBar({
                indeterminate: false,
                title: i18n.t('update_') +  ' - Piman Discuss',
                text: i18n.t('downloading_now'),
                detail: i18n.t('preparing_new_version'),
                closeOnComplete: false,
                browserWindow: {
                    parent: null,
                    modal: true,
                    resizable: false,
                    closable: false,
                    minimizable: false,
                    maximizable: false,
                    width: 500,
                    height: 170,
                    webPreferences: {
                        contextIsolation: false,
                        nodeIntegration: true
                    }
                }
            });
        }
    });

    ipcMain.on('download_app', (event, info) => {
        dialogCheckUpdate.destroy();
        dialogCheckUpdate = null;
        if(info.url){
            mainWindow.webContents.downloadURL(info.url);
        }
    });
};


function handleError(err) {
    console.error(err);
    Sentry.captureException(err);
}

function openUpdateModal() {
    if (!backendData) {
        return;
    }
    const data = backendData;
    const version = data.version;
    const type = data.type || 'auto';
    const link = data.download_link || null;
    const description = data.description;
    let force_update = data.force_update;
    const oldVersion = app.getVersion();
    const min_functionning_version = data.min_functionning_version;
    const isFunctionning = min_functionning_version ? versionCompare(oldVersion, min_functionning_version) : 1;
    force_update = isFunctionning === -1 ? 1 : force_update;
    dialogCheckUpdate = checkupdateDialog('', {
        version: version,
        old_version: oldVersion,
        type,
        link,
        details: description ? description : '',
        force_update: force_update,
        update_available: i18n.t('update_available'),
        update_message: i18n.t('update_message'),
        update_message_2: i18n.t('update_message_2'),
        later: i18n.t('later'),
        update_now: i18n.t('update_now'),
        download_app: i18n.t('download_app')
    });
}

function sendStatusToWindow(text) {
    console.log(text);
}

function updateDialog(dialogTitle, options) {
    let dialogFile = new BrowserWindow({
        title: dialogTitle,
        width: 500,
        height: 170,
        backgroundColor: '#eeeeee',
        nodeIntegration: 'iframe',
        resizable: false,
        closable: true,
        fullscreenable: false,
        alwaysOnTop: true,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true
        },
        center: true
    });
    // let query = encodeQueryData({
    //     title: title,
    //     details: details,
    //     withButtons: 0,
    //     success : 0
    // });
    let query = encodeQueryData(options);
    dialogFile.loadURL(`file://${__dirname}/assets/updateDialog.html?${query}`);
    return dialogFile;
}

function checkupdateDialog  (dialogTitle, options)   {
    let dialogFile = new BrowserWindow({
        title: dialogTitle,
        width: 600,
        height: 450,
        frame: false,
        backgroundColor: 'white',
        nodeIntegration: 'iframe',
        resizable: false,
        closable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true
        },
        center: true
    });

    let query = encodeQueryData(options);
    dialogFile.loadURL(`file://${__dirname}/assets/checkUpdateDialog.html?${query}`);
    return dialogFile;
}

exports.getUpdateInfo = getUpdateInfo = (showNoUpdates)  => {
    showNoUpdatesDialog = showNoUpdates;
    const { net } = require('electron')
    mainWindow.webContents
        .executeJavaScript('({...localStorage});', true)
        .then(localStorage => {
    var body = JSON.stringify({ platform: 'desktop', os: 'macos'});
    let finalResponse = '';
    const request = net.request({
        method: 'POST',
        url: 'https://api-piman.private-discuss.com/v1.0/release/get' ,
        protocol: 'https:',
    });
    request.setHeader('Content-Type', 'application/json');
    const jwtToken = localStorage['jwt_token'];
    if (jwtToken) {
        request.setHeader('Authorization', `Bearer ${jwtToken}`);
    }
    request.on('response', (response) => {

        response.on('data', (chunk) => {
            try{
                if (chunk){
                    finalResponse += chunk.toString()

                }
            } catch(e){
                handleError(e);
            }
        });
        response.on('end', () => {
            const parsed = JSON.parse(finalResponse);
            backendData = parsed.result.data;
            autoUpdater.checkForUpdatesAndNotify();

        })
        response.on('error', (error) => {
            console.log('error :' + JSON.stringify(error))
        });
    });
    request.on('error', (error) => {
        handleError(error);
     console.log('error :' + JSON.stringify(error))
    });

    request.write(body, 'utf-8');
    request.end();
        });
}

function encodeQueryData(data) {
    const ret = [];
    for (let d in data)
        ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
    return ret.join('&');
}


function versionCompare(v1, v2, options = {zeroExtend: false, lexicographical: false}) {
    const lexicographical = options && options.lexicographical,
        zeroExtend = options && options.zeroExtend;
    let v1parts = v1.split('.');
    let v2parts = v2.split('.');

    function isValidPart(x) {
        return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
    }

    if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
        return NaN;
    }

    if (zeroExtend) {
        while (v1parts.length < v2parts.length) { v1parts.push('0'); }
        while (v2parts.length < v1parts.length) { v2parts.push('0'); }
    }

    if (!lexicographical) {
        v1parts = v1parts.map(Number);
        v2parts = v2parts.map(Number);
    }

    for (let i = 0; i < v1parts.length; ++i) {
        if (v2parts.length === i) {
            return 1;
        }

        if (v1parts[i] === v2parts[i]) {
            continue;
        } else if (v1parts[i] > v2parts[i]) {
            return 1;
        } else {
            return -1;
        }
    }

    if (v1parts.length !== v2parts.length) {
        return -1;
    }

    return 0;
}
