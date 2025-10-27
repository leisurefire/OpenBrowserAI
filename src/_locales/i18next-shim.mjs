// shim for i18next — language features removed, returns keys as-is
export function t(key) {
  // If key is an object or default value provided, try to return key.defaultValue or key
  try {
    if (typeof key === 'object' && key !== null && key.defaultValue) return key.defaultValue
  } catch (e) {
    // Intentionally empty to suppress errors
  }
  return typeof key === 'string' ? key : ''
}
export function changeLanguage() {
  return Promise.resolve()
}
export function init() {
  return Promise.resolve()
}
export function getFixedT() {
  return t
}
export default { t, changeLanguage, init }
