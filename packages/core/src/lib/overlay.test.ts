import { describe, expect, it } from 'vitest'

import { inertOutside, openOverlay, overlaysOpen, type InertNode } from './overlay'

interface Node extends InertNode {
    name: string
    children: Node[]
}

/** A page as `inertOutside` reads it: elements with their tags, attributes and children. */
function node(name: string, tagName = 'DIV', attributes: Record<string, string> = {}, children: Node[] = []): Node {
    const made: Node = { name, tagName, inert: false, getAttribute: (key) => attributes[key] ?? null, parentElement: null, children }
    for (const child of children) child.parentElement = made
    return made
}

function page() {
    const overlay = node('overlay')
    const content = node('content')
    const frame = node('frame', 'DIV', {}, [node('rail'), content, overlay])
    const toaster = node('toaster', 'SECTION', { 'aria-live': 'polite' })
    const body = node('body', 'BODY', {}, [node('root', 'DIV', {}, [frame]), node('portal'), toaster, node('script', 'SCRIPT')])
    node('html', 'HTML', {}, [node('head', 'HEAD'), body])
    return { body, overlay, content }
}

const inert = (root: Node): string[] => [...(root.inert === true ? [root.name] : []), ...root.children.flatMap(inert)]

describe('inertOutside', () => {
    it('makes every sibling of the way up to the body inert, and only those', () => {
        const { body, overlay } = page()
        const undo = inertOutside(overlay)
        expect(inert(body)).toEqual(['rail', 'content', 'portal'])
        undo()
        expect(inert(body)).toEqual([])
    })

    it('leaves alone what was inert already', () => {
        const { body, overlay, content } = page()
        content.inert = true
        inertOutside(overlay)()
        expect(inert(body)).toEqual(['content'])
    })
})

describe('openOverlay', () => {
    it('says which overlay is on top, and whether any is open', () => {
        expect(overlaysOpen()).toBe(false)
        const first = openOverlay()
        const second = openOverlay()
        expect(first.top()).toBe(false)
        expect(second.top()).toBe(true)
        second.close()
        expect(first.top()).toBe(true)
        first.close()
        expect(overlaysOpen()).toBe(false)
    })
})
