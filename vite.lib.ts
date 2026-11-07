import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig, type UserConfig } from 'vite'

/** Every source module under `dir`, keyed by its path from `src` without the extension; tests and declarations are left out. */
function entries(src: string, dir: string): Record<string, string> {
    return Object.fromEntries(
        readdirSync(join(src, dir)).flatMap((name) => {
            const path = join(src, dir, name)
            if (statSync(path).isDirectory()) return Object.entries(entries(src, relative(src, path)))
            if (!/\.tsx?$/.test(name) || /\.(test|d)\.tsx?$/.test(name)) return []
            return [[relative(src, path).replace(/\.tsx?$/, ''), path]]
        }),
    )
}

/**
 * The library build of the package at `root`: every module of the folders given, under its `src`, is
 * its own file in `dist`, so an app pulls in only what it imports. Every bare import, the core package's
 * included, stays an import.
 */
export function library(root: string, folders: string[]): UserConfig {
    const src = join(root, 'src')
    return defineConfig({
        root,
        plugins: [react()],
        build: {
            outDir: 'dist',
            emptyOutDir: true,
            sourcemap: true,
            lib: {
                entry: Object.assign({}, ...folders.map((folder) => entries(src, folder))) as Record<string, string>,
                formats: ['es'],
            },
            rolldownOptions: {
                external: (id) => !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0'),
                output: { preserveModules: true, preserveModulesRoot: src, entryFileNames: '[name].js' },
            },
        },
    })
}
