import { addons } from 'storybook/manager-api'
import { create } from 'storybook/theming'

/** The library's mark, the stepped plinth: each layer stronger than the one above, the base strongest. */
const MARK = `<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" style="width:20px;height:20px;flex:none"><path d="M10 6h12v4H10z" fill-opacity="0.3"/><path d="M6 14h20v4H6z" fill-opacity="0.6"/><path d="M2 22h28v4H2z"/></svg>`

const brandTitle = `<span style="display:inline-flex;align-items:center;gap:8px;font-weight:600">${MARK}sokkel-ui</span>`

// The sidebar follows the system's scheme, as Storybook's own default does.
const dark = window.matchMedia('(prefers-color-scheme: dark)').matches

addons.setConfig({ theme: create({ base: dark ? 'dark' : 'light', brandTitle, brandUrl: './', brandTarget: '_self' }) })
