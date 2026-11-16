// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { JsonSchema } from './read'
import { loadSchemaChecks, SchemaForm, useSchemaForm, type SchemaFormState } from './SchemaForm'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const schema: JsonSchema = {
    type: 'object',
    properties: { limits: { type: 'object', title: 'Limits', additionalProperties: { type: 'number' } } },
}

let root: Root | undefined
let host: HTMLElement | undefined
let state: SchemaFormState | undefined

function Limits() {
    const form = useSchemaForm(schema, { initial: { limits: { api: 1, worker: 2 } } })
    state = form
    return <SchemaForm form={form} marks={false} />
}

beforeAll(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    await loadSchemaChecks()
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    host = undefined
    state = undefined
})

function mount() {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    act(() => made.render(<Limits />))
    return host
}

/** Types into an input the way a person does, through the setter React listens behind. */
function type(input: HTMLInputElement, text: string) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set
    act(() => {
        setter?.call(input, text)
        input.dispatchEvent(new Event('input', { bubbles: true }))
    })
}

/** The value inputs of the map's rows; the key inputs are the monospaced ones. */
const valueInputs = (at: HTMLElement) => [...at.querySelectorAll<HTMLInputElement>('input:not(.font-mono)')]

describe('an unreadable number in a map row', () => {
    it('blocks the submit while its row is there', () => {
        const at = mount()
        expect(state?.blocking).toBe(false)
        type(valueInputs(at)[0], 'abc')
        expect(state?.blocking).toBe(true)
    })

    it('no longer blocks the submit once its row is removed', () => {
        const at = mount()
        type(valueInputs(at)[0], 'abc')
        expect(state?.blocking).toBe(true)
        const remove = at.querySelector<HTMLButtonElement>('button[aria-label*="api"]')
        expect(remove).not.toBeNull()
        act(() => remove?.click())
        expect(state?.value).toEqual({ limits: { worker: 2 } })
        expect(state?.blocking).toBe(false)
        let ok = false
        act(() => {
            ok = state?.submit() ?? false
        })
        expect(ok).toBe(true)
    })

    it('no longer blocks the submit at its old key once the row is re-keyed', () => {
        const at = mount()
        type(valueInputs(at)[0], 'abc')
        expect(state?.blocking).toBe(true)
        const key = at.querySelector<HTMLInputElement>('input.font-mono')
        expect(key?.value).toBe('api')
        if (key !== null) type(key, 'web')
        type(valueInputs(at)[0], '3')
        expect(state?.value).toEqual({ limits: { web: 3, worker: 2 } })
        expect(state?.blocking).toBe(false)
    })
})
