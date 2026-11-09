import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Leaves a package's import with a query, such as the maps package's `?worker&url` import of
 * maplibre's worker, to the dev server, since the dev server's prebundling cannot load one.
 */
const queryImports = {
    name: 'query-imports',
    resolveId: (id: string) => (/^[\w@][^?]*\?(?:worker|url)\b/.test(id) ? { id, external: true } : null),
}

/** Relative asset paths, so the build also loads from a file:// URL in the desktop shells. */
export default defineConfig({
    base: './',
    plugins: [react(), tailwindcss()],
    optimizeDeps: { rolldownOptions: { plugins: [queryImports] } },
})
