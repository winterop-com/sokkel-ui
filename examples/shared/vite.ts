import type { Plugin } from 'vite'

export interface PagePolicyOptions {
    /**
     * Lets scripts run code they generate (`'unsafe-eval'`), which the library's schema checks need,
     * since ajv compiles each schema to a function. Only an example that checks values against a
     * schema sets it.
     */
    generatedCode?: boolean
}

/**
 * The Content Security Policy every example's page carries, in the browser and in both desktop
 * shells alike: scripts and workers only from the app's own files, no plugins, no frames, and no
 * other page posting the app's forms. Styles may be inline, since the editors, maps and diagrams
 * write their own; images, sounds and video may come from the page itself (`data:`, `blob:`), and
 * images and data from the web, where a map's tiles are. Tauri's IPC (`ipc:`, `http://ipc.localhost`)
 * is allowed, so the same page runs in its shell.
 */
export function pagePolicy(options: PagePolicyOptions = {}): string {
    const script = ["'self'", ...(options.generatedCode === true ? ["'unsafe-eval'"] : [])]
    return [
        "default-src 'self'",
        `script-src ${script.join(' ')}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "media-src 'self' data: blob:",
        "connect-src 'self' data: blob: https: ipc: http://ipc.localhost",
        "worker-src 'self' blob:",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join('; ')
}

/**
 * Writes `pagePolicy` into the built page as a meta tag, so the page carries it wherever it is
 * opened: on the web, from a file in Electron and in Tauri's webview. The dev server is left
 * without it, since its module reloading runs inline scripts.
 */
export function pagePolicyVite(options: PagePolicyOptions = {}): Plugin {
    return {
        name: 'tidevann-page-policy',
        apply: 'build',
        transformIndexHtml: () => [
            {
                tag: 'meta',
                attrs: { 'http-equiv': 'Content-Security-Policy', content: pagePolicy(options) },
                injectTo: 'head-prepend',
            },
        ],
    }
}
