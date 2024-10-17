const i18n = require('i18next');
const i18nextBackend = require('i18next-node-fs-backend');

const i18nextOptions = {
    backend:{
        // path where resources get loaded from
        loadPath: __dirname +'/locales/{{lng}}/translation.json',

        // path to post missing resources
        addPath: __dirname +'/locales/{{lng}}/translation.missing.json',

        // jsonIndent to use when storing json files
        jsonIndent: 2,
    },
    interpolation: {
        escapeValue: false
    },
    saveMissing: true,
    fallbackLng: 'fr',
    whitelist: ['en', 'fr', 'es', 'ar', 'de', 'it', 'nl', 'pl', 'pt', 'sv'],
    react: {
        wait: false
    }
};

i18n
    .use(i18nextBackend);
// initialize if not already initialized
if (!i18n.isInitialized) {
    i18n
        .init(i18nextOptions);
}

module.exports = i18n;
