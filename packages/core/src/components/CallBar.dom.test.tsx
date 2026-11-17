// @vitest-environment happy-dom
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { isApple } from '../lib/keys'
import { CallBar, type CallBarProps, type CallDeviceList } from './CallBar'
import { TooltipProvider } from './ui/tooltip'

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
    vi.restoreAllMocks()
})

/** Lets the menus' engine, loaded after the first paint, arrive. */
const settle = () => act(async () => new Promise((done) => setTimeout(done, 30)))

async function draw(element: ReactElement) {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root?.render(<TooltipProvider>{element}</TooltipProvider>))
    await settle()
}

const button = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)
const click = async (element: Element | null) => {
    expect(element).not.toBeNull()
    await act(async () => (element as HTMLElement).click())
    await settle()
}
const key = (target: Element, name: string, init: KeyboardEventInit = {}) =>
    act(() => void target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init })))

function props(): CallBarProps & { pick: ReturnType<typeof vi.fn> } {
    const pick = vi.fn()
    const lists: CallDeviceList[] = [
        {
            id: 'microphones',
            label: 'Microphone',
            devices: [
                { id: 'built-in', label: 'Built-in microphone' },
                { id: 'desk', label: 'Desk microphone' },
            ],
            selected: 'built-in',
            onSelect: pick,
        },
    ]
    return {
        pick,
        onMutedChange: vi.fn(),
        microphones: lists,
        onCameraOffChange: vi.fn(),
        onSharingChange: vi.fn(),
        onReact: vi.fn(),
        onHandRaisedChange: vi.fn(),
        more: [{ id: 'captions', label: 'Captions', checked: false, onSelect: vi.fn() }],
        onLeave: vi.fn(),
    }
}

describe('CallBar', () => {
    it('asks for the other state on a press, and draws a muted microphone and a camera off in the critical tone', async () => {
        const given = props()
        await draw(<CallBar {...given} />)
        await click(button('Mute'))
        expect(given.onMutedChange).toHaveBeenCalledWith(true)
        await click(button('Turn off camera'))
        expect(given.onCameraOffChange).toHaveBeenCalledWith(true)
        await click(button('Leave'))
        expect(given.onLeave).toHaveBeenCalled()

        await act(async () =>
            root?.render(
                <TooltipProvider>
                    <CallBar {...given} muted cameraOff />
                </TooltipProvider>,
            ),
        )
        expect(button('Unmute')?.dataset.off).toBe('true')
        expect(button('Unmute')?.className).toContain('bg-critical/15')
        expect(button('Turn on camera')?.dataset.off).toBe('true')
        expect(button('Leave')?.className).toContain('bg-critical')
    })

    it('draws sharing and a raised hand pressed, a press asking for the other', async () => {
        const given = props()
        await draw(<CallBar {...given} sharing handRaised />)
        expect(button('Share screen')?.getAttribute('aria-pressed')).toBe('true')
        expect(button('Raise hand')?.getAttribute('aria-pressed')).toBe('true')
        await click(button('Raise hand'))
        expect(given.onHandRaisedChange).toHaveBeenCalledWith(false)
        await click(button('Share screen'))
        expect(given.onSharingChange).toHaveBeenCalledWith(false)
    })

    it('offers only the controls whose handlers are given', async () => {
        await draw(<CallBar onMutedChange={() => undefined} onLeave={() => undefined} />)
        expect(button('Mute')).not.toBeNull()
        expect(button('Share screen')).toBeNull()
        expect(button('Reactions')).toBeNull()
        expect(button('More options')).toBeNull()
        expect(button('Microphone settings')).toBeNull()
    })

    it("opens a device list from the microphone's chevron, the chosen one checked, a choice going to its list", async () => {
        const given = props()
        await draw(<CallBar {...given} />)
        await click(button('Microphone settings'))
        const rows = [...document.querySelectorAll('[role=menuitemradio]')]
        expect(rows.map((row) => row.textContent)).toEqual(['Built-in microphone', 'Desk microphone'])
        expect(rows[0].getAttribute('aria-checked')).toBe('true')
        await click(rows[1])
        expect(given.pick).toHaveBeenCalledWith('desk')
    })

    it("lists the app's rows in more, a row that toggles checked", async () => {
        const given = props()
        await draw(<CallBar {...given} />)
        await click(button('More options'))
        const row = document.querySelector('[role=menuitemcheckbox]')
        expect(row?.textContent).toBe('Captions')
        await click(row)
        expect(given.more?.[0].onSelect).toHaveBeenCalled()
    })

    it('stands the reaction bar over the bar from its toggle, a reaction going to onReact', async () => {
        const given = props()
        await draw(<CallBar {...given} />)
        expect(document.querySelector('[data-slot=reaction-bar]')).toBeNull()
        await click(button('Reactions'))
        expect(document.querySelector('[data-slot=reaction-bar]')).not.toBeNull()
        await click(button('thumbs up'))
        expect(given.onReact).toHaveBeenCalledWith('\u{1F44D}', 'thumbs up')
    })

    it('moves between its buttons with the arrows, stopping at the first and the last', async () => {
        await draw(<CallBar {...props()} />)
        const controls = [...document.querySelectorAll<HTMLButtonElement>('[data-call-control]')]
        expect(controls.map((control) => control.getAttribute('aria-label'))).toEqual([
            'Mute',
            'Microphone settings',
            'Turn off camera',
            'Share screen',
            'Reactions',
            'Raise hand',
            'More options',
            'Leave',
        ])
        controls[0].focus()
        await key(controls[0], 'ArrowLeft')
        expect(document.activeElement).toBe(controls[0])
        await key(controls[0], 'ArrowRight')
        expect(document.activeElement).toBe(controls[1])
        const last = controls.at(-1) as HTMLButtonElement
        last.focus()
        await key(last, 'ArrowRight')
        expect(document.activeElement).toBe(last)
    })

    it('mutes and turns the camera off on its keys when asked to bind them', async () => {
        const given = props()
        await draw(<CallBar {...given} muted shortcuts />)
        const mod = isApple() ? { metaKey: true } : { ctrlKey: true }
        await key(document.body, 'd', mod)
        expect(given.onMutedChange).toHaveBeenCalledWith(false)
        await key(document.body, 'e', mod)
        expect(given.onCameraOffChange).toHaveBeenCalledWith(true)
        expect(button('Unmute')?.getAttribute('aria-keyshortcuts')).toBe(isApple() ? 'Meta+D' : 'Control+D')
    })

    it('binds no keys unless asked', async () => {
        const given = props()
        await draw(<CallBar {...given} />)
        await key(document.body, 'd', isApple() ? { metaKey: true } : { ctrlKey: true })
        expect(given.onMutedChange).not.toHaveBeenCalled()
    })

    it('moves sharing, the hand and the device lists into more in a narrow room', async () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300)
        const given = props()
        await draw(<CallBar {...given} />)
        expect(button('Share screen')).toBeNull()
        expect(button('Raise hand')).toBeNull()
        expect(button('Microphone settings')).toBeNull()
        await click(button('More options'))
        const rows = [...document.querySelectorAll('[role=menuitem],[role=menuitemcheckbox]')].map((row) => row.textContent)
        expect(rows).toEqual(['Microphone', 'Share screen', 'Raise hand', 'Captions'])
        await click([...document.querySelectorAll('[role=menuitemcheckbox]')][0])
        expect(given.onSharingChange).toHaveBeenCalledWith(true)
    })
})
