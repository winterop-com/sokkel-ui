import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const src = fileURLToPath(new URL('./src', import.meta.url))

function entries(dir: string): Record<string, string> {
    return Object.fromEntries(
        readdirSync(`${src}/${dir}`)
            .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
            .map((file) => [`${dir}/${file.replace(/\.tsx?$/, '')}`, `${src}/${dir}/${file}`]),
    )
}

/** Every component, hook and helper is its own module, so an app pulls in only what it imports. */
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        lib: {
            entry: {
                ...entries('components'),
                ...entries('components/ui'),
                ...entries('components/map'),
                ...entries('hooks'),
                ...entries('lib'),
            },
            formats: ['es'],
        },
        rolldownOptions: {
            external: (id) => !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0'),
            output: { preserveModules: true, preserveModulesRoot: 'src', entryFileNames: '[name].js' },
        },
    },
})
