/**
 * What an app that draws maps adds to its Vite config, so the dev server serves the maps package.
 * The build needs nothing from it.
 */
import type { Plugin } from 'vite'

/** maplibre's worker as the maps package imports it, with Vite's `?worker&url` query. */
const WORKER_IMPORT = /^maplibre-gl\/[^?]*\?(?:worker|url)\b/

/**
 * A Vite plugin for an app that draws maps: it leaves the maps package's `?worker&url` import of
 * maplibre's worker to the dev server, which the dev server's dependency prebundling cannot load.
 * Add it beside the app's other plugins: `plugins: [react(), tailwindcss(), mapsVite()]`.
 */
export function mapsVite(): Plugin {
    return {
        name: 'sokkel-ui-maps',
        config: () => ({
            optimizeDeps: {
                rolldownOptions: {
                    plugins: [
                        {
                            name: 'sokkel-ui-maps:worker-import',
                            resolveId: (id: string) => (WORKER_IMPORT.test(id) ? { id, external: true } : null),
                        },
                    ],
                },
            },
        }),
    }
}
