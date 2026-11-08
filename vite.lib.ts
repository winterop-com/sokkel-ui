import { readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin, type Rolldown, type UserConfig } from 'vite'

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

const CORE = '@winterop-com/sokkel-ui/'

/**
 * Writes `dist/sources/<name>.css` for every module: an `@source` for its own source file and for
 * every module of the package it imports, however deep, and an `@import` of the core's list for
 * every core module an add-on's module imports, so Tailwind finds the classes of that module alone.
 * `name` maps a module's path under `src` to the name an app imports it by.
 */
function sourceLists(root: string, src: string, name: (module: string) => string): Plugin {
    return {
        name: 'source-lists',
        generateBundle(_, bundle) {
            const chunks = new Map(
                Object.values(bundle)
                    .filter((out): out is Rolldown.OutputChunk => out.type === 'chunk')
                    .map((chunk) => [chunk.fileName, chunk]),
            )
            for (const chunk of chunks.values()) {
                if (!chunk.isEntry || chunk.facadeModuleId?.startsWith(src) !== true) continue
                const reached = new Set<string>()
                const core = new Set<string>()
                const visit = (file: string) => {
                    const next = chunks.get(file)
                    if (next === undefined) {
                        if (file.startsWith(CORE)) core.add(file.slice(CORE.length))
                        return
                    }
                    if (reached.has(file)) return
                    reached.add(file)
                    for (const imported of [...next.imports, ...next.dynamicImports]) visit(imported)
                }
                visit(chunk.fileName)
                const fileName = `sources/${name(chunk.fileName.replace(/\.js$/, ''))}.css`
                const from = dirname(join(root, 'dist', fileName))
                const own = [...reached]
                    .map((file) => chunks.get(file)?.facadeModuleId)
                    .filter((id): id is string => id?.startsWith(src) === true)
                    .map((id) => `@source '${relative(from, id)}';`)
                const lines = [...[...core].map((module) => `@import '${CORE}sources/${module}.css';`).sort(), ...own.sort()]
                this.emitFile({ type: 'asset', fileName, source: `${lines.join('\n')}\n` })
            }
        },
    }
}

/**
 * The library build of the package at `root`: every module of the folders given, under its `src`, is
 * its own file in `dist`, so an app pulls in only what it imports. Every bare import, the core package's
 * included, stays an import. Every module also gets its list of sources (see `sourceLists`), named
 * as `sources` maps it: by default its path under `src`, an `index` named for its folder.
 */
export function library(
    root: string,
    folders: string[],
    sources: (module: string) => string = (module) => module.replace(/\/index$/, ''),
): UserConfig {
    const src = join(root, 'src')
    return defineConfig({
        root,
        plugins: [react(), sourceLists(root, src, sources)],
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
