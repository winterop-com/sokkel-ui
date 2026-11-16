// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { IssueEntry } from './IssueMark'
import { IssueMarks } from './IssueMarks'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let root: Root | undefined
let host: HTMLElement | undefined
let made = 0
const Real = globalThis.ResizeObserver

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    globalThis.ResizeObserver = Real
})

const entries = (text: string): IssueEntry[] => [
    { label: 'Code', issue: { tone: 'critical', text }, onGo: () => undefined, target: 'code' },
]

describe('IssueMarks', () => {
    it('measures again only when the issues change, not for each list made anew with the same ones', () => {
        made = 0
        globalThis.ResizeObserver = class extends Real {
            constructor(callback: ResizeObserverCallback) {
                super(callback)
                made += 1
            }
        }
        host = document.createElement('div')
        document.body.append(host)
        const at = createRoot(host)
        root = at
        act(() => at.render(<IssueMarks list={entries('Required')} />))
        expect(made).toBe(1)
        for (let round = 0; round < 3; round += 1) act(() => at.render(<IssueMarks list={entries('Required')} />))
        expect(made).toBe(1)
        act(() => at.render(<IssueMarks list={entries('Too long')} />))
        expect(made).toBe(2)
    })
})
