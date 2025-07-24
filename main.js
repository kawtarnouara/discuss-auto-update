//require('v8-compile-cache');
const {
    app,
    BrowserWindow,
    ipcMain,
    systemPreferences,
    protocol,
    Menu,
    ipcRenderer,
    desktopCapturer,
    nativeImage,
    net,
    Tray
} = require('electron');
const electron = require('electron');
const {createWindow, changeLang} = require('./windows');
const {initUpdater} = require('./updater');
const i18n = require('./configs/i18next.config');
const remoteMain = require("@electron/remote/main");
const TrayGenerator = require('./TrayGenerator');
const {
    mouse,
    screen,
    straightTo,
    Button, keyboard, Key, Point
} = require("@nut-tree-fork/nut-js");
const { powerSaveBlocker } = require('electron');
const Sentry = require('@sentry/electron');

let dev = false;
app.getLocale()
let blockerId;
let win;
let splash;
let result;
let mainurl;
let mainev;
const AsciiToNutJSMapping = {
    // Special keys
    'Backspace': Key.Backspace,
    'Tab': Key.Tab,
    'Enter': Key.Enter,
    'Shift': Key.RightShift,
    'Control': Key.RightControl,
    'Alt': Key.RightAlt,
    'Pause': Key.Pause,
    'CapsLock': Key.CapsLock,
    'Escape': Key.Escape,
    'PageUp': Key.PageUp,
    'PageDown': Key.PageDown,
    'End': Key.End,
    'Home': Key.Home,
    'ArrowLeft': Key.Left,
    'ArrowUp': Key.Up,
    'ArrowRight': Key.Right,
    'ArrowDown': Key.Down,
    'Insert': Key.Insert,
    'Delete': Key.Delete,
    'Meta': Key.RightCmd,
    'ContextMenu': Key.Menu,
    'F1': Key.F1,
    'F2': Key.F2,
    'F3': Key.F3,
    'F4': Key.F4,
    'F5': Key.F5,
    'F6': Key.F6,
    'F7': Key.F7,
    'F8': Key.F8,
    'F9': Key.F9,
    'F10': Key.F10,
    'F11': Key.F11,
    'F12': Key.F12,

    // Alphabets
    'a': Key.A,
    'b': Key.B,
    'c': Key.C,
    'd': Key.D,
    'e': Key.E,
    'f': Key.F,
    'g': Key.G,
    'h': Key.H,
    'i': Key.I,
    'j': Key.J,
    'k': Key.K,
    'l': Key.L,
    'm': Key.M,
    'n': Key.N,
    'o': Key.O,
    'p': Key.P,
    'q': Key.Q,
    'r': Key.R,
    's': Key.S,
    't': Key.T,
    'u': Key.U,
    'v': Key.V,
    'w': Key.W,
    'x': Key.X,
    'y': Key.Y,
    'z': Key.Z,
    'A': Key.A,
    'B': Key.B,
    'C': Key.C,
    'D': Key.D,
    'E': Key.E,
    'F': Key.F,
    'G': Key.G,
    'H': Key.H,
    'I': Key.I,
    'J': Key.J,
    'K': Key.K,
    'L': Key.L,
    'M': Key.M,
    'N': Key.N,
    'O': Key.O,
    'P': Key.P,
    'Q': Key.Q,
    'R': Key.R,
    'S': Key.S,
    'T': Key.T,
    'U': Key.U,
    'V': Key.V,
    'W': Key.W,
    'X': Key.X,
    'Y': Key.Y,
    'Z': Key.Z,

    // Numbers
    '0': Key.Num0,
    '1': Key.Num1,
    '2': Key.Num2,
    '3': Key.Num3,
    '4': Key.Num4,
    '5': Key.Num5,
    '6': Key.Num6,
    '7': Key.Num7,
    '8': Key.Num8,
    '9': Key.Num9,

    // ASCII Characters
    ' ': Key.Space,
    '!': Key.Exclamation,
    '"': Key.DoubleQuote,
    '#': Key.Hash,
    '$': Key.Dollar,
    '%': Key.Percent,
    '&': Key.Ampersand,
    '\'': Key.Quote,
    '(': Key.Left_parenthesis,
    ')': Key.Right_parenthesis,
    '*': Key.Asterisk,
    '+': Key.Add,
    ',': Key.Comma,
    '-': Key.Minus,
    '/': Key.Slash,
    ':': Key.Colon,
    '<': Key.Less_than,
    '=': Key.Equal,
    '>': Key.Greater_than,
    '?': Key.Question_mark,
    '@': Key.At,
    '[': Key.LeftBracket,
    '\\': Key.Backslash,
    ']': Key.RightBracket,
    '^': Key.Caret,
    '_': Key.Underscore,
    '`': Key.Backtick,
    '{': Key.Left_brace,
    '|': Key.Pipe,
    '}': Key.Right_brace,
    '~': Key.Tilde
};
Sentry.init({ dsn: "https://793e9612838b4974b9ed19469fad2643@sentry.piman-digital.com/36" });
// Alphabets and Numbers
for (let i = 65; i <= 90; i++) {  // ASCII for A-Z
    AsciiToNutJSMapping[String.fromCharCode(i).toLowerCase()] = Key[String.fromCharCode(i)];
}

for (let i = 48; i <= 57; i++) {  // ASCII for 0-9
    AsciiToNutJSMapping[String.fromCharCode(i)] = Key["N" + String.fromCharCode(i)];
}
mouse.config.autoDelayMs = 0;
remoteMain.initialize();
app.setLoginItemSettings({
    openAtLogin: true
});
// Create window on electron intialization
process.on('uncaughtException', (error) => {
    Sentry.captureException(error);
});
if (process.platform === 'win32') {
    app.setAsDefaultProtocolClient('piman-discuss');

    const primaryInstance = app.requestSingleInstanceLock();
    if (!primaryInstance) {
        app.quit();
        return;
    }

// The primary instance of the application will run this code, not the new  instance
    app.on('second-instance', (event, args) => {
        if (args.slice(1) && args.slice(1)[2]) {
            mainurl = args.slice(1)[2];
            if (win) {
                win.webContents.send('open-window', mainurl);
                mainurl = null;
                if (win.isMinimized()) {
                    win.restore();
                }
                win.focus();
            }
        }
    });
}


/*app.on('before-quit', () => {
/!*    BrowserWindow.getAllWindows().map(window => {
        window.destroy();
    });*!/
});*/

//app.on('will-quit', (ev) => {
// console.log('will-quit');
// BrowserWindow.getAllWindows().map(window => {
//     console.log('before-quit', window);
//     window.destroy();
// });
// ev.preventDefault();
//});

app.on('open-url', function (ev, url) {
    ev.preventDefault();
    mainev = ev;
    mainurl = url;
    if (app.isReady()) {
        if (win) {
            win.webContents.send('open-window', mainurl);
            mainurl = null;
            if (win.isMinimized()) {
                win.restore();
            }
            win.focus();
        }
    }
});

// let tray = null
// function createTray () {
//   const icon = `file://${__dirname}/icons/piman_k9o_icon.icns` // required.
//   const trayicon = nativeImage.createFromPath(icon)
//   tray = new Tray(trayicon.resize({ width: 16 }))
//   const contextMenu = Menu.buildFromTemplate([
//     {
//       label: 'Show App',
//       click: () => {
//         if(win){
//             win.show();
//         }else{
//             createMainWindow(dev)
//         }
//       }
//     },
//     {
//       label: 'Quit',
//       click: () => {
//         app.isQuiting = true
//         app.quit();
//       }
//     },
//   ])

//   tray.setContextMenu(contextMenu)
// }
app.on('ready', async () => {
    protocol.handle('piman-discuss', () => {
        return net.fetch(`file://${__dirname}/dist/index.html`)
    })
    electron.powerMonitor.on('lock-screen', () => {
        if (win) {
            win.webContents.send('screen-lock-change', 'lock');
        }
    });

    electron.powerMonitor.on('unlock-screen', () => {
        if (win) {
            win.webContents.send('screen-lock-change', 'unlock');
        }
    });

    i18n.on('loaded', (loaded) => {
        const lang = ['en', 'fr', 'es', 'ar', 'de', 'it', 'nl', 'pl', 'pt', 'sv'].includes(app.getLocale()) ? app.getLocale() : 'fr';
        i18n.changeLanguage(lang);
        i18n.off('loaded');
    });

    i18n.on('languageChanged', (lng) => {
        changeLang(i18n, lng, win);
    });

    result = await createWindow(i18n, dev);
    // console.log('result ----------------' , result);
    console.log('token ----------------', process.env.GH_TOKEN);
    splash = result.splash;
    if (process.platform === 'win32' && process.argv.slice(1) && process.argv.slice(1)[0]) {
        mainurl = process.argv.slice(1)[0]
    }
    win = result.win;
    remoteMain.enable(win.webContents);
    win.webContents.on('did-finish-load', (event) => {
        if (mainurl) {
            event.preventDefault();
            let options = {
                title: "Piman Discuss",
                modal: false,
                // parent: win,
                width: 1300,
                height: 800,
                minWidth: 500,
                minHeight: 500,
                webContents: "", // use existing webContents if provided
                show: false
            }
            let new_win = new BrowserWindow(options)
            remoteMain.enable(new_win.webContents);
            new_win.once('ready-to-show', () => {
                // new_win.webContents.send('redirect-to-url', mainurl);
                new_win.show()
                if (dev) {
                    new_win.webContents.openDevTools();
                }
            })
            // if (!options.webContents) {
            new_win.loadURL(mainurl) // existing webContents will be navigated automatically
            // }
            event.newGuest = new_win
            // win.webContents.send('redirect-to-url', mainurl);
            //mainurl = args.slice(1)[2];
            mainurl = null;
        }
    });
    const Tray = new TrayGenerator(win, i18n);
    Tray.createTray();

});


// Quit when all windows are closed.
app.on('window-all-closed', function (ev) {
    // console.log('window-all-closed');
    // ev.preventDefault();
    // On macOS specific close process
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', async () => {
    // macOS specific close process
    console.log('ONBEFOREUNLOAD -----');
    // protocol.registerSchemesAsPrivileged([
    //     { scheme: 'file', privileges: { standard: true, supportFetchAPI: true, secure: true } }
    // ]);
    if (win === null) {
        win = await createMainWindow(dev)
    } else {
        console.log('ONBEFOREUNLOAD ----- ', win);
        try {
            win.show();
        } catch (err) {
            handleError(err);
        }
    }
});

exports.setBadge = (count) => app.badgeCount = (count >= 0) ? count : 0;
exports.getPlatformName = () => process.platform;
exports.getVersionName = () => app.getVersion();
// AUTO UPDATER
// app.on('ready', function()  {
//   autoUpdater.checkForUpdates();
// });

let currentStatus = null;
console.error(__dirname);
ipcMain.on('setBadge', (event, count) => {
    app.badgeCount = (count >= 0) ? count : 0
});

ipcMain.on('notification-click', (event) => {
    if (win) {
        win.show();
    }
});

ipcMain.on('change-language', (event, lang) => {
   changeLang(i18n, lang, win);
});

ipcMain.on('get-sources', async (event, types) => {
    //   const has_perms = systemPreferences.getMediaAccessStatus('screen');
    // console.log('has_perms', has_perms);
    const sources = (await desktopCapturer.getSources({ types: ['screen', 'window'] }))
        .map(source => ({
            ...source,
            thumbnail: source.thumbnail.toDataURL()
        }))
        .sort((a, b) => {
            const isScreenA = a.id.startsWith('screen:');
            const isScreenB = b.id.startsWith('screen:');
            if (isScreenA && !isScreenB) return -1;
            if (!isScreenA && isScreenB) return 1;
            return 0;
        });
    console.log('get sources ' , sources);
    event.reply('get-sources-reply', sources);
});

ipcMain.on('online-status-changed', (event, status) => {
    console.log('on -----');
    // console.log(status);
    if (status === 'online' && currentStatus !== 'online') {
        currentStatus = 'online';
        splash.loadURL(`file://${__dirname}/assets/splash.html?connection=1`);
        console.info(`file://${__dirname}/dist/index.html`)
          win.loadURL(`file://${__dirname}/dist/index.html`);
        // win.loadURL(`http://localhost:4200/`);
        win.once('ready-to-show', () => {
            splash.destroy();
            win.show();
            currentStatus = null;
            // const isAllowedMicrophone = await systemPreferences.askForMediaAccess('microphone');
            /*   // const isAllowedCamera = await systemPreferences.askForMediaAccess('camera');
               console.log("MICROHPHONE ALLOWED ------" + isAllowedMicrophone);
               console.log("Camera ALLOWED ------" + isAllowedCamera);*/
            initUpdater(win, i18n);
        });
    } else if (status === 'offline' && currentStatus !== 'offline') {
        currentStatus = 'offline';
        splash.loadURL(`file://${__dirname}/assets/splash.html?connection=0`);
    }
});

ipcMain.on('download-btn', (e, args) => {
    console.log('---- on download-btn');
    download(BrowserWindow.getFocusedWindow(), args.url)
        .then(dl => {
            // console.log(dl.getSavePath());
        })
        .catch(err => {
            handleError(err);
        });
});

ipcMain.on("download", (event, info) => {
    console.log("ipcMain download triggerd");
});

ipcMain.on("powerSaveBlocker", (event, method) => {
    console.log('powersaveblocker ', method);
    if (method === 'start') {
        blockerId = powerSaveBlocker.start('prevent-display-sleep');
    } else if (method === 'stop' && blockerId !== undefined) {
        powerSaveBlocker.stop(blockerId);
        blockerId = undefined;
    }
});

ipcMain.on("mouseMove", (event, mouseData) => {
    moveMouse(mouseData, null);
});

function moveMouse(mouseData, callback) {
    try {
        getMouseTarget(mouseData)
            .then(async (target) => {
                console.log("target 2" , target)
                await mouse.move(straightTo(target));
                console.log("target 3" , target)

                if (callback) {
                    callback();
                }
            })
            .catch(error => {
                handleError(error);
            });

    } catch (e) {
        handleError(e);
    }
}

function getMouseTarget(mouseData) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log("mouseData " , mouseData)
            const width = await screen.width();
            const height = await screen.height();
            const ratioX = width / mouseData.clientWidth
            const ratioY = height / mouseData.clientHeight

            const hostX = mouseData.clientX * ratioX
            const hostY = mouseData.clientY * ratioY
            const target = new Point(hostX, hostY);
            console.log("target " , target)
            resolve(target);
        } catch (e) {
            handleError(e);
            reject(e);
        }
    });
}


ipcMain.on("mouseDrag", (event, mouseData) => {
        try {
            getMouseTarget(mouseData)
                .then(async (target) => {
                    await mouse.drag(straightTo(target));

                })
                .catch(error => {
                    handleError(error);
                });

        } catch (e) {
            handleError(e);
        }
});

ipcMain.on("mouseClick", (event, mouseData) => {
    const callback = (async () => {
        try {
            switch (mouseData.button) {
                case 'LEFT':
                    await mouse.leftClick();
                    break;
                case 'MIDDLE':
                    await mouse.click(Button.MIDDLE);
                    break;
                case 'RIGHT':
                    await mouse.rightClick();
                    break;
            }
            console.log('mouse click ', mouseData.button)
        } catch (e) {
            handleError(e);
        }

    });
    moveMouse(mouseData, callback);
});

ipcMain.on("mouseDoubleClick", (event, mouseData) => {
    const callback = (async () => {
        try {
            await mouse.click(Button.LEFT);
            switch (mouseData.button) {
                case 'LEFT':
                    await mouse.doubleClick(Button.LEFT);
                    break;
                case 'MIDDLE':
                    await mouse.doubleClick(Button.MIDDLE);
                    break;
                case 'RIGHT':
                    await mouse.doubleClick(Button.RIGHT);
                    break;
            }
        } catch (e) {
            handleError(e);
        }

    });
    moveMouse(mouseData, callback);

});


ipcMain.on("mouseScroll", (event, mouseData) => {
    const callback = (async () => {
        try {
            switch (mouseData.position) {
                case 'LEFT':
                    await mouse.scrollLeft(mouseData.amount);
                    break;
                case 'UP':
                    await mouse.scrollUp(mouseData.amount);
                    break;
                case 'DOWN':
                    await mouse.scrollDown(mouseData.amount);
                    break;
                case 'RIGHT':
                    await mouse.scrollRight(mouseData.amount);
                    break;
            }
        } catch (e) {
            handleError(e);
        }

    });
    moveMouse(mouseData, callback);
});

ipcMain.on("mouseRelease", (event, mouseData) => {
    const callback = (async () => {
        try {
            switch (mouseData.button) {
                case 'LEFT':
                    await mouse.releaseButton(Button.LEFT);
                    break;
                case 'MIDDLE':
                    await mouse.releaseButton(Button.MIDDLE);
                    break;
                case 'RIGHT':
                    await mouse.releaseButton(Button.RIGHT);
                    break;
            }
        } catch (e) {
            handleError(e);
        }

    });
    moveMouse(mouseData, callback);

});

ipcMain.on("mousePress", (event, mouseData) => {
    const callback = (async () => {
        try {
            switch (mouseData.button) {
                case 'LEFT':
                    await mouse.pressButton(Button.LEFT);
                    break;
                case 'MIDDLE':
                    await mouse.pressButton(Button.MIDDLE);
                    break;
                case 'RIGHT':
                    await mouse.pressButton(Button.RIGHT);
                    break;
            }
        } catch (e) {
            handleError(e);
        }

    });
    moveMouse(mouseData, callback);
});

ipcMain.on("keyboardPress", (event, keyboardData) => {
    (async () => {
        try {
            await keyboard.pressKey(keyboardData.input);
        } catch (e) {
            handleError(e);
        }

    })();
});

ipcMain.on("keyboardRelease", (event, keyboardData) => {
    (async () => {
        try {
            await keyboard.releaseKey(keyboardData.input, Key.L);
        } catch (e) {
            handleError(e);
        }

    })();
});

ipcMain.on("keyboardType", (event, keyboardDatas) => {
    (async () => {
        for (const keyboardData of keyboardDatas) {
            try {
                if(keyboardData.isSpecialKey) {
                    handleSpecialKeys(keyboardData.key);
                    return;
                }
                const stringKey = keyboardData.key === keyboardData.key.toUpperCase() ? keyboardData.key : mapKeyEventToNutJS(keyboardData, !/shift|meta|alt|cmd/.test(keyboardData.code.toLowerCase()));
                const key = mapKeyEventToNutJS(keyboardData, false);
                console.log("stringKey ", stringKey);
                if (stringKey) {
                    await keyboard.type(stringKey);
                } else if (keyboardData.shiftKey) {
                    await keyboard.pressKey(Key.RightShift, key);
                    await keyboard.releaseKey(Key.RightShift, key);
                } else if (keyboardData.ctrlKey || keyboardData.metaKey) {
                    await keyboard.pressKey(Key.RightControl, key);
                    await keyboard.releaseKey(Key.RightControl, key);
                } else if (keyboardData.altKey) {
                    console.log("key alt", key);
                    await keyboard.pressKey(Key.RightAlt, key);
                    await keyboard.releaseKey(Key.RightAlt, key);
                }
            } catch (e) {
                handleError(e);
            }
        }
    })();

});


function handleError(err) {
    console.error(err);
    Sentry.captureException(err);
}


function handleSpecialKeys(key) {
    const superKey = process.platform === "darwin" ? Key.LeftSuper : Key.LeftControl;

    const copyShortcut = [superKey, Key[key.toUpperCase()]];

    (async () => {
        await keyboard.pressKey(...copyShortcut);
        await keyboard.releaseKey(...copyShortcut);
    })();
}


function mapKeyEventToNutJS(keyEvent, canBeString) {
    return AsciiToNutJSMapping[keyEvent.key] || (canBeString && keyEvent.key !== "Dead" ? keyEvent.key : null);
}
