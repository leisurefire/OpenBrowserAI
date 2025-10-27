import { render } from 'preact'
import App from './App'
document.body.style.margin = 0
document.documentElement.style.height = '100%'
document.body.style.margin = 0
document.body.style.height = '100%'
// allow scrolling inside the panel content
document.body.style.overflow = 'auto'
render(<App />, document.getElementById('app'))
