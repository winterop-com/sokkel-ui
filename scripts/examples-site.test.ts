import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { describeExample, packagesOf } from './examples-site'

const made: string[] = []

/** A folder for one example, holding the given files. */
function example(files: Record<string, string>, name = 'harbor'): string {
    const root = mkdtempSync(join(tmpdir(), 'examples-site-'))
    made.push(root)
    const folder = join(root, name)
    mkdirSync(join(folder, 'web'), { recursive: true })
    for (const [path, text] of Object.entries(files)) writeFileSync(join(folder, path), text)
    return folder
}

afterEach(() => {
    for (const root of made.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('describeExample', () => {
    it('takes the name and line from example.json', () => {
        const folder = example({
            'example.json': JSON.stringify({ name: 'Harbor', summary: 'Ships in and out.' }),
            Makefile: '# Other: not this. `make help` lists the targets.\n',
        })
        expect(describeExample(folder)).toEqual({ name: 'Harbor', summary: 'Ships in and out.' })
    })

    it("takes them from the comment heading the Makefile, over more than one line, without make's hint", () => {
        const folder = example({
            Makefile:
                '# Records: forms filled in sections, people and their events,\n# places on a map. `make help` lists the targets.\n\nPORT := 4182\n',
        })
        expect(describeExample(folder)).toEqual({
            name: 'Records',
            summary: 'Forms filled in sections, people and their events, places on a map.',
        })
    })

    it('names the example for its folder when nothing says more', () => {
        expect(describeExample(example({}, 'larkspur'))).toEqual({ name: 'Larkspur', summary: '' })
    })

    it('refuses an example.json without a name and a summary', () => {
        expect(() => describeExample(example({ 'example.json': JSON.stringify({ name: 'Harbor' }) }))).toThrow(
            'needs a "name" and a "summary"',
        )
    })
})

describe('packagesOf', () => {
    it("names the library's packages the web app installs, the core first", () => {
        const folder = example({
            'web/package.json': JSON.stringify({
                dependencies: {
                    '@winterop-com/sokkel-ui-maps': 'file:../../../packages/maps',
                    react: '^19.3.1',
                    '@winterop-com/sokkel-ui-charts': 'file:../../../packages/charts',
                    '@winterop-com/sokkel-ui': 'file:../../../packages/core',
                },
            }),
        })
        expect(packagesOf(join(folder, 'web'))).toEqual(['core', 'charts', 'maps'])
    })
})
