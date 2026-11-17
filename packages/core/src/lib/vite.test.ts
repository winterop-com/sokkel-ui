import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { importedModules, leanStylesheet } from './vite'

describe('leanStylesheet', () => {
    it("puts styles-base.css and the lists in the core's styles.css place and takes the add-ons' out", () => {
        const css = [
            "@import '@winterop-com/sokkel-ui/styles.css';",
            "@import '@winterop-com/sokkel-ui-charts/styles.css';",
            "@import '@winterop-com/sokkel-ui/themes/paper.css';",
            '',
        ].join('\n')
        expect(leanStylesheet(css, ['@winterop-com/sokkel-ui/sources/Rail.css'])).toBe(
            [
                "@import '@winterop-com/sokkel-ui/styles-base.css';",
                "@import '@winterop-com/sokkel-ui/sources/Rail.css';",
                "@import '@winterop-com/sokkel-ui/themes/paper.css';",
                '',
            ].join('\n'),
        )
    })

    it("leaves a stylesheet without the core's styles.css as it is", () => {
        expect(
            leanStylesheet("@import '@winterop-com/sokkel-ui/tokens.css';\n@import '@winterop-com/sokkel-ui-charts/styles.css';\n", []),
        ).toBe(undefined)
    })
})

describe('importedModules', () => {
    let root = ''
    const write = (path: string, text: string) => {
        mkdirSync(dirname(join(root, path)), { recursive: true })
        writeFileSync(join(root, path), text)
    }
    afterEach(() => rmSync(root, { recursive: true, force: true }))

    it('reads the app, the files its relative imports reach and the packages it imports that use the library', () => {
        root = mkdtempSync(join(tmpdir(), 'sokkel-styles-'))
        write(
            'app/src/main.tsx',
            "import '@winterop-com/sokkel-ui/styles.css'\nimport './app.css'\nimport { App } from '../../shared/app'\nimport 'kit'\nimport 'other'\n",
        )
        write(
            'shared/app.tsx',
            "import { Rail } from '@winterop-com/sokkel-ui/Rail'\nexport { Chart } from '@winterop-com/sokkel-ui-charts/Chart'\n",
        )
        write('app/node_modules/kit/package.json', JSON.stringify({ dependencies: { '@winterop-com/sokkel-ui': '1' } }))
        write('app/node_modules/kit/dist/index.js', "import { TopBar } from '@winterop-com/sokkel-ui/TopBar'\n")
        write('app/node_modules/other/package.json', JSON.stringify({ dependencies: {} }))
        write('app/node_modules/other/index.js', "import { Shell } from '@winterop-com/sokkel-ui/Shell'\n")
        // A workspace around the app, which a relative import must never be taken for.
        write('package.json', JSON.stringify({ devDependencies: { '@winterop-com/sokkel-ui': '1' } }))
        write('elsewhere/page.tsx', "import { Dock } from '@winterop-com/sokkel-ui/Dock'\n")
        write('app/dist/assets/index.js', "import { Dock } from '@winterop-com/sokkel-ui/Dock'\n")
        expect(importedModules([join(root, 'app')])).toEqual([
            '@winterop-com/sokkel-ui-charts/Chart',
            '@winterop-com/sokkel-ui/Rail',
            '@winterop-com/sokkel-ui/TopBar',
        ])
    })
})
