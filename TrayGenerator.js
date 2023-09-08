const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

class TrayGenerator {
    constructor(mainWindow, i18n) {
        this.tray = null;
        this.mainWindow = mainWindow;
        this.i18n = i18n;
    }


    showWindow = () => {
        this.mainWindow.show();
        this.mainWindow.setVisibleOnAllWorkspaces(true);
        this.mainWindow.focus();
        this.mainWindow.setVisibleOnAllWorkspaces(false);
    };

    toggleWindow = () => {
        //  if (!this.mainWindow.isVisible()) {
        this.showWindow();
        //   }
    };

    rightClickMenu = () => {
        const menu = [
            {
                label: this.i18n.t('show_app'),
                click: () => {
                    if(this.mainWindow){
                        this.mainWindow.show();
                    }
                }
            },
            {
                label: this.i18n.t('quit'),
                role: 'quit',
                accelerator: 'Command+Q'
            }
        ];
        this.tray.popUpContextMenu(Menu.buildFromTemplate(menu));
    }

    createTray = () => {
        this.tray = new Tray(nativeImage.createFromPath(path.join(__dirname, './build/bar.ico')));
        this.tray.setIgnoreDoubleClickEvents(true);

        this.tray.on('click', this.toggleWindow);
        this.tray.on('right-click', this.rightClickMenu);
    };
}

module.exports = TrayGenerator;
