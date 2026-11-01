import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Loads src/i18n/locales/<language>/<namespace>.json (bundled, so it works offline).
const files = import.meta.glob('./locales/*/*.json', { eager: true, import: 'default' })

const resources = {}
for (const [path, content] of Object.entries(files)) {
  const [, language, namespace] = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/)
  resources[language] ??= {}
  resources[language][namespace] = content
}

export const languages = ['en', 'fil']

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: languages,
  ns: Object.keys(resources.en),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

const syncHtmlLang = (language) => {
  document.documentElement.lang = language
}
i18n.on('languageChanged', syncHtmlLang)
syncHtmlLang(i18n.language)

export default i18n
