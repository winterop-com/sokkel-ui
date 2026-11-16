import { createElement, type ReactNode } from 'react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { Chart } from './Chart'
import { ChartFrame, type ChartState } from './ChartFrame'

vi.mock('./EChart', () => ({ EChart: () => null }))
vi.mock('./use-builder', () => ({ useBuilder: () => undefined }))

/** Just enough of a document for react-dom to mount elements and text into, with no layout and no events. */
class FakeNode {
    nodeType: number
    nodeName: string
    tagName: string
    namespaceURI = 'http://www.w3.org/1999/xhtml'
    ownerDocument: FakeDocument | null = null
    parentNode: FakeNode | null = null
    childNodes: FakeNode[] = []
    style: Record<string, string> = {}
    attributes = new Map<string, string>()
    nodeValue: string | null = null

    constructor(nodeType: number, name: string) {
        this.nodeType = nodeType
        this.nodeName = name.toUpperCase()
        this.tagName = this.nodeName
    }
    get firstChild(): FakeNode | null {
        return this.childNodes[0] ?? null
    }
    get lastChild(): FakeNode | null {
        return this.childNodes.at(-1) ?? null
    }
    get nextSibling(): FakeNode | null {
        const siblings = this.parentNode?.childNodes ?? []
        return siblings[siblings.indexOf(this) + 1] ?? null
    }
    get textContent(): string {
        return this.nodeValue ?? this.childNodes.map((child) => child.textContent).join('')
    }
    set textContent(text: string) {
        this.childNodes = []
        if (text !== '') this.appendChild(this.ownerDocument!.createTextNode(text))
    }
    get data() {
        return this.nodeValue ?? ''
    }
    set data(text: string) {
        this.nodeValue = text
    }
    appendChild(child: FakeNode) {
        child.parentNode?.removeChild(child)
        child.parentNode = this
        this.childNodes.push(child)
        return child
    }
    insertBefore(child: FakeNode, before: FakeNode | null) {
        if (before === null) return this.appendChild(child)
        child.parentNode?.removeChild(child)
        child.parentNode = this
        this.childNodes.splice(this.childNodes.indexOf(before), 0, child)
        return child
    }
    removeChild(child: FakeNode) {
        this.childNodes.splice(this.childNodes.indexOf(child), 1)
        child.parentNode = null
        return child
    }
    setAttribute(name: string, value: string) {
        this.attributes.set(name, String(value))
    }
    getAttribute(name: string) {
        return this.attributes.get(name) ?? null
    }
    hasAttribute(name: string) {
        return this.attributes.has(name)
    }
    removeAttribute(name: string) {
        this.attributes.delete(name)
    }
    addEventListener() {}
    removeEventListener() {}
}

class FakeDocument extends FakeNode {
    documentElement: FakeNode
    body: FakeNode
    constructor() {
        super(9, '#document')
        this.ownerDocument = null
        this.documentElement = this.createElement('html')
        this.body = this.createElement('body')
        this.appendChild(this.documentElement)
        this.documentElement.appendChild(this.body)
    }
    createElement(name: string) {
        const node = new FakeNode(1, name)
        node.ownerDocument = this
        return node
    }
    createElementNS(namespace: string, name: string) {
        const node = this.createElement(name)
        node.namespaceURI = namespace
        return node
    }
    createTextNode(text: string) {
        const node = new FakeNode(3, '#text')
        node.ownerDocument = this
        node.nodeValue = text
        return node
    }
}

const ROWS = [
    { day: 'mon', runs: 4 },
    { day: 'tue', runs: 7 },
]

/** Mounts a frame whose render function draws `chart`, waits, and says how often the render function ran and what the frame wrote. */
async function drawsOf(chart: (state: ChartState) => ReactNode): Promise<{ draws: number; text: string }> {
    const document = globalThis.document as unknown as FakeDocument
    const { createRoot } = await import('react-dom/client')
    const host = document.createElement('div')
    document.body.appendChild(host)
    let draws = 0
    const root = createRoot(host as unknown as HTMLElement)
    root.render(
        createElement(ChartFrame, {
            title: 'Runs',
            exportable: false,
            expandable: false,
            children: (state: ChartState) => {
                draws += 1
                return chart(state)
            },
        }),
    )
    await new Promise((resolve) => setTimeout(resolve, 100))
    const text = host.textContent
    root.unmount()
    await new Promise((resolve) => setTimeout(resolve, 10))
    return { draws, text }
}

describe('ChartFrame', () => {
    beforeAll(() => {
        vi.stubGlobal('document', new FakeDocument())
        vi.stubGlobal('window', globalThis)
        vi.stubGlobal('HTMLIFrameElement', class {})
    })

    afterAll(() => {
        vi.unstubAllGlobals()
    })

    const INLINE: Record<string, (state: ChartState) => ReactNode> = {
        'a stable spec': (state) => <Chart kind="bar" label="Runs" rows={ROWS} x="day" y="runs" {...state} />,
        'inline steps': (state) => (
            <Chart kind="line" label="Runs" rows={ROWS} x="day" y="runs" steps={[{ value: 5, color: 'critical' }]} {...state} />
        ),
        'an inline formatCategory': (state) => (
            <Chart kind="bar" label="Runs" rows={ROWS} x="day" y="runs" formatCategory={(day) => day} {...state} />
        ),
        'inline rows': (state) => <Chart kind="bar" label="Runs" rows={ROWS.filter(() => true)} x="day" y="runs" {...state} />,
    }

    for (const [name, chart] of Object.entries(INLINE)) {
        it(`draws a chart with ${name} a bounded number of times and offers its rows`, async () => {
            const { draws, text } = await drawsOf(chart)
            expect(draws).toBeLessThanOrEqual(2)
            expect(text).toContain('Data')
        })
    }
})
