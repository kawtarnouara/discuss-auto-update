const {app, BrowserWindow, Menu, session, shell } = require('electron');
const ProgressBar = require('electron-progressbar');
const { downloadManager } = require('./download');
let { showNoUpdatesDialog } = require('./updater');
const path = require('path');
const urlM = require('url');
const {autoUpdater} = require("electron-updater");
const { dialog } = require('electron')
const remoteMain = require("@electron/remote/main");
let backendData;
let translate;


exports.createWindow =  function(i18n, dev = true) {
    translate = i18n;
    // Setup permission handler
    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        return true;
    });
    // session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    //     callback({
    //         responseHeaders: {
    //             ...details.responseHeaders,
    //             'Content-Security-Policy': ['default-src \'none\'']
    //         }
    //     })
    // });
    // Create the browser window.


    let win = new BrowserWindow({
        // width: 600,
        // height: 600,
        title: "Piman Discuss",
        // fullscreen: true,
        width: 1400,
        height: 900,
        minWidth: 500,
        minHeight: 500,
        backgroundColor: '#ffffff',
        icon: `file://${__dirname}/icons/piman_k9o_icon.icns`,
        nodeIntegration: 'iframe',
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            nativeWindowOpen: true,
             enableRemoteModule: true
            // contextIsolation: true,
        },
        center: true,
        show: false,
    });

    win.webContents.on('new-window', (event, url, frameName, disposition, options, additionalFeatures) => {
        const openRoom = /\/room\//.test(url);
        const isPublicRoom = /\/public\//.test(url);
        const openConnectivity = url.includes('connectivity-test');
        if (openRoom || openConnectivity) {
            // open window as modal
            event.preventDefault()

            console.log(url)

            let subURL = openRoom && isPublicRoom? url.substr(url.indexOf("/public/")) : openRoom ? url.substr(url.indexOf("/room/")) : 'connectivity-test'

            console.log(subURL)

            const new_win = openNewWindow(subURL, event, options, dev, true);
            remoteMain.enable(new_win.webContents);
            new_win.webContents.on('new-window', (event, url, frameName, disposition, options, additionalFeatures) => {
                if (url.includes('connectivity-test')){
                    event.preventDefault()

                    console.log(url)

                    let subURL = 'connectivity-test';

                    console.log(subURL)

                    const connectivity_win = openNewWindow(subURL, event, options, dev);
                }
            })
        }else if(url.startsWith('https://office-piman.private-discuss.com')){
            event.preventDefault();
            Object.assign(options, {
                title: "Piman Discuss",
                modal: false,
                // parent: win,
                width: 1300,
                height: 800,
                minWidth: 500,
                minHeight: 500,
                webContents: "", // use existing webContents if provided
                show: false
            })

            let new_win = new BrowserWindow(options)
            remoteMain.enable(new_win.webContents);
            new_win.once('ready-to-show', () => {
                new_win.show()
                if (dev) {
                    new_win.webContents.openDevTools();
                }
            })
            // if (!options.webContents) {
            new_win.loadURL(url) // existing webContents will be navigated automatically
            // }
            event.newGuest = new_win
        } else if (url.includes('/pdf/')){
            event.preventDefault();
            let subUrl = url.substr(url.indexOf("/pdf/"));
            const new_win = openNewWindow(subUrl, event, options, dev, true);
            remoteMain.enable(new_win.webContents);
        } else {
            event.preventDefault();
            shell.openExternal(url);
        }
    })

    // win.webContents.on('new-window', (event, url, frameName, disposition, options, additionalFeatures) => {
    //     alert(options);
    // });
    if (dev) {
        win.webContents.openDevTools();
    }
    // win.loadURL(`file://${__dirname}/discuss/index.html#v${app.getVersion()}`);

    // create a new `splash`-Window
    splash = new BrowserWindow({
        width: 300,
        height: 300,
        backgroundColor: '#eeeeee',
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true
        }
    });
    splash.loadURL(`file://${__dirname}/assets/splash.html?connection=1`);

    // win.loadURL(`http://openproject.piman2-0.fr`);

    // Event when the window is closed.
    win.on('closed', function () {
        win = null
    });
    win.on('page-title-updated', function (event) {
        event.preventDefault();
    });


    const templateFull = getMenuAfterAuth(win, i18n);

    const templateNotFull = getMenuBeforeAuth(win, i18n);

    Menu.setApplicationMenu(Menu.buildFromTemplate(templateNotFull));
    downloadManager(win, i18n);

    return {win: win, splash: splash}
};

function openNewWindow(subURL, event, options, dev, openBeforeReady=false){
    let finalPath = urlM.format({
        pathname: path.join(__dirname, '/dist/index.html'),
        protocol: 'file:',
        slashes: true,
        hash: subURL
    })

    console.log(finalPath)

    // win.webContents.executeJavaScript('localStorage.getItem("jwt_token")').then(function(value){

    Object.assign(options, {
        title: "Piman Discuss",
        modal: false,
        // parent: win,
        width: 1300,
        height: 800,
        minWidth: 500,
        minHeight: 500,
        webContents: "", // use existing webContents if provided
        show: false,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            nativeWindowOpen: true,
            enableRemoteModule: true
        }
    })

    let new_win = new BrowserWindow(options)
    remoteMain.enable(new_win.webContents);
    if(openBeforeReady){
        new_win.show()
    }
    new_win.once('ready-to-show', () => {
        new_win.show()
        if (dev) {
            new_win.webContents.openDevTools();
        }
    })
    // if (!options.webContents) {
    new_win.loadURL(finalPath) // existing webContents will be navigated automatically
    // }
    event.newGuest = new_win
    return new_win;
}

function downloadManager2(win) {
    win.webContents.session.on('will-download', function(event, downloadItem, webContents){
        "use strict";
        // console.log(app.getPath('downloads'), downloadItem.getURL(), downloadItem.getFilename(), downloadItem.getMimeType());
        // .replace : to trim all "/" characters from downloads path
        let downloadPath = '/' + app.getPath('downloads').replace(/^\/+|\/+$/g, '') + '/' + downloadItem.getFilename();
        const fs = require('fs');
        const downloadFolder = '/' + app.getPath('downloads').replace(/^\/+|\/+$/g, '') + '/';
        let downloadFileName = downloadItem.getFilename();
        let downloadFilePath;
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
        console.log('download path : ' + downloadPath + ' - file exists : ' + fs.existsSync(downloadFilePath));
        downloadItem.setSavePath(downloadFilePath);
        // var util = require('util');
        // console.log("dowloader is called with event", util.inspect(downloadItem));
        var totalByte = downloadItem.getTotalBytes();
        var totalMByte = parseFloat((totalByte / 1000000).toFixed(2));
        // console.log('File Size', totalMByte+' MB');
        var progressBar = null;
        downloadItem.on('updated', function (event, state) {
            "use strict";
            // console.log("download item event triggred with state : "+ state, event.sender.getContentDisposition());
            let receviedBytes = downloadItem.getReceivedBytes();
            let receviedMBytes = parseFloat((receviedBytes / 1000000).toFixed(2));
            console.log("received bytes : "+ receviedBytes);
            if (state === 'interrupted') {
                // console.log('Download is interrupted');
                setTimeout(function () {
                    // progressBar.close();
                }, 5000);
            } else if (state === 'progressing') {
                if (totalByte> 0 && receviedBytes > 0) {
                    // Download progressing + started
                    // console.log("download is processing with size : "+receviedMBytes+" MB");
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
                    if (progressBar.value !== 100) {
                        progressBar.value = (receviedBytes / totalByte) * 100;
                    }
                    console.log('progressBar detail updated');
                    progressBar.detail = `Téléchargé ${receviedMBytes} MB sur ${totalMByte} MB ...`;
                }
            }
        });

        downloadItem.once('done', function(event, state) {
            console.log("INSIDE DONE with state : " + state);
            if (state === 'completed') {
                if (progressBar) {
                    let path = downloadItem.getSavePath();
                    progressBar.close();
                    let dialogFile = new BrowserWindow({
                        title: "Téléchargement - Piman Discuss",
                        width: 500,
                        height: 170,
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
}


function getMenuBeforeAuth(win, i18n) {
    return [{
        label: i18n.t('application'),
        submenu: [
        //    {label: i18n.t('about'), selector: "orderFrontStandardAboutPanel:"},
            {
                label: i18n.t('update'),  click: function () {
                    getUpdateInfo();
                }
            },
            {type: "separator"},
            {
                label: i18n.t('quit'), accelerator: "Command+Q", click: function () {
                    app.quit();
                }
            }
        ]
    }, {
        label: i18n.t('edit'),
        submenu: [
            {label: i18n.t('cancel'), accelerator: "CmdOrCtrl+Z", selector: "undo:"},
            {label: i18n.t('restore'), accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:"},
            {type: "separator"},
            {label: i18n.t('cut'), accelerator: "CmdOrCtrl+X", selector: "cut:"},
            {label: i18n.t('copy'), accelerator: "CmdOrCtrl+C", selector: "copy:"},
            {label: i18n.t('paste'), accelerator: "CmdOrCtrl+V", selector: "paste:"},
            {label: i18n.t('selectAll'), accelerator: "CmdOrCtrl+A", selector: "selectAll:"}
        ]
    }, {
        label: i18n.t('window'),
        submenu: [
            {
                label: i18n.t('reload'), accelerator: "CmdOrCtrl+R", click: function () {
                    app.badgeCount = 0;
                    win.reload();
                    // win.loadURL(`file://${__dirname}/dist/index.html`);
                }
            },
        ]
    }
    ];
}

function getMenuAfterAuth (win, i18n) {
    return [{
        label: i18n.t('application'),
        submenu: [
       //     {label: i18n.t('about'), selector: "orderFrontStandardAboutPanel:"},
            {
                label: i18n.t('update'),  click: function () {
                    getUpdateInfo();
                }
            },
            // { label: i18n.t('profil'), selector: "CmdOrCtrl+,",  click: function() { shell.openExternal('https://discuss.piman2-0.fr/account/profil'); }},
            {type: "separator"},
            {
                label: i18n.t('profil'), accelerator: "CmdOrCtrl+P", click: function (menuItem, browserWindow) {
                    let modifiers = [];
                    modifiers.push('meta'); // 'control', 'meta', etc.
                    modifiers.push('control');
                    browserWindow.webContents.sendInputEvent({type: 'keyDown', modifiers, keyCode: 'P'})
                    browserWindow.webContents.sendInputEvent({type: 'char', modifiers, keyCode: 'P'})
                    browserWindow.webContents.sendInputEvent({type: 'keyUp', modifiers, keyCode: 'P'})
                }
            },
            {
                label: i18n.t('settings'), accelerator: "CmdOrCtrl+,", click: function (menuItem, browserWindow) {
                    let modifiers = [];
                    modifiers.push('meta'); // 'control', 'meta', etc.
                    modifiers.push('control');
                    browserWindow.webContents.sendInputEvent({type: 'keyDown', modifiers, keyCode: ','})
                    browserWindow.webContents.sendInputEvent({type: 'char', modifiers, keyCode: ','})
                    browserWindow.webContents.sendInputEvent({type: 'keyUp', modifiers, keyCode: ','})
                }
            },
            {type: "separator"},
            {
                label: i18n.t('quit'), accelerator: "Command+Q", click: function () {
                    app.quit();
                }
            }
        ]
    }, {
        label: i18n.t('edit'),
        submenu: [
            {label: i18n.t('cancel'), accelerator: "CmdOrCtrl+Z", selector: "undo:"},
            {label: i18n.t('restore'), accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:"},
            {type: "separator"},
            {label: i18n.t('cut'), accelerator: "CmdOrCtrl+X", selector: "cut:"},
            {label: i18n.t('copy'), accelerator: "CmdOrCtrl+C", selector: "copy:"},
            {label: i18n.t('paste'), accelerator: "CmdOrCtrl+V", selector: "paste:"},
            {label: i18n.t('selectAll'), accelerator: "CmdOrCtrl+A", selector: "selectAll:"}
        ]
    }, {
        label: i18n.t('window'),
        submenu: [
            {
                label: i18n.t('reload'), accelerator: "CmdOrCtrl+R", click: function () {
                    app.badgeCount = 0;
                    win.reload();
                    // win.loadURL(`file://${__dirname}/dist/index.html`);
                }
            },
        ]
    }
    ];
}

function getUpdateInfo()  {
    const { net } = require('electron')
    var body = JSON.stringify({ platform: 'desktop', os: 'linux'});
    const request = net.request({
        method: 'POST',
        url: 'https://api-piman.private-discuss.com/v1.0/release/get',
        protocol: 'https:',
    });
    request.on('response', (response) => {
        console.log(`STATUS: ${response.statusCode} ${response.toString()}`);
        console.log(`HEADERS: ${JSON.stringify(response.headers)}`);

        response.on('data', (chunk) => {
            console.log(`BODY: ${JSON.stringify(JSON.parse(chunk.toString()))}`)
            backendData = JSON.parse(chunk.toString()).result.data;
            handleData();
        });
        response.on('error', (error) => {
            console.log('error :' + JSON.stringify(error))
        });
    });
    request.on('error', (error) => {
        console.log('error :' + JSON.stringify(error))
    });
    request.setHeader('Content-Type', 'application/json');
    request.write(body, 'utf-8');
    request.end();

}

function handleData() {
    const isFunctionning = versionCompare(app.getVersion(), backendData.version);
    if (backendData && (backendData.version.toString() === app.getVersion().toString() || isFunctionning !== -1)) {
            dialog.showMessageBox({
                title: 'Piman Discuss',
                message: 'Piman Discuss ' + translate.t('no_updates'),
                detail: 'Version ' + app.getVersion()
            });
        } else {
            dialog.showMessageBox({
                title: 'Piman Discuss',
                message: translate.t('download'),
                detail: translate.t('current_version') + ' ' + app.getVersion()
            });
        }
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


    exports.getMenuBeforeAuth = getMenuBeforeAuth;
exports.getMenuAfterAuth = getMenuAfterAuth;
