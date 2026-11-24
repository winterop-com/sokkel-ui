// @vitest-environment happy-dom
import type { Node } from '@xyflow/react'
import { act, useContext } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { GraphEditingContext } from './context'
import { answeredDrops, boxInView, edgeClickAlone, GraphCanvas, type GraphEditing } from './GraphCanvas'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
})

let draws = 0

function Counted() {
    useContext(GraphEditingContext)
    draws += 1
    return <div>step</div>
}

const NODE_TYPES = { counted: Counted }
const NODES: Node[] = [
    { id: 'fetch', type: 'counted', position: { x: 0, y: 0 }, data: {}, width: 80, height: 40 },
    { id: 'upload', type: 'counted', position: { x: 160, y: 0 }, data: {}, width: 80, height: 40 },
]
const EDITING: GraphEditing = { onConnect: () => undefined, onDisconnect: () => undefined, onRemove: () => undefined }

describe('GraphCanvas', () => {
    it('draws its nodes once, not again for words written inline in a parent that renders again', () => {
        const draw = () => (
            <div style={{ width: 600, height: 400 }}>
                <GraphCanvas nodes={NODES} edges={[]} nodeTypes={NODE_TYPES} editing={EDITING} words={{ empty: 'No steps' }} />
            </div>
        )
        host = document.createElement('div')
        document.body.append(host)
        root = createRoot(host)
        act(() => root?.render(draw()))
        const settled = draws
        expect(settled).toBeGreaterThan(0)
        act(() => root?.render(draw()))
        act(() => root?.render(draw()))
        expect(draws).toBe(settled)
    })
})

describe('boxInView', () => {
    const box = { x: 400, y: 300, width: 160, height: 48 }
    it('takes a box wholly on the canvas under the view as in view', () => {
        expect(boxInView(box, { x: 0, y: 0, zoom: 1 }, { width: 1024, height: 720 })).toBe(true)
    })
    it('takes a box that a narrower canvas or a re-wrap leaves below or beside the view as out of it', () => {
        expect(boxInView(box, { x: 0, y: 0, zoom: 1 }, { width: 500, height: 720 })).toBe(false)
        expect(boxInView({ ...box, y: 700 }, { x: 0, y: 0, zoom: 1 }, { width: 1024, height: 720 })).toBe(false)
        expect(boxInView(box, { x: -500, y: 0, zoom: 1 }, { width: 1024, height: 720 })).toBe(false)
    })
    it('measures under the view zoom', () => {
        expect(boxInView({ ...box, y: 700 }, { x: 0, y: 0, zoom: 0.5 }, { width: 1024, height: 720 })).toBe(true)
    })
})

describe('answeredDrops', () => {
    const before = { x: 10, y: 20 }
    it('keeps a box waiting while the app still has it where it was', () => {
        expect(answeredDrops([{ id: 'fetch', position: { x: 10, y: 20 } }], { fetch: before })).toEqual([])
    })
    it('lets a box go once the app has moved it', () => {
        expect(answeredDrops([{ id: 'fetch', position: { x: 200, y: 20 } }], { fetch: before })).toEqual(['fetch'])
    })
    it('lets a box go once the app has removed it', () => {
        expect(answeredDrops([], { fetch: before })).toEqual(['fetch'])
    })
})

describe('edgeClickAlone', () => {
    const plain = { shiftKey: false, metaKey: false, ctrlKey: false }
    it('makes a clicked edge the only choice', () => {
        expect(edgeClickAlone(plain, false)).toBe(true)
        expect(edgeClickAlone(plain, true)).toBe(true)
    })
    it('adds the edge to the choice when the adding key is held where several may be chosen', () => {
        expect(edgeClickAlone({ ...plain, shiftKey: true }, true)).toBe(false)
        expect(edgeClickAlone({ ...plain, metaKey: true }, true)).toBe(false)
        expect(edgeClickAlone({ ...plain, ctrlKey: true }, false)).toBe(true)
    })
})
