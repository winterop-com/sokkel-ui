// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { registerPlugins, type PluginLanguage } from '../lib/plugins'
import { CodeEditor } from './CodeEditor'

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
    host = undefined
    registerPlugins([{ name: 'tide', languages: [] }])
})

describe('CodeEditor with a plugin language', () => {
    it('uses a plugin language named like a built-in one in its place', () => {
        const token = vi.fn((stream: { skipToEnd: () => void }) => {
            stream.skipToEnd()
            return 'keyword'
        })
        registerPlugins([
            {
                name: 'tide',
                languages: [{ name: 'json', language: { name: 'tide-json', token } as unknown as PluginLanguage['language'] }],
            },
        ])
        host = document.createElement('div')
        document.body.append(host)
        const made = createRoot(host)
        root = made
        act(() => made.render(<CodeEditor value={'{"job": "nightly-export"}'} language="json" label="Run" />))
        expect(token).toHaveBeenCalled()
    })
})
