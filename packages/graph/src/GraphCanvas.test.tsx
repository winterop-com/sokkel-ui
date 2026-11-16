// @vitest-environment happy-dom
import type { Node } from '@xyflow/react'
import { act, useContext } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { GraphEditingContext } from './context'
import { GraphCanvas, type GraphEditing } from './GraphCanvas'

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
