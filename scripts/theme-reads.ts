/**
 * The theme variables the packages' code names at run time: in a CodeMirror theme, an inline style, a
 * canvas or an engine's options. Tailwind writes a variable of an `@theme` block only where a class or
 * a stylesheet it reads names it, and the lean stylesheet reads the classes of an app's modules alone,
 * so a variable named only in code is missing there unless a static `@theme` block writes it always.
 * build-tokens.ts writes these into such a block in tokens.css.
 *
 * Every `var(--name` in a package's code counts, in a class or not, so none is missed. A name built in
 * code (`var(--kind-${kind})`) is taken as its fixed start: no theme variable may begin with it. A
 * name built whole (`var(--${name})`) is a color token on `:root`, which every page has.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const PACKAGES = join(import.meta.dirname, '..', 'packages')

function code(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) return code(path)
        return /\.tsx?$/.test(name) && !/\.(test|stories|d)\.tsx?$/.test(name) ? [path] : []
    })
}

/** Every variable the packages' code names in a `var()`, without its `--`, and every fixed start of a name built in code. */
export function codeReads(): { names: Set<string>; starts: Set<string> } {
    const names = new Set<string>()
    const starts = new Set<string>()
    for (const pkg of readdirSync(PACKAGES)) {
        const src = join(PACKAGES, pkg, 'src')
        try {
            statSync(src)
        } catch {
            continue
        }
        for (const file of code(src)) {
            for (const [, name, built] of readFileSync(file, 'utf8').matchAll(/var\(--([\w-]*)(\$\{)?/g)) {
                if (built !== undefined) {
                    if (name !== '') starts.add(name)
                } else if (name !== '') names.add(name)
            }
        }
    }
    return { names, starts }
}

/** Tailwind's own theme variables, its theme.css's `@theme` blocks but the `reference` ones, which write nothing, by name without the `--`. */
export function tailwindTheme(): Record<string, string> {
    const css = readFileSync(createRequire(import.meta.url).resolve('tailwindcss/theme.css'), 'utf8')
    const blocks = [...css.matchAll(/^@theme([^{]*)\{([^}]*)\}/gm)].filter(([, options]) => !/\breference\b/.test(options))
    return Object.fromEntries(
        blocks.flatMap(([, , body]) =>
            [...body.matchAll(/^\s*--([\w.-]+):\s*([^;]+);/gm)].map(([, name, value]) => [name, value.replace(/\s+/g, ' ').trim()]),
        ),
    )
}

/**
 * The theme variables the code reads at run time, with every theme variable their values name: those
 * of the library's own theme (`theme`, tokens.json's) and Tailwind's. Throws when a name built in code
 * starts like a theme variable, since no list can say which it will be.
 */
export function themeReads(theme: Record<string, unknown>): { own: string[]; tailwind: Record<string, string> } {
    const defaults = tailwindTheme()
    const isTheme = (name: string) => Object.hasOwn(theme, name) || Object.hasOwn(defaults, name)
    const { names, starts } = codeReads()
    const built = [...starts].filter((start) => [...Object.keys(theme), ...Object.keys(defaults)].some((name) => name.startsWith(start)))
    if (built.length > 0) {
        throw new Error(
            `var(--${built.join('${…}), var(--')}\${…}) builds a theme variable's name in code: name it whole, or a :root token`,
        )
    }
    const found = new Set<string>()
    const add = (name: string) => {
        if (found.has(name) || !isTheme(name)) return
        found.add(name)
        const value = Object.hasOwn(theme, name) ? theme[name] : defaults[name]
        if (typeof value === 'string') for (const [, next] of value.matchAll(/var\(--([\w-]+)/g)) add(next)
    }
    for (const name of names) add(name)
    const sorted = [...found].sort()
    return {
        own: sorted.filter((name) => Object.hasOwn(theme, name)),
        tailwind: Object.fromEntries(sorted.filter((name) => !Object.hasOwn(theme, name)).map((name) => [name, defaults[name]])),
    }
}
