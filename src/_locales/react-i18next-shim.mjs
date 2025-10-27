// minimal shim for react-i18next's useTranslation hook
export function useTranslation() {
  return {
    t: (k) => (typeof k === 'string' ? k : ''),
    i18n: { changeLanguage: () => Promise.resolve() },
  }
}
export default { useTranslation }
