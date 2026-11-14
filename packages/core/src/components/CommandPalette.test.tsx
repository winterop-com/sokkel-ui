import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { CommandPalette, type PaletteCommand } from './CommandPalette'

// The dialog draws through a portal, which the server leaves out: its rows are drawn in place here.
vi.mock('./ui/command', async (original) => ({
    ...(await original<typeof import('./ui/command')>()),
    CommandDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

/** The palette open on one group of commands, as the server draws it. */
function drawn(commands: Omit<PaletteCommand, 'onSelect'>[]): string {
    return renderToStaticMarkup(
        <CommandPalette
            open
            onOpenChange={() => undefined}
            groups={[{ title: 'Jobs', commands: commands.map((command) => ({ ...command, onSelect: () => undefined })) }]}
        />,
    )
}

/** The classes of the element that draws `text`. */
function inkOf(html: string, text: string): string[] {
    return (new RegExp(`class="([^"]*)"[^>]*>${text}<`).exec(html)?.[1] ?? '').split(/\s+/)
}

describe('CommandPalette summaries', () => {
    it('draws a summary quiet, and in a status ink with metaTone', () => {
        const html = drawn([
            { id: 'nightly-export', label: 'nightly-export', meta: '4m 12s' },
            { id: 'import-orders', label: 'import-orders', meta: 'no upload step', metaTone: 'critical' },
        ])
        expect(inkOf(html, '4m 12s')).toContain('text-muted-foreground')
        const missing = inkOf(html, 'no upload step')
        expect(missing).toContain('text-critical-ink')
        expect(missing).not.toContain('text-muted-foreground')
        expect(missing).toContain('font-mono')
    })

    it('inks a two-line row’s summary at its end, and leaves a refusal in its place quiet', () => {
        const html = drawn([
            { id: 'sync-inventory', label: 'sync-inventory', detail: 'harbor', meta: '2 sites missing', metaTone: 'warning' },
            { id: 'send-digest', label: 'send-digest', detail: 'juniper', meta: '3 sent', metaTone: 'critical', disabled: 'Paused by ada' },
        ])
        expect(inkOf(html, '2 sites missing')).toContain('text-warning-ink')
        // A two-line row's quiet fact wears the muted ink, as a one-line row's meta does.
        expect(inkOf(html, 'Paused by ada')).toEqual(expect.arrayContaining(['text-muted-foreground']))
        expect(html).not.toContain('text-critical-ink')
    })
})
