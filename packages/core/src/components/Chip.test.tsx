import { Children, createRef, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Chip } from './Chip'
import { Dot } from './Dot'
import { Surface } from './Section'
import { StatusChip } from './StatusChip'
import { StatusProvider } from './StatusProvider'

describe('Chip', () => {
    it('hands other attributes to its root, so it can be a trigger’s render target', () => {
        const html = renderToStaticMarkup(
            <Chip data-run="run-4812" aria-describedby="hint" tabIndex={0}>
                nightly
            </Chip>,
        )
        expect(html).toMatch(/^<span data-run="run-4812" aria-describedby="hint" tabindex="0" data-slot="chip"/)
    })

    it('sizes an icon to the chip unless the icon carries its own size', () => {
        const html = renderToStaticMarkup(<Chip icon={<svg className="size-4" />}>harbor</Chip>)
        expect(html).toContain('[&amp;_svg:not([class*=&#x27;size-&#x27;])]:size-3')
        expect(html).toContain('class="size-4"')
    })

    it('lets a link or a button cover the chip’s edge, as tall as the chip', () => {
        const html = renderToStaticMarkup(
            <Chip href="/projects/harbor" size="control">
                harbor
            </Chip>,
        )
        expect(html).toMatch(/data-slot="chip-link"[^>]*class="-my-px [^"]*h-\[calc\(100%\+2px\)\]/)
    })

    it('draws its tone, neutral by default, and an absent value dashed', () => {
        expect(renderToStaticMarkup(<Chip>nightly</Chip>)).toContain('bg-faint/15 text-muted-foreground')
        expect(renderToStaticMarkup(<Chip tone="good">healthy</Chip>)).toContain('bg-good/15 text-good-ink')
        expect(renderToStaticMarkup(<Chip tone="critical">over budget</Chip>)).toContain('bg-critical/15 text-critical-ink')
        expect(renderToStaticMarkup(<Chip tone="absent">no owner</Chip>)).toContain('border-dashed')
    })

    it("wears a category's hue from the chart palette in place of its tone", () => {
        const html = renderToStaticMarkup(
            <Chip tone="critical" hue={3}>
                check
            </Chip>,
        )
        expect(html).toContain('border-chart-3/30 bg-chart-3/12 text-chart-3')
        expect(html).not.toContain('critical')
    })

    it('wears a kind color by name as the kind chip look, its wash and ink edged faintly', () => {
        const html = renderToStaticMarkup(
            <Chip tone="warning" hue="violet">
                transform
            </Chip>,
        )
        expect(html).toContain('border-kind-violet/30 bg-kind-violet/12 text-kind-violet-ink')
        expect(html).not.toContain('warning')
    })

    it('is words alone without handlers, the code face with mono, and says its title on hover', () => {
        const html = renderToStaticMarkup(
            <Chip mono title="nightly-export">
                nightly-export
            </Chip>,
        )
        expect(html).not.toContain('<button')
        expect(html).toContain('font-mono')
        expect(html).toContain('title="nightly-export"')
    })

    it('is a button with onSelect and ends in a named remove button with onRemove', () => {
        const html = renderToStaticMarkup(
            <Chip onSelect={() => undefined} onRemove={() => undefined}>
                harbor
            </Chip>,
        )
        expect(html).toContain('data-slot="chip-select"')
        expect(html).toContain('aria-label="Remove"')
        expect(html.match(/<button/g)).toHaveLength(2)
    })

    it('takes its remove word from words', () => {
        const html = renderToStaticMarkup(
            <Chip onRemove={() => undefined} words={{ remove: 'Fjern' }}>
                harbor
            </Chip>,
        )
        expect(html).toContain('aria-label="Fjern"')
    })

    it('names its select button by selectLabel and its remove button by a function of its words', () => {
        const html = renderToStaticMarkup(
            <Chip
                onSelect={() => undefined}
                selectLabel="Filter by harbor"
                onRemove={() => undefined}
                words={{ remove: (text) => `Remove ${text}` }}
            >
                harbor
            </Chip>,
        )
        expect(html).toMatch(/<button[^>]*data-slot="chip-select"[^>]*aria-label="Filter by harbor"[^>]*title="Filter by harbor"/)
        expect(html).toContain('aria-label="Remove harbor"')
    })

    it('stops both presses at the chip and passes the event on', () => {
        const selected = vi.fn()
        const removed = vi.fn()
        const buttons = findButtons(
            Chip({ children: 'harbor', onSelect: selected, onRemove: removed }) as ReactElement<{ children?: ReactNode }>,
        )
        expect(buttons).toHaveLength(2)
        for (const button of buttons) {
            const event = { stopPropagation: vi.fn() }
            button.props.onClick(event)
            expect(event.stopPropagation).toHaveBeenCalled()
            const key = { key: 'Enter', stopPropagation: vi.fn() }
            button.props.onKeyDown(key)
            expect(key.stopPropagation).toHaveBeenCalled()
        }
        expect(selected).toHaveBeenCalledWith(expect.objectContaining({ stopPropagation: expect.any(Function) }))
        expect(removed).toHaveBeenCalledWith(expect.objectContaining({ stopPropagation: expect.any(Function) }))
    })

    it('says a toggle chip is pressed and edges it in its ink on a stronger wash while it is on', () => {
        const on = renderToStaticMarkup(
            <Chip selected onSelect={() => undefined}>
                harbor
            </Chip>,
        )
        expect(on).toContain('aria-pressed="true"')
        expect(on).toContain('border-current')
        expect(on).toContain('data-selected:bg-faint/35')
        expect(on).toContain('data-selected')
        const off = renderToStaticMarkup(
            <Chip selected={false} onSelect={() => undefined}>
                harbor
            </Chip>,
        )
        expect(off).toContain('aria-pressed="false"')
        expect(off).not.toContain('border-current')
        expect(renderToStaticMarkup(<Chip onSelect={() => undefined}>harbor</Chip>)).not.toContain('aria-pressed')
    })

    it('is a menu trigger with menu, its items opened under it', () => {
        const html = renderToStaticMarkup(
            <Chip menu={[{ label: 'Filter by harbor', onSelect: () => undefined }]} selectLabel="harbor actions">
                harbor
            </Chip>,
        )
        expect(html).toContain('data-slot="chip-select"')
        expect(html).toContain('aria-haspopup="menu"')
        expect(html).toContain('aria-label="harbor actions"')
        expect(html).not.toContain('aria-pressed')
    })

    it('draws an outline tone as a hairline edge with no wash', () => {
        const html = renderToStaticMarkup(<Chip tone="outline">harbor</Chip>)
        expect(html).toContain('border-border text-foreground')
        expect(html).not.toContain('bg-faint/15')
    })

    it('is a link with href, opening a new tab with a mark and words when external', () => {
        const inside = renderToStaticMarkup(<Chip href="#/projects/harbor">harbor</Chip>)
        expect(inside).toMatch(/<a[^>]*href="#\/projects\/harbor"[^>]*data-slot="chip-link"/)
        expect(inside).not.toContain('target=')
        const outside = renderToStaticMarkup(
            <Chip href="https://api.example.org" external words={{ newTab: 'ny fane' }}>
                api
            </Chip>,
        )
        expect(outside).toContain('target="_blank"')
        expect(outside).toContain('rel="noopener noreferrer"')
        expect(outside).toContain('data-slot="external-mark"')
        expect(outside).toContain('(ny fane)')
    })

    it('stands as tall as a control, a finger tall below md, with size="control"', () => {
        const html = renderToStaticMarkup(<Chip size="control">api</Chip>)
        expect(html).toContain('h-(--density-control)')
        expect(html).toContain('max-md:h-finger')
        expect(renderToStaticMarkup(<Chip>api</Chip>)).toContain('h-5')
    })
})

interface ButtonProps {
    onClick: (event: unknown) => void
    onKeyDown: (event: unknown) => void
}

function findButtons(node: ReactNode): ReactElement<ButtonProps>[] {
    if (!isValidElement<{ children?: ReactNode }>(node)) return Array.isArray(node) ? node.flatMap(findButtons) : []
    if (node.type === 'button') return [node as ReactElement<ButtonProps>]
    return Children.toArray(node.props.children).flatMap(findButtons)
}

describe('Dot', () => {
    it('is hidden alone, and an image named by its label', () => {
        expect(renderToStaticMarkup(<Dot status="failed" />)).toContain('aria-hidden="true"')
        const named = renderToStaticMarkup(<Dot status="failed" label="failed" />)
        expect(named).toContain('role="img"')
        expect(named).toContain('aria-label="failed"')
    })

    it('keeps 10px by default and draws 8px at md', () => {
        expect(renderToStaticMarkup(<Dot />)).toContain('size-2.5')
        expect(renderToStaticMarkup(<Dot size="md" />)).toMatch(/\bsize-2\b(?!\.)/)
    })

    it("draws a hollow dot's ring in the tone's ink", () => {
        expect(renderToStaticMarkup(<Dot status="failed" outline />)).toContain('border-color:var(--status-failed-ink)')
        expect(renderToStaticMarkup(<Dot kind="blue" outline />)).toContain('border-color:var(--kind-blue-ink)')
        expect(renderToStaticMarkup(<Dot outline />)).toContain('border-border-strong')
    })

    it('says the word beside it, the dot then hidden', () => {
        const html = renderToStaticMarkup(<Dot status="completed_with_errors" say />)
        expect(html).toContain('>completed with errors<')
        expect(html).toContain('aria-hidden="true"')
        expect(renderToStaticMarkup(<Dot status="running" say="running, step 3 of 5" />)).toContain('>running, step 3 of 5<')
    })

    it('is in the tab order when focusable, named by its tip', () => {
        const html = renderToStaticMarkup(<Dot status="failed" tip="Last run failed" focusable />)
        expect(html).toContain('tabindex="0"')
        expect(html).toContain('aria-label="Last run failed"')
    })

    it('sits on the same line alone and with its word', () => {
        expect(renderToStaticMarkup(<Dot status="failed" />)).toContain('align-middle')
        expect(renderToStaticMarkup(<Dot status="failed" say />)).toMatch(/^<span data-slot="dot"[^>]*align-middle/)
    })
})

describe('StatusChip', () => {
    it('draws an 8px dot in the state color with dot', () => {
        const html = renderToStaticMarkup(<StatusChip status="failed" dot />)
        expect(html).toMatch(/\bsize-2\b(?!\.)/)
        expect(html).toContain('background:var(--status-failed)')
    })

    it("pulses a running state's dot and no other, and any state its definition marks live", () => {
        expect(renderToStaticMarkup(<StatusChip status="running" dot />)).toContain('animate-live')
        expect(renderToStaticMarkup(<StatusChip status="failed" dot />)).not.toContain('animate-live')
        expect(renderToStaticMarkup(<StatusChip status="sending" statuses={{ sending: { color: 'info', live: true } }} dot />)).toContain(
            'animate-live',
        )
    })

    it('takes its dot and the color of an unknown state from the provider, marks its state, and passes props', () => {
        const html = renderToStaticMarkup(
            <StatusProvider dot fallback="pending">
                <StatusChip status="parked" data-testid="chip" />
            </StatusProvider>,
        )
        expect(html).toContain('data-status="parked"')
        expect(html).toContain('data-testid="chip"')
        expect(html).toContain('data-slot="dot"')
        expect(html).toContain('bg-status-pending')
        expect(renderToStaticMarkup(<StatusChip status="parked" />)).not.toContain('data-slot="dot"')
    })

    it('draws a bare dot and a worded one in the same one-line box', () => {
        expect(renderToStaticMarkup(<Dot status="running" label="running" />)).toMatch(
            /data-slot="dot"[^>]*role="img"[^>]*class="[^"]*h-\[1lh\]/,
        )
        expect(renderToStaticMarkup(<Dot status="running" say />)).toMatch(/data-slot="dot"[^>]*class="[^"]*h-\[1lh\]/)
    })
})

describe('Surface', () => {
    it("takes a ref and a div's props, such as a scrolling log's", () => {
        const ref = createRef<HTMLDivElement>()
        const onScroll = () => undefined
        const element = Surface({ ref, onScroll, children: 'log', className: 'overflow-auto' }) as ReactElement<{
            ref?: unknown
            onScroll?: unknown
        }>
        expect(element.props.ref).toBe(ref)
        expect(element.props.onScroll).toBe(onScroll)
        const html = renderToStaticMarkup(
            <Surface id="run-log" aria-label="Run log" tone="inset">
                log
            </Surface>,
        )
        expect(html).toContain('id="run-log"')
        expect(html).toContain('aria-label="Run log"')
        expect(html).toContain('data-tone="inset"')
    })
})
