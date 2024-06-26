const fs = require('fs');
const path = require('path');
const electron_notarize = require('@electron/notarize');

module.exports = async function (params) {
    // Only notarize the app on Mac OS only.
    if (process.platform !== 'darwin') {
        return;
    }
    console.log('afterSign hook triggered', params);

    // Same appId in electron-builder.
    let appId = 'com.piman.dicuss'

    let appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
    if (!fs.existsSync(appPath)) {
        throw new Error(`Cannot find application at: ${appPath}`);
    }

    console.log(`Notarizing ${appId} found at ${appPath}`);

    try {
        await electron_notarize.notarize({
            tool: 'notarytool',
            teamId: 'GUY537YB55',
            appBundleId: appId,
            appPath: appPath,
            appleId: "kawtar.nouara@gmail.com",
            appleIdPassword: "wduy-nmmn-ghqd-ajku"
        });
    } catch (error) {
        console.error(error);
    }

   // console.log(`Done notarizing ${appId}`);
};
