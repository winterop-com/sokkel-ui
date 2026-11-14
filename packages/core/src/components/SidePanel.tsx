import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import type { LucideIcon } from 'lucide-react'
import { useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { usePanelSize } from '../hooks/use-panel-size'
import { ResizeHandle } from './ResizeHandle'
import { ShellDesktop, ShellPanelStrip } from './shell-context'
import { GroupLabel } from './GroupLabel'

/** One tab of a side panel. */
export interface SidePanelTab {
    id: string
    label: string
    /** Drawn over the label in the shell's tab strip on a phone (`Shell`'s `panelStrip`). */
    icon?: LucideIcon
    content: ReactNode
}

/** The words a side panel says. */
export interface SidePanelWords {
    resize: string
}

const WORDS: SidePanelWords = { resize: 'Resize the side panel' }

export interface SidePanelProps {
    tabs: SidePanelTab[]
    active?: string
    onActiveChange?: (id: string) => void
    /** The tab shown at the start when `active` is not given. */
    defaultActive?: string
    /** A CSS width the panel starts at and returns to, when `defaultSize` is not given. */
    width?: string
    /** The width in pixels, held from outside with `onSizeChange`. */
    size?: number
    onSizeChange?: (size: number) => void
    /** Whether the left edge drags to resize the panel. */
    resizable?: boolean
    minSize?: number
    maxSize?: number
    /** The width in pixels the panel starts at and a double click on the edge returns to: 352 unless `width` is given. */
    defaultSize?: number
    /**
     * How a panel with one tab heads it: `title`, a heading naming the panel, or `tab`, a tablist of
     * one, for a panel whose tabs come and go, so its header does not change shape with them.
     */
    soleTab?: 'title' | 'tab'
    className?: string
    words?: Partial<SidePanelWords>
}

/**
 * The right-hand panel beside a page: a header bar the height of the shell's top bar, with the
 * panel's tabs (or its title when it has one tab), then the content scrolling under it. The shell's
 * toggle in the header's right corner shows and hides the panel; the panel has no close of its own.
 *
 * The tabs are a tablist and the content their tabpanel, labelled by the shown tab; the arrows,
 * Home and End move between the tabs and Enter or Space shows one, as `Tabs` does. One tab is a
 * heading naming the panel, or a tablist of one with `soleTab="tab"`. In a `Shell` with
 * `panelStrip`, on a phone the tabs move to the strip at the foot of the screen, the header names
 * the shown tab, and the content is the tabpanel of the strip's tab.
 *
 * The header lines up with the shell's top bar, so the panel reads as a column of the shell, not
 * as a card dropped beside the page.
 *
 * Left to itself the panel holds which tab is shown, starting at `defaultActive` or the first tab;
 * `active` with `onActiveChange` holds it from outside.
 *
 * Its left edge drags to resize it, and a double click on the edge puts it back. Left to itself it
 * holds its own width, starting at `defaultSize`, or at `width` when that is given alone; `size`
 * with `onSizeChange` holds it from outside, and `resizable={false}` keeps it fixed. In the shell's
 * sheet on a narrow window the edge is not drawn.
 */
export function SidePanel({
    tabs,
    active,
    onActiveChange,
    defaultActive,
    width,
    size,
    onSizeChange,
    resizable = true,
    minSize = 280,
    maxSize = 640,
    defaultSize,
    soleTab = 'title',
    className,
    words: given,
}: SidePanelProps) {
    const words = { ...WORDS, ...given }
    const [own, setOwn] = useState(defaultActive)
    const shown = active ?? own
    const current = tabs.find((tab) => tab.id === shown) ?? tabs[0]
    const choose = (id: string) => {
        if (active === undefined) setOwn(id)
        onActiveChange?.(id)
    }
    const strip = useContext(ShellPanelStrip)
    const sheet = strip?.shown === true
    const base = useId()
    const tabId = (id: string) => (strip !== undefined && sheet ? strip.tabId(id) : `${base}-tab-${id}`)
    const panelId = strip !== undefined && sheet ? strip.panelId : `${base}-panel`
    const titleId = `${base}-title`
    const titled = !sheet && tabs.length === 1 && soleTab === 'title'
    // The tabs handed up to the shell's strip, named by their ids and labels so a new array of the same tabs hands nothing new.
    const publish = strip?.publish
    const latest = useRef({ tabs, choose })
    useEffect(() => {
        latest.current = { tabs, choose }
    })
    const signature = tabs.map((tab) => `${tab.id}\u0000${tab.label}`).join('\u0001')
    const currentId = current?.id
    useEffect(() => {
        if (publish === undefined || currentId === undefined) return
        publish({
            tabs: latest.current.tabs.map(({ id, label, icon }) => ({ id, label, icon })),
            active: currentId,
            choose: (id) => latest.current.choose(id),
        })
    }, [publish, signature, currentId])
    useEffect(() => (publish === undefined ? undefined : () => publish(null)), [publish])
    const panel = useRef<HTMLElement>(null)
    const desktop = useContext(ShellDesktop)
    const held = usePanelSize({
        size,
        onSizeChange,
        rest: defaultSize ?? width ?? 352,
        fallback: 352,
        min: minSize,
        max: maxSize,
    })
    return (
        <>
            {resizable && held.changeable && !sheet && (
                <ResizeHandle
                    target={panel}
                    size={held.size}
                    onSize={held.set}
                    onReset={held.reset}
                    min={minSize}
                    max={maxSize}
                    grows={-1}
                    label={words.resize}
                />
            )}
            <aside
                ref={panel}
                aria-labelledby={titled ? titleId : undefined}
                className={cn(
                    'flex h-full shrink-0 flex-col border-l border-border-strong bg-sidebar',
                    sheet && 'w-full border-l-0',
                    className,
                )}
                style={sheet ? undefined : { width: held.style }}
            >
                <div
                    data-window-drag={desktop === undefined ? undefined : ''}
                    className={cn(
                        'flex h-shell-top shrink-0 items-center gap-1 border-b border-border-strong pl-2',
                        sheet ? 'pr-2' : 'pr-12',
                    )}
                >
                    {titled || sheet ? (
                        <h2 id={titleId} className="truncate px-1.5 text-sm font-medium">
                            {current?.label}
                        </h2>
                    ) : (
                        <TabsPrimitive.Root value={current?.id} onValueChange={(id) => choose(String(id))} className="flex min-w-0">
                            <TabsPrimitive.List className="flex min-w-0 items-center gap-1">
                                {tabs.map((tab) => (
                                    <TabsPrimitive.Tab
                                        key={tab.id}
                                        value={tab.id}
                                        id={tabId(tab.id)}
                                        aria-controls={panelId}
                                        className={cn(
                                            'h-7 shrink-0 rounded-md px-2.5 text-sm outline-none focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid',
                                            tab.id === current?.id
                                                ? 'bg-secondary font-medium text-foreground'
                                                : 'text-muted-foreground hover:bg-hover hover:text-foreground',
                                        )}
                                    >
                                        {tab.label}
                                    </TabsPrimitive.Tab>
                                ))}
                            </TabsPrimitive.List>
                        </TabsPrimitive.Root>
                    )}
                </div>
                {titled || current === undefined ? (
                    <div className="min-h-0 flex-1 overflow-y-auto">{current?.content}</div>
                ) : (
                    <div role="tabpanel" id={panelId} aria-labelledby={tabId(current.id)} className="min-h-0 flex-1 overflow-y-auto">
                        {current.content}
                    </div>
                )}
            </aside>
        </>
    )
}

export interface PanelSectionProps {
    title: string
    /** Small buttons at the end of the heading's line that act on the whole section, such as Clear. */
    actions?: ReactNode
    children: ReactNode
}

/** A titled block inside a side panel: a quiet uppercase heading, its own `actions` at the line's end, over its content. */
export function PanelSection({ title, actions, children }: PanelSectionProps) {
    const heading = <GroupLabel as="h3">{title}</GroupLabel>
    return (
        <section className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0">
            {actions === undefined ? (
                heading
            ) : (
                <div className="-my-1 flex min-h-7 items-center justify-between gap-2">
                    {heading}
                    <div className="flex shrink-0 items-center gap-1">{actions}</div>
                </div>
            )}
            {children}
        </section>
    )
}
