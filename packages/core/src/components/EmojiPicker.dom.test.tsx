// @vitest-environment happy-dom
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { EmojiPicker, loadEmojiData, searchEmoji } from './EmojiPicker'
import { toggleReaction, type ChatReaction } from './ReactionBar'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    await loadEmojiData()
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    host = undefined
})

async function draw(element: ReactElement) {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root?.render(element))
    // The data set is loaded; let the picker take it and draw the rest of the grid a frame later.
    await act(async () => new Promise((done) => setTimeout(done, 50)))
}

const cells = () => [...(host?.querySelectorAll<HTMLButtonElement>('[data-index]') ?? [])]
const search = () => host?.querySelector('input') as HTMLInputElement
const key = (target: Element, name: string) =>
    act(() => void target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true })))

/** Types into the search field as React hears it. */
async function type(text: string) {
    const input = search()
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
        set?.call(input, text)
        input.dispatchEvent(new Event('input', { bubbles: true }))
    })
}

describe('searchEmoji', () => {
    it('finds by name and keyword, names that start with the words first', async () => {
        const { list } = await loadEmojiData()
        const found = searchEmoji(list, 'thumbs')
        expect(found[0].name).toBe('thumbs up')
        expect(searchEmoji(list, 'party').map((item) => item.name)).toContain('party popper')
        expect(searchEmoji(list, 'nightly-export')).toEqual([])
    })
})

describe('EmojiPicker', () => {
    it('draws the recent emoji first, then every group', async () => {
        await draw(<EmojiPicker recent={['\u{1F680}', '\u{1F44D}']} onPick={() => undefined} />)
        const sections = [...(host?.querySelectorAll<HTMLElement>('[data-section]') ?? [])].map((section) => section.dataset.section)
        expect(sections).toEqual(['recent', 'smileys', 'people', 'animals', 'food', 'activities', 'travel', 'objects', 'symbols', 'flags'])
        expect(cells()[0].textContent).toBe('\u{1F680}')
        expect(cells()[1].getAttribute('aria-label')).toBe('thumbs up')
        expect(cells().length).toBeGreaterThan(1500)
    })

    it('filters by the search and says when nothing is found', async () => {
        await draw(<EmojiPicker recent={[]} onPick={() => undefined} />)
        await type('heart')
        const names = cells().map((cell) => cell.getAttribute('aria-label') ?? '')
        expect(names.length).toBeGreaterThan(10)
        expect(names[0]).toMatch(/heart/)
        expect(host?.querySelector('[data-section="results"]')).not.toBeNull()
        await type('nightly-export')
        expect(cells()).toHaveLength(0)
        expect(host?.textContent).toContain('No emoji found')
    })

    it('hands a pick to onPick and puts it first among the recent', async () => {
        const onPick = vi.fn()
        const onRecentChange = vi.fn()
        await draw(<EmojiPicker recent={['\u{1F680}', '\u{1F44D}']} onPick={onPick} onRecentChange={onRecentChange} />)
        const thumbs = cells().find((cell) => cell.textContent === '\u{1F44D}' && cell.closest('[data-section="people"]') !== null)
        act(() => thumbs?.click())
        expect(onPick).toHaveBeenCalledWith('\u{1F44D}', 'thumbs up')
        expect(onRecentChange).toHaveBeenCalledWith(['\u{1F44D}', '\u{1F680}'])
    })

    it('picks the first found with Enter in the search', async () => {
        const onPick = vi.fn()
        await draw(<EmojiPicker recent={[]} onPick={onPick} />)
        await type('thumbs')
        await key(search(), 'Enter')
        expect(onPick).toHaveBeenCalledWith('\u{1F44D}', 'thumbs up')
    })

    it('keeps the recent emoji per person when the app does not hold them', async () => {
        await draw(<EmojiPicker storeKey="emoji-test" onPick={() => undefined} />)
        expect(host?.querySelector('[data-section="recent"]')).toBeNull()
        act(() => cells()[0].click())
        expect(host?.querySelector('[data-section="recent"]')).not.toBeNull()
        expect(JSON.parse(localStorage.getItem('emoji-test.recent') ?? '[]')).toEqual(['\u{1F600}'])
        localStorage.clear()
    })

    it('moves through the grid by the arrow keys, one tab stop at a time', async () => {
        await draw(<EmojiPicker recent={[]} onPick={() => undefined} />)
        expect(cells().filter((cell) => cell.tabIndex === 0)).toHaveLength(1)
        await key(search(), 'ArrowDown')
        expect(document.activeElement).toBe(cells()[0])
        await key(cells()[0], 'ArrowRight')
        expect(document.activeElement).toBe(cells()[1])
        await key(cells()[1], 'ArrowDown')
        expect(document.activeElement).toBe(cells()[9])
        await key(cells()[9], 'ArrowLeft')
        expect(document.activeElement).toBe(cells()[8])
        expect(cells()[8].tabIndex).toBe(0)
        await key(cells()[8], 'End')
        expect(document.activeElement).toBe(cells().at(-1))
        await key(cells().at(-1) as Element, 'Home')
        await key(cells()[0], 'ArrowUp')
        expect(document.activeElement).toBe(search())
    })

    it('calls onClose on Escape once the search is empty', async () => {
        const onClose = vi.fn()
        await draw(<EmojiPicker recent={[]} onPick={() => undefined} onClose={onClose} />)
        await type('cat')
        await key(search(), 'Escape')
        expect(onClose).not.toHaveBeenCalled()
        expect(search().value).toBe('')
        await key(search(), 'Escape')
        expect(onClose).toHaveBeenCalledTimes(1)
    })
})

describe('toggleReaction', () => {
    const START: ChatReaction[] = [
        { id: 'a', icon: '\u{1F44D}', label: 'thumbs up', count: 2, mine: true },
        { id: 'b', icon: '\u{1F389}', label: 'party popper', count: 1 },
    ]

    it('takes back yours, adds to another, and adds a new one at the end', () => {
        expect(toggleReaction(START, '\u{1F44D}')[0]).toMatchObject({ count: 1, mine: false })
        expect(toggleReaction(START, 'b')[1]).toMatchObject({ count: 2, mine: true })
        expect(toggleReaction(START, '\u{1F680}', 'rocket')[2]).toEqual({
            id: '\u{1F680}',
            icon: '\u{1F680}',
            label: 'rocket',
            count: 1,
            mine: true,
        })
    })

    it('drops a reaction no one gives any more', () => {
        const one: ChatReaction[] = [{ id: 'c', icon: '\u{1F680}', label: 'rocket', count: 1, mine: true }]
        expect(toggleReaction(one, 'c')).toEqual([])
    })
})
