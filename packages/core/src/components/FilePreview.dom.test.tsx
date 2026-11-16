// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { FilePreview } from './FilePreview'

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
    vi.restoreAllMocks()
})

describe('a JSON preview', () => {
    it('reads its text once, not each time its parent draws', () => {
        const text = JSON.stringify({ job: 'nightly-export', steps: ['fetch', 'upload'] })
        const parse = vi.spyOn(JSON, 'parse')
        host = document.createElement('div')
        document.body.append(host)
        const made = createRoot(host)
        root = made
        for (let round = 0; round < 4; round += 1) act(() => made.render(<FilePreview name="export.json" kind="json" text={text} />))
        expect(parse.mock.calls.filter(([read]) => read === text)).toHaveLength(1)
        expect(host.textContent).toContain('nightly-export')
    })
})
