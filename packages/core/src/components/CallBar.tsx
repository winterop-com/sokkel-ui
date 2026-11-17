import { ChevronUp, Ellipsis, Hand, Mic, MicOff, PhoneOff, ScreenShare, SmilePlus, Video, VideoOff } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react'

import { useShortcuts, type KeyBinding } from '../hooks/use-shortcuts'
import { cn } from '../lib/cn'
import { isApple, keyLabels, type KeyChord } from '../lib/keys'
import { ReactionBar, type QuickReaction, type ReactionBarWords, type ReactionPickerOptions } from './ReactionBar'
import { Button } from './ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Kbd } from './ui/kbd'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

/** One input or output a call can use: a microphone, a camera, a speaker. */
export interface CallDevice {
    id: string
    label: string
}

/** A list of devices of one kind under its heading, the chosen one checked: the microphones, or the speakers. */
export interface CallDeviceList {
    id: string
    /** The list's heading in the menu, such as Microphone or Speaker. */
    label: string
    devices: readonly CallDevice[]
    /** The id of the device in use. */
    selected?: string
    onSelect: (id: string) => void
}

/** A row the app adds to the bar's more menu: captions, a layout, settings. */
export interface CallBarItem {
    id: string
    label: string
    icon?: ReactNode
    onSelect: () => void
    /** On or off, for a row that toggles, drawn with a check. */
    checked?: boolean
    disabled?: boolean
}

/** The bar's menus and its reactions, one open at a time. */
export type CallBarMenu = 'microphone' | 'camera' | 'reactions' | 'more'

/** The keys that turn the microphone and the camera on and off; `false` leaves one unbound. */
export interface CallBarShortcuts {
    microphone?: KeyChord | false
    camera?: KeyChord | false
}

/** ⌘D (Ctrl D) for the microphone and ⌘E (Ctrl E) for the camera. */
export const CALL_BAR_SHORTCUTS: Required<CallBarShortcuts> = {
    microphone: { key: 'd', mod: true },
    camera: { key: 'e', mod: true },
}

/** The words a call bar says. */
export interface CallBarWords {
    /** The bar's name. */
    label: string
    mute: string
    unmute: string
    /** The name of the microphone's chevron, which opens its devices. */
    microphoneDevices: string
    cameraOff: string
    cameraOn: string
    /** The name of the camera's chevron, which opens its devices. */
    cameraDevices: string
    /** The microphone's and the camera's rows in the more menu, which open their devices, in a narrow room. */
    microphone: string
    camera: string
    share: string
    reactions: string
    raiseHand: string
    more: string
    leave: string
    /** The shortcuts dialog's heading for the bar's keys. */
    shortcutGroup: string
    /** The shortcuts dialog's rows for the bar's keys. */
    shortcutMicrophone: string
    shortcutCamera: string
    /** The reaction bar's words. */
    reactionBar: Partial<ReactionBarWords>
}

export const CALL_BAR_WORDS: CallBarWords = {
    label: 'Call controls',
    mute: 'Mute',
    unmute: 'Unmute',
    microphoneDevices: 'Microphone settings',
    cameraOff: 'Turn off camera',
    cameraOn: 'Turn on camera',
    cameraDevices: 'Camera settings',
    microphone: 'Microphone',
    camera: 'Camera',
    share: 'Share screen',
    reactions: 'Reactions',
    raiseHand: 'Raise hand',
    more: 'More options',
    leave: 'Leave',
    shortcutGroup: 'Call',
    shortcutMicrophone: 'Mute or unmute',
    shortcutCamera: 'Turn the camera on or off',
    reactionBar: {},
}

export interface CallBarProps {
    /** Whether the microphone is muted, drawn in the critical tone. */
    muted?: boolean
    /** Offers the microphone button, called with the state a press asks for. */
    onMutedChange?: (muted: boolean) => void
    /** The microphone's devices (microphones, speakers), offered from the chevron beside it. */
    microphones?: readonly CallDeviceList[]
    /** Whether the camera is off, drawn in the critical tone. */
    cameraOff?: boolean
    /** Offers the camera button, called with the state a press asks for. */
    onCameraOffChange?: (off: boolean) => void
    /** The camera's devices, offered from the chevron beside it. */
    cameras?: readonly CallDeviceList[]
    /** Whether the screen is being shared, drawn pressed. */
    sharing?: boolean
    /** Offers the share button. */
    onSharingChange?: (sharing: boolean) => void
    /** Offers the reactions toggle, which stands the reaction bar over the bar; called with the emoji given and its name. */
    onReact?: (emoji: string, name: string) => void
    /** The quick reactions, `QUICK_REACTIONS` by default. */
    reactions?: readonly (string | QuickReaction)[]
    /** The reaction bar's full list's options: recent emoji, skin tone. */
    reactionPicker?: ReactionPickerOptions
    /** Whether a hand is raised, drawn pressed. */
    handRaised?: boolean
    /** Offers the raise-hand button. */
    onHandRaisedChange?: (raised: boolean) => void
    /** The app's rows in the more menu: captions, a layout, settings. */
    more?: readonly CallBarItem[]
    /** Offers the leave button. */
    onLeave?: () => void
    /** Which menu is open, when the app holds it. */
    openMenu?: CallBarMenu | null
    defaultOpenMenu?: CallBarMenu | null
    onOpenMenuChange?: (menu: CallBarMenu | null) => void
    /** `floating` is a round bar on a popup's ground over the call's picture; `docked` a strip across its foot. */
    placement?: 'floating' | 'docked'
    /** Binds the microphone's and the camera's keys while the bar is mounted: `true` for `CALL_BAR_SHORTCUTS`, or the app's own. */
    shortcuts?: boolean | CallBarShortcuts
    className?: string
    words?: Partial<CallBarWords>
}

/** How much the room holds: everything; the share and hand buttons moved into more; the device menus moved there too. */
type Room = 'wide' | 'mid' | 'narrow'

/** The room's widths, in rem, below which the bar moves controls into more. */
const MID = 36
const NARROW = 26

/** A round control on the bar, finger-sized below `md`. */
const ROUND = 'size-(--density-control-lg) rounded-full max-md:min-h-finger max-md:min-w-finger'

/** A control at rest, pressed, and off; off is the critical tone, as a chip in it is. */
const REST = 'bg-muted text-foreground not-aria-disabled:hover:bg-hover'
const PRESSED = 'aria-pressed:bg-primary/12 aria-pressed:text-primary-ink aria-pressed:ring-1 aria-pressed:ring-primary/60'
const OFF = 'bg-critical/15 text-critical-ink not-aria-disabled:hover:bg-critical/25'

/** A shortcut's keys as this device writes them. */
function written(chord: KeyChord): string {
    const apple = isApple()
    return keyLabels(chord, apple).join(apple ? '' : ' ')
}

/** A shortcut as `aria-keyshortcuts` names it. */
function ariaKeys(chord: KeyChord): string {
    const held = [chord.mod === true && (isApple() ? 'Meta' : 'Control'), chord.alt === true && 'Alt', chord.shift === true && 'Shift']
    const key = chord.key.length === 1 ? chord.key.toUpperCase() : chord.key
    return [...held.filter((name): name is string => typeof name === 'string'), key].join('+')
}

/** A control with its name in the library's tooltip, and the key that does the same. */
function Tip({ label, keys, children, icon }: { label: string; keys?: string; children: ReactElement; icon: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger render={children}>{icon}</TooltipTrigger>
            <TooltipContent side="top">
                {label}
                {keys !== undefined && <Kbd>{keys}</Kbd>}
            </TooltipContent>
        </Tooltip>
    )
}

/** The device lists as radio groups under their headings. */
function DeviceGroups({ lists }: { lists: readonly CallDeviceList[] }) {
    return lists.map((list, index) => (
        <DropdownMenuGroup key={list.id}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{list.label}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={list.selected ?? ''} onValueChange={(value: string) => list.onSelect(value)}>
                {list.devices.map((device) => (
                    <DropdownMenuRadioItem key={device.id} value={device.id}>
                        {device.label}
                    </DropdownMenuRadioItem>
                ))}
            </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
    ))
}

/**
 * The controls of a video or audio call, as a round bar floating over the call's picture or docked
 * across its foot: the microphone and the camera, each with a chevron opening the app's list of
 * devices with the chosen one checked; sharing the screen; reactions, a toggle that stands the
 * `ReactionBar` over the bar; raising a hand; more, the app's own rows; and leave. A muted
 * microphone and a camera turned off are drawn in the critical tone; sharing, a raised hand and
 * open reactions are drawn pressed. Each control is offered when its handler is given.
 *
 * Every control is round, and a finger square below `md`. The arrows move between the bar's
 * buttons, stopping at its first and last; `shortcuts` binds ⌘D and ⌘E (Ctrl elsewhere) for the
 * microphone and the camera, said in their tooltips and the shortcuts dialog. The bar measures its
 * room: under 36rem the share and hand buttons move into more, and under 26rem the device lists
 * follow as submenus there, so it never widens the page.
 */
export function CallBar({
    muted = false,
    onMutedChange,
    microphones = [],
    cameraOff = false,
    onCameraOffChange,
    cameras = [],
    sharing = false,
    onSharingChange,
    onReact,
    reactions,
    reactionPicker,
    handRaised = false,
    onHandRaisedChange,
    more = [],
    onLeave,
    openMenu,
    defaultOpenMenu = null,
    onOpenMenuChange,
    placement = 'floating',
    shortcuts = false,
    className,
    words: given,
}: CallBarProps) {
    const words = { ...CALL_BAR_WORDS, ...given }
    const root = useRef<HTMLDivElement>(null)
    const [room, setRoom] = useState<Room>('wide')
    const [ownMenu, setOwnMenu] = useState<CallBarMenu | null>(defaultOpenMenu)
    const menu = openMenu === undefined ? ownMenu : openMenu
    const setMenu = (next: CallBarMenu | null) => {
        if (openMenu === undefined) setOwnMenu(next)
        onOpenMenuChange?.(next)
    }
    const opener = (name: CallBarMenu) => (open: boolean) => {
        if (open) setMenu(name)
        else if (menu === name) setMenu(null)
    }

    useLayoutEffect(() => {
        const element = root.current
        if (element === null) return
        const measure = () => {
            const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
            const width = element.clientWidth / rem
            // An element not laid out yet (width 0) keeps the room it has.
            if (width === 0) return
            setRoom(width < NARROW ? 'narrow' : width < MID ? 'mid' : 'wide')
        }
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const watch = new ResizeObserver(measure)
        watch.observe(element)
        return () => watch.disconnect()
    }, [])

    const keys = shortcuts === false ? undefined : { ...CALL_BAR_SHORTCUTS, ...(shortcuts === true ? {} : shortcuts) }
    const micKey = keys?.microphone === false ? undefined : keys?.microphone
    const cameraKey = keys?.camera === false ? undefined : keys?.camera
    const bindings: KeyBinding[] = []
    if (micKey !== undefined && onMutedChange !== undefined)
        bindings.push({
            ...micKey,
            id: 'call-microphone',
            label: words.shortcutMicrophone,
            group: words.shortcutGroup,
            inFields: 'inputs',
            run: () => onMutedChange(!muted),
        })
    if (cameraKey !== undefined && onCameraOffChange !== undefined)
        bindings.push({
            ...cameraKey,
            id: 'call-camera',
            label: words.shortcutCamera,
            group: words.shortcutGroup,
            inFields: 'inputs',
            run: () => onCameraOffChange(!cameraOff),
        })
    useShortcuts(bindings, [
        muted,
        cameraOff,
        onMutedChange,
        onCameraOffChange,
        micKey,
        cameraKey,
        words.shortcutMicrophone,
        words.shortcutCamera,
        words.shortcutGroup,
    ])

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
        if (step === 0) return
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-call-control]')]
        const at = buttons.indexOf(event.target as HTMLButtonElement)
        // A key from the reaction bar or a menu standing over the bar is theirs.
        if (at < 0) return
        event.preventDefault()
        // Like every list of choices, the bar stops at its first and last button.
        buttons[Math.min(Math.max(at + step, 0), buttons.length - 1)]?.focus()
    }

    const inline = room === 'wide'
    const devicesInline = room !== 'narrow'
    const moved = {
        share: !inline && onSharingChange !== undefined,
        hand: !inline && onHandRaisedChange !== undefined,
        microphones: !devicesInline && microphones.length > 0,
        cameras: !devicesInline && cameras.length > 0,
    }
    const movedAny = moved.share || moved.hand || moved.microphones || moved.cameras
    const control = (extra?: string) => cn(ROUND, REST, PRESSED, extra)

    /** A toggle with a chevron beside it opening its devices, joined as one round control. */
    const split = (
        name: 'microphone' | 'camera',
        off: boolean,
        onChange: ((off: boolean) => void) | undefined,
        lists: readonly CallDeviceList[],
        on: ReactNode,
        offIcon: ReactNode,
        label: string,
        devicesLabel: string,
        chord: KeyChord | undefined,
    ) => {
        if (onChange === undefined) return null
        const withDevices = devicesInline && lists.length > 0
        const toggle = (
            <Tip label={label} keys={chord === undefined ? undefined : written(chord)} icon={off ? offIcon : on}>
                <Button
                    data-call-control
                    data-off={off || undefined}
                    variant="ghost"
                    aria-label={label}
                    aria-keyshortcuts={chord === undefined ? undefined : ariaKeys(chord)}
                    onClick={() => onChange(!off)}
                    className={cn(control(), off && OFF, withDevices && 'rounded-r-none pr-0.5 pl-1')}
                />
            </Tip>
        )
        if (!withDevices) return toggle
        return (
            <div role="group" aria-label={label} className="flex shrink-0">
                {toggle}
                <DropdownMenu open={menu === name} onOpenChange={opener(name)}>
                    <Tip label={devicesLabel} icon={<ChevronUp aria-hidden />}>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    data-call-control
                                    variant="ghost"
                                    aria-label={devicesLabel}
                                    className={cn(ROUND, REST, 'w-6 rounded-l-none max-md:min-w-8 [&_svg]:size-3.5', off && OFF)}
                                />
                            }
                        />
                    </Tip>
                    <DropdownMenuContent side="top" align="start">
                        <DeviceGroups lists={lists} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        )
    }

    const press = (pressed: boolean, label: string, icon: ReactNode, onChange: (next: boolean) => void) => (
        <Tip label={label} icon={icon}>
            <Button
                data-call-control
                variant="ghost"
                aria-label={label}
                aria-pressed={pressed}
                onClick={() => onChange(!pressed)}
                className={control()}
            />
        </Tip>
    )

    const hasMore = more.length > 0 || movedAny
    return (
        <div
            ref={root}
            data-slot="call-bar"
            data-placement={placement}
            className={cn(
                'flex w-full min-w-0 justify-center',
                placement === 'docked' && 'border-t border-border bg-background px-3 py-2',
                className,
            )}
        >
            <div
                role="toolbar"
                aria-label={words.label}
                onKeyDown={onKeyDown}
                className={cn(
                    'flex max-w-full min-w-0 flex-wrap items-center justify-center gap-2',
                    placement === 'floating' &&
                        'rounded-full border border-border-strong bg-popover p-1.5 text-popover-foreground shadow-pop',
                )}
            >
                {split(
                    'microphone',
                    muted,
                    onMutedChange,
                    microphones,
                    <Mic aria-hidden />,
                    <MicOff aria-hidden />,
                    muted ? words.unmute : words.mute,
                    words.microphoneDevices,
                    micKey,
                )}
                {split(
                    'camera',
                    cameraOff,
                    onCameraOffChange,
                    cameras,
                    <Video aria-hidden />,
                    <VideoOff aria-hidden />,
                    cameraOff ? words.cameraOn : words.cameraOff,
                    words.cameraDevices,
                    cameraKey,
                )}
                {inline && onSharingChange !== undefined && press(sharing, words.share, <ScreenShare aria-hidden />, onSharingChange)}
                {onReact !== undefined && (
                    <Popover open={menu === 'reactions'} onOpenChange={opener('reactions')}>
                        <Tip label={words.reactions} icon={<SmilePlus aria-hidden />}>
                            <PopoverTrigger
                                render={
                                    <Button
                                        data-call-control
                                        variant="ghost"
                                        aria-label={words.reactions}
                                        aria-pressed={menu === 'reactions'}
                                        className={control()}
                                    />
                                }
                            />
                        </Tip>
                        <PopoverContent
                            side="top"
                            collisionPadding={8}
                            aria-label={words.reactionBar.label ?? words.reactions}
                            className="w-auto max-w-[calc(100vw-1rem)] gap-0 p-1"
                        >
                            <ReactionBar
                                onReact={onReact}
                                reactions={reactions}
                                picker={reactionPicker}
                                framed={false}
                                words={{ label: words.reactions, ...words.reactionBar }}
                            />
                        </PopoverContent>
                    </Popover>
                )}
                {inline && onHandRaisedChange !== undefined && press(handRaised, words.raiseHand, <Hand aria-hidden />, onHandRaisedChange)}
                {hasMore && (
                    <DropdownMenu open={menu === 'more'} onOpenChange={opener('more')}>
                        <Tip label={words.more} icon={<Ellipsis aria-hidden />}>
                            <DropdownMenuTrigger
                                render={<Button data-call-control variant="ghost" aria-label={words.more} className={control()} />}
                            />
                        </Tip>
                        <DropdownMenuContent side="top" align="center">
                            {moved.microphones && (
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <Mic aria-hidden />
                                        {words.microphone}
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        <DeviceGroups lists={microphones} />
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            )}
                            {moved.cameras && (
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <Video aria-hidden />
                                        {words.camera}
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        <DeviceGroups lists={cameras} />
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            )}
                            {moved.share && (
                                <DropdownMenuCheckboxItem checked={sharing} onClick={() => onSharingChange?.(!sharing)}>
                                    <ScreenShare aria-hidden />
                                    {words.share}
                                </DropdownMenuCheckboxItem>
                            )}
                            {moved.hand && (
                                <DropdownMenuCheckboxItem checked={handRaised} onClick={() => onHandRaisedChange?.(!handRaised)}>
                                    <Hand aria-hidden />
                                    {words.raiseHand}
                                </DropdownMenuCheckboxItem>
                            )}
                            {movedAny && more.length > 0 && <DropdownMenuSeparator />}
                            {more.map((item) =>
                                item.checked === undefined ? (
                                    <DropdownMenuItem key={item.id} disabled={item.disabled} onClick={item.onSelect}>
                                        {item.icon}
                                        {item.label}
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuCheckboxItem
                                        key={item.id}
                                        checked={item.checked}
                                        disabled={item.disabled}
                                        onClick={item.onSelect}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </DropdownMenuCheckboxItem>
                                ),
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                {onLeave !== undefined && (
                    <Tip
                        label={words.leave}
                        icon={
                            <>
                                <PhoneOff aria-hidden />
                                {inline && <span>{words.leave}</span>}
                            </>
                        }
                    >
                        <Button
                            data-call-control
                            aria-label={words.leave}
                            onClick={onLeave}
                            className={cn(
                                ROUND,
                                'bg-critical text-critical-foreground not-aria-disabled:hover:bg-critical/85',
                                inline && 'w-auto px-4',
                            )}
                        />
                    </Tip>
                )}
            </div>
        </div>
    )
}
