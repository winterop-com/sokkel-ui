import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Board, BoardDrop, columnLanding, landingBefore } from './board/Board'
import { BoardCard } from './board/BoardCard'
import { BoardColumn } from './board/BoardColumn'
import { DataTable } from './DataTable'
import { arrangedIndex, DashboardArrange } from './dashboard/DashboardArrange'
import { DashboardPanel } from './dashboard/DashboardGrid'
import { carriedTo, takes, type DragData, type DragRect } from './DragDrop'
import { SortableGrid, SortableList } from './Sortable'
import { rowLanding } from './table-reorder'

const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest']

describe('a drag target', () => {
    const row: DragData = { kind: 'files', label: 'Runbook' }
    it('takes things of its own kind, and others only when it says so', () => {
        expect(takes({ kind: 'files', label: 'Larkspur' }, row)).toBe(true)
        expect(takes({ kind: 'cards', label: 'Larkspur' }, row)).toBe(false)
        expect(takes({ kind: 'cards', label: 'Larkspur', accepts: (drag) => drag.kind === 'files' }, row)).toBe(true)
        expect(takes(undefined, row)).toBe(false)
    })
})

describe('a thing carried by the arrow keys', () => {
    // Four table rows, 40 pixels tall, the first picked up.
    const rows = [0, 40, 80, 120].map((top) => ({ left: 0, top, width: 300, height: 40 }))
    const at = (top: number) => ({ left: 0, top, width: 300, height: 40 })
    it('goes to the nearest place that way, just past its middle going down and just before it going up', () => {
        expect(carriedTo('ArrowDown', rows[0], rows)).toEqual({ x: 0, y: 41 })
        expect(carriedTo('ArrowDown', at(41), rows)).toEqual({ x: 0, y: 81 })
        expect(carriedTo('ArrowUp', at(81), rows)).toEqual({ x: 0, y: 79 })
        expect(carriedTo('ArrowUp', at(79), rows)).toEqual({ x: 0, y: 39 })
    })

    it('stays where it is with nothing that way, or on a key that is no arrow', () => {
        expect(carriedTo('ArrowUp', rows[0], rows)).toBeUndefined()
        expect(carriedTo('ArrowDown', at(121), rows)).toBeUndefined()
        expect(carriedTo('Space', rows[0], rows)).toBeUndefined()
    })

    // Two columns of a board: a list around each column's cards, the cards of uneven heights.
    const box = (left: number, top: number, width = 200, height = 60): DragRect => ({ left, top, width, height })
    const zoneA = box(0, 0, 220, 300)
    const a1 = box(10, 10, 200, 40)
    const a2 = box(10, 60, 200, 80)
    const a3 = box(10, 150)
    const zoneB = box(240, 0, 220, 120)
    const b1 = box(250, 10)
    const board = [zoneA, a1, a2, a3, zoneB, b1]
    const middleOf = (corner: { x: number; y: number } | undefined, held: DragRect) =>
        corner === undefined ? undefined : { x: corner.x + held.width / 2, y: corner.y + held.height / 2 }

    it('carries a short card past the middle of a taller one below it, never onto the list around them', () => {
        expect(middleOf(carriedTo('ArrowDown', a1, board), a1)).toEqual({ x: 110, y: 101 })
    })

    it('keeps up and down in line, rather than jumping to another column past the last card', () => {
        expect(carriedTo('ArrowDown', b1, board)).toBeUndefined()
    })

    it('carries sideways to the card in line, else the nearest that way, such as the end of a shorter column', () => {
        expect(middleOf(carriedTo('ArrowRight', a1, board), a1)).toEqual({ x: 351, y: 40 })
        expect(middleOf(carriedTo('ArrowRight', a3, board), a3)).toEqual({ x: 351, y: 60 })
        expect(middleOf(carriedTo('ArrowLeft', b1, board), b1)).toEqual({ x: 109, y: 30 })
    })

    it('reaches an empty column by its list', () => {
        expect(middleOf(carriedTo('ArrowRight', a1, [zoneA, a1, zoneB]), a1)).toEqual({ x: 351, y: 60 })
    })
})

describe('where a dragged thing lands', () => {
    it('lands a card before the card it is held over, or before the next once past its middle', () => {
        expect(landingBefore(['a', 'b', 'c'], 'b', false)).toBe('b')
        expect(landingBefore(['a', 'b', 'c'], 'b', true)).toBe('c')
        expect(landingBefore(['a', 'b', 'c'], 'c', true)).toBeNull()
    })

    it('lands a column beside another, never across a locked one', () => {
        const order = ['queued', 'running', 'succeeded', 'archived']
        expect(columnLanding(order, [], 'queued', 'running', 'after')).toEqual({ from: 0, to: 1 })
        expect(columnLanding(order, [], 'succeeded', 'queued', 'before')).toEqual({ from: 2, to: 0 })
        expect(columnLanding(order, [], 'queued', 'running', 'before')).toBeUndefined()
        expect(columnLanding(order, ['archived'], 'queued', 'archived', 'after')).toBeUndefined()
        expect(columnLanding(order, ['archived'], 'queued', 'succeeded', 'after')).toEqual({ from: 0, to: 2 })
        expect(columnLanding(order, ['running'], 'queued', 'succeeded', 'after')).toBeUndefined()
        expect(columnLanding(order, ['queued'], 'queued', 'running', 'after')).toBeUndefined()
    })

    it('lands a table row before or after another, counted with itself taken out', () => {
        expect(rowLanding(JOBS, 'nightly-export', { key: 'rebuild-index', part: 'after' })).toEqual({ from: 0, to: 2 })
        expect(rowLanding(JOBS, 'send-digest', { key: 'sync-inventory', part: 'before' })).toEqual({ from: 3, to: 1 })
        expect(rowLanding(JOBS, 'sync-inventory', { key: 'nightly-export', part: 'after' })).toBeUndefined()
        expect(rowLanding(JOBS, 'sync-inventory', { key: 'missing', part: 'after' })).toBeUndefined()
    })

    it('lands a panel beside another or at the end, and a new one at its place in the whole', () => {
        expect(arrangedIndex(JOBS, 'nightly-export', 'rebuild-index', 'after')).toBe(2)
        expect(arrangedIndex(JOBS, 'send-digest', 'nightly-export', 'before')).toBe(0)
        expect(arrangedIndex(JOBS, 'nightly-export', 'sync-inventory', 'before')).toBeUndefined()
        expect(arrangedIndex(JOBS, 'nightly-export', null, 'after')).toBe(3)
        expect(arrangedIndex(JOBS, null, 'sync-inventory', 'after')).toBe(2)
        expect(arrangedIndex(JOBS, null, null, 'after')).toBe(4)
    })
})

describe('the parts that drag', () => {
    it('draw a list with a grip named for each row', () => {
        const html = renderToStaticMarkup(
            <SortableList
                items={JOBS}
                itemKey={(job) => job}
                itemLabel={(job) => job}
                renderItem={(job) => <span data-job="">{job}</span>}
                onMove={() => undefined}
                label="Jobs"
                words={{ move: (job) => `Drag ${job}` }}
            />,
        )
        expect(html).toContain('aria-label="Jobs"')
        expect(html).toContain('aria-label="Drag nightly-export"')
        expect(html.match(/data-job/g)).toHaveLength(4)
    })

    it('draw a grid whose cards are their own grips', () => {
        const html = renderToStaticMarkup(
            <SortableGrid
                items={JOBS}
                itemKey={(job) => job}
                itemLabel={(job) => job}
                renderItem={(job) => job}
                onMove={() => undefined}
            />,
        )
        expect(html.match(/aria-roledescription="sortable"/g)).toHaveLength(4)
        expect(html).toContain('grid-template-columns:repeat(auto-fill, minmax(min(12rem, 100%), 1fr))')
    })

    it('give a board card a grip for the keyboard, beside its menu', () => {
        const html = renderToStaticMarkup(
            <Board>
                <BoardDrop id="queued">
                    <BoardCard id="a" code="TID-1" title="Rotate the keys" words={{ move: (card) => `Carry ${card}` }} />
                </BoardDrop>
            </Board>,
        )
        expect(html).toContain('data-board-card="a"')
        expect(html).toContain('aria-label="Carry TID-1"')
    })

    it('give a column a grip only on a board that moves its columns, and none to a locked one', () => {
        const board = (moves: boolean) =>
            renderToStaticMarkup(
                <Board onColumnMove={moves ? () => undefined : undefined}>
                    <BoardColumn id="queued" title="Queued" count={1}>
                        <BoardCard id="a" code="TID-1" title="Rotate the keys" />
                    </BoardColumn>
                    <BoardColumn id="archived" title="Archived" count={1} locked>
                        <BoardCard id="b" code="TID-2" title="Move the export" />
                    </BoardColumn>
                </Board>,
            )
        expect(board(true)).toContain('aria-label="Move Queued"')
        expect(board(true)).not.toContain('aria-label="Move Archived"')
        expect(board(false)).not.toContain('aria-label="Move Queued"')
        expect(board(true)).not.toContain('aria-label="Move TID-2"')
        expect(board(true)).toContain('aria-label="Move TID-1"')
    })

    it('draw a grip at the start of each row of a table that reorders, and none in one sorted', () => {
        const table = (sorted: boolean) =>
            renderToStaticMarkup(
                <DataTable
                    columns={[{ id: 'job', header: 'Job', width: '1fr', cell: (job: string) => job, sortValue: (job) => job }]}
                    rows={JOBS}
                    rowKey={(job) => job}
                    onReorder={() => undefined}
                    defaultSort={sorted ? { column: 'job', direction: 'asc' } : null}
                />,
            )
        expect(table(false)).toContain('aria-label="Move nightly-export"')
        expect(table(true)).not.toContain('aria-label="Move nightly-export"')
    })

    it('hand an arranged panel its grip, size and remove in its head, and offer the palette', () => {
        const html = renderToStaticMarkup(
            <DashboardArrange
                layout={[{ id: 'runs', span: 'half' }]}
                onLayoutChange={() => undefined}
                label={() => 'Runs'}
                renderPanel={() => <DashboardPanel title="Runs">42</DashboardPanel>}
                palette={[{ id: 'queue', label: 'Queue depth' }]}
                onAdd={() => undefined}
            />,
        )
        const head = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
        expect(head).toContain('aria-label="Move Runs"')
        expect(head).toContain('aria-label="Size of Runs"')
        expect(head).toContain('aria-label="Remove Runs"')
        expect(html).toContain('aria-label="Widgets"')
        expect(html).toContain('Queue depth')
        expect(html).toContain('@4xl/dashboard:col-span-6')
    })

    it('draw a plain dashboard while not arranging', () => {
        const html = renderToStaticMarkup(
            <DashboardArrange
                layout={[{ id: 'runs' }]}
                onLayoutChange={() => undefined}
                label={() => 'Runs'}
                renderPanel={() => <DashboardPanel title="Runs">42</DashboardPanel>}
                arranging={false}
                palette={[{ id: 'queue', label: 'Queue depth' }]}
            />,
        )
        expect(html).not.toContain('Move Runs')
        expect(html).not.toContain('Queue depth')
    })
})
