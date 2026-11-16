// @vitest-environment happy-dom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { AssistantReply } from './AssistantReply'
import { ChatMessage } from './ChatMessage'
import { Composer } from './Composer'

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

/** Words that count how often a row reads them, which it does each time it draws. */
function counted<K extends string>(key: K): { words: Record<K, string>; reads: () => number } {
    let reads = 0
    const words = {} as Record<K, string>
    Object.defineProperty(words, key, {
        enumerable: true,
        get: () => {
            reads += 1
            return key
        },
    })
    return { words, reads: () => reads }
}

const message = counted('more')
const reply = counted('copy')
const text = <>Did nightly-export finish?</>

/** A conversation whose composer holds its text in the same state as the rows above it. */
function Conversation() {
    const [draft, setDraft] = useState('')
    return (
        <>
            <ChatMessage author="ada" time="09:12" words={message.words}>
                {text}
            </ChatMessage>
            <AssistantReply content="It did, at 02:10." words={reply.words} />
            <Composer value={draft} onChange={setDraft} onSend={() => undefined} />
        </>
    )
}

describe('chat rows', () => {
    it('draw again only when their own props change, not on each keystroke in the composer', () => {
        host = document.createElement('div')
        document.body.append(host)
        const made = createRoot(host)
        root = made
        act(() => made.render(<Conversation />))
        const before = [message.reads(), reply.reads()]
        const area = host.querySelector('textarea')
        if (area === null) throw new Error('no composer')
        for (const typed of ['R', 'Re', 'Rer']) {
            act(() => {
                const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
                set?.call(area, typed)
                area.dispatchEvent(new Event('input', { bubbles: true }))
            })
        }
        expect(area.value).toBe('Rer')
        expect([message.reads(), reply.reads()]).toEqual(before)
    })
})
