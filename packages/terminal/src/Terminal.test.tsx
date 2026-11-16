import { act, StrictMode, useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { createRoot } from 'react-dom/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { Terminal, type TerminalEntry } from './Terminal'
import type { TerminalHandle } from './TerminalView'

interface Engine {
    written: string[]
    disposed: boolean
}

const engines = vi.hoisted(() => [] as Engine[])

// Stands in for TerminalView with the same lifecycle: the engine is made in a mount effect and
// disposed in its cleanup, and a write while there is none waits for the next one.
vi.mock('./TerminalView', () => ({
    TerminalView: ({ ref }: { ref?: Ref<TerminalHandle> }) => {
        const engine = useRef<Engine | null>(null)
        const pending = useRef<string[]>([])
        useImperativeHandle(
            ref,
            () => ({
                write: (data) => {
                    const text = typeof data === 'string' ? data : new TextDecoder().decode(data)
                    if (engine.current === null) pending.current.push(text)
                    else engine.current.written.push(text)
                },
                reset: () => {
                    pending.current = []
                    if (engine.current !== null) engine.current.written = []
                },
                clear: () => undefined,
                focus: () => undefined,
                text: () => engine.current?.written.join('') ?? '',
                size: () => ({ cols: 80, rows: 24 }),
            }),
            [],
        )
        useEffect(() => {
            const made: Engine = { written: [...pending.current], disposed: false }
            pending.current = []
            engines.push(made)
            engine.current = made
            return () => {
                made.disposed = true
                engine.current = null
            }
        }, [])
        return null
    },
}))

/** A stand-in for a DOM element, enough for React to render a tree that draws nothing into it. */
function container(): Element {
    const doc = {
        nodeType: 9,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        activeElement: null,
        body: null,
        documentElement: { contains: () => false },
        defaultView: { HTMLIFrameElement: class {}, getSelection: () => null },
    }
    return {
        nodeType: 1,
        tagName: 'DIV',
        namespaceURI: 'http://www.w3.org/1999/xhtml',
        ownerDocument: doc,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        textContent: '',
        firstChild: null,
        lastChild: null,
        childNodes: [],
    } as unknown as Element
}

const live = () => engines.filter((engine) => !engine.disposed)

describe('Terminal', () => {
    const flag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean; window?: unknown }
    beforeAll(() => {
        flag.IS_REACT_ACT_ENVIRONMENT = true
        flag.window ??= globalThis
    })
    afterAll(() => {
        delete flag.IS_REACT_ACT_ENVIRONMENT
    })
    beforeEach(() => {
        engines.length = 0
    })

    it('writes the whole session again to an engine made anew, then only what was added', async () => {
        const first: TerminalEntry[] = [{ id: '1', command: 'jobs run nightly-export', output: 'fetch ok\n' }]
        const root = createRoot(container())
        await act(async () => {
            root.render(
                <StrictMode>
                    <Terminal entries={first} />
                </StrictMode>,
            )
        })
        expect(engines.length).toBe(2)
        expect(live().length).toBe(1)
        const engine = live()[0]
        expect(engine.written.join('')).toContain('jobs run nightly-export')
        expect(engine.written.join('')).toContain('fetch ok')

        const grown: TerminalEntry[] = [{ id: '1', command: 'jobs run nightly-export', output: 'fetch ok\ntransform ok\n' }]
        await act(async () => {
            root.render(
                <StrictMode>
                    <Terminal entries={grown} />
                </StrictMode>,
            )
        })
        const text = engine.written.join('')
        expect(text.split('jobs run nightly-export').length).toBe(2)
        expect(text).toContain('transform ok')
        await act(async () => root.unmount())
    })
})
