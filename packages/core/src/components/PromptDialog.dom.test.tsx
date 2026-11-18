// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { PROMPT_DIALOG_WORDS, PromptDialog, type PromptDialogProps } from './PromptDialog'

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
})

function show(props: Partial<PromptDialogProps> = {}) {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    const all: PromptDialogProps = {
        open: true,
        onOpenChange: vi.fn(),
        title: 'New project',
        label: 'Name',
        onSubmit: vi.fn(),
        ...props,
    }
    act(() => made.render(<PromptDialog {...all} />))
    return all
}

const input = () => document.querySelector<HTMLInputElement>('[role=dialog] input')
const submitButton = () => [...document.querySelectorAll('button')].find((button) => button.textContent === PROMPT_DIALOG_WORDS.submit)

function type(text: string) {
    const field = input()
    if (field === null) throw new Error('no input')
    act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(field, text)
        field.dispatchEvent(new Event('input', { bubbles: true }))
    })
}

function enter() {
    act(() => {
        input()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
}

const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)))

describe('PromptDialog', () => {
    it('asks with one field, and shuts Submit while it is empty', () => {
        const props = show({ description: 'Jobs live in a project.' })
        expect(document.body.textContent).toContain('New project')
        expect(document.body.textContent).toContain('Jobs live in a project.')
        expect(input()).not.toBeNull()
        expect(submitButton()).toBeDefined()
        enter()
        expect(props.onSubmit).not.toHaveBeenCalled()
    })

    it('submits the value on Enter and closes', () => {
        const props = show()
        type('reports')
        enter()
        expect(props.onSubmit).toHaveBeenCalledWith('reports')
        expect(props.onOpenChange).toHaveBeenCalledWith(false)
    })

    it('starts from defaultValue', () => {
        const props = show({ defaultValue: 'reports' })
        expect(input()?.value).toBe('reports')
        enter()
        expect(props.onSubmit).toHaveBeenCalledWith('reports')
    })

    it('shows the issue validate gives under the field, and does not submit', () => {
        const props = show({ validate: (value) => (value === 'harbor' ? 'harbor is taken.' : null) })
        type('harbor')
        expect(document.body.textContent).toContain('harbor is taken.')
        expect(input()?.getAttribute('aria-invalid')).toBe('true')
        enter()
        expect(props.onSubmit).not.toHaveBeenCalled()
        type('marina')
        expect(document.body.textContent).not.toContain('harbor is taken.')
        enter()
        expect(props.onSubmit).toHaveBeenCalledWith('marina')
    })

    it('is busy while an async onSubmit runs, and closes once it is done', async () => {
        let finish: () => void = () => undefined
        const props = show({ defaultValue: 'reports', onSubmit: () => new Promise<void>((resolve) => (finish = resolve)) })
        enter()
        expect(document.querySelector('[role=dialog]')?.getAttribute('aria-busy')).toBe('true')
        expect(document.body.textContent).toContain(PROMPT_DIALOG_WORDS.submitting)
        expect(props.onOpenChange).not.toHaveBeenCalled()
        finish()
        await settle()
        expect(props.onOpenChange).toHaveBeenCalledWith(false)
    })

    it('stays open and says why when onSubmit fails', async () => {
        const props = show({ defaultValue: 'reports', onSubmit: () => Promise.reject(new Error('The api service is not answering.')) })
        enter()
        await settle()
        expect(props.onOpenChange).not.toHaveBeenCalled()
        expect(document.querySelector('[role=alert]')?.textContent).toContain('The api service is not answering.')
        expect(document.querySelector('[role=dialog]')?.getAttribute('aria-busy')).toBeNull()
    })

    it('says words.failed for a failure with nothing to say', async () => {
        show({ defaultValue: 'reports', onSubmit: () => Promise.reject(new Error('')) })
        enter()
        await settle()
        expect(document.querySelector('[role=alert]')?.textContent).toContain(PROMPT_DIALOG_WORDS.failed)
    })

    it('asks for a secret in a masked field', () => {
        const props = show({ secret: true, label: 'API token' })
        expect(input()?.type).toBe('password')
        type('tdv_live_9f3c2a71e4')
        enter()
        expect(props.onSubmit).toHaveBeenCalledWith('tdv_live_9f3c2a71e4')
    })

    it('says an error given from outside above the verbs', () => {
        show({ error: 'The api service refused the token.' })
        expect(document.querySelector('[role=alert]')?.textContent).toContain('The api service refused the token.')
    })
})
