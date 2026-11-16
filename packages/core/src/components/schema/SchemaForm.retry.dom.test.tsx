// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { JsonSchema } from './read'
import { useSchemaForm, type SchemaFormState } from './SchemaForm'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

// The checker fails to load the first time it is asked for, then loads.
const loads = vi.hoisted(() => ({ count: 0 }))
vi.mock('./checker', async () => {
    const checks = await import('./checks')
    return {
        loadedValidate: () => undefined,
        loadedSay: () => undefined,
        loadValidate: () => {
            loads.count += 1
            return loads.count === 1 ? Promise.reject(new Error('The checker could not be fetched')) : Promise.resolve(checks.validate)
        },
    }
})

const schema: JsonSchema = { type: 'object', required: ['code'], properties: { code: { type: 'string' } } }

let root: Root | undefined
let host: HTMLElement | undefined
let state: SchemaFormState | undefined

function Form() {
    state = useSchemaForm(schema, { initial: {} })
    return null
}

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
})

describe('a form whose checker failed to load', () => {
    it('fails closed, and tries again once the value changes', async () => {
        host = document.createElement('div')
        document.body.append(host)
        const made = createRoot(host)
        root = made
        await act(async () => made.render(<Form />))
        expect(loads.count).toBe(1)
        expect(state?.checking).toBe(false)
        expect(state?.blocking).toBe(true)
        await act(async () => state?.set(['code'], 'nightly-export'))
        expect(loads.count).toBe(2)
        expect(state?.checking).toBe(false)
        expect(state?.blocking).toBe(false)
    })
})
