import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ImageLightbox } from '../../components/ImageLightbox'
import { ShortcutsDialog } from '../../components/ShortcutsDialog'
import { ThemeToggle } from '../../components/ThemeToggle'
import { TooltipProvider } from '../../components/ui/tooltip'

/** The app-level controls: the scheme switch, the shortcuts dialog, an image that opens full screen. */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider>
            <div className="min-h-svh bg-background p-6 text-foreground">
                <div className="mx-auto flex max-w-3xl flex-col gap-6">{children}</div>
            </div>
        </TooltipProvider>
    )
}

const CHART = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320" viewBox="0 0 640 320">
<rect width="640" height="320" fill="#f6f7f9"/>
<g fill="#3b82f6">${[120, 160, 140, 190, 210, 180, 230, 250, 220, 260, 280, 270].map((h, i) => `<rect x="${30 + i * 50}" y="${300 - h}" width="34" height="${h}" rx="3"/>`).join('')}</g>
<text x="30" y="30" font-family="sans-serif" font-size="16" fill="#111">Runs per month, 2026</text>
</svg>`)}`

function Toggle() {
    const [dark, setDark] = useState(true)
    return (
        <Ground>
            <div className="flex h-shell-top items-center gap-2 rounded-surface border border-border-strong bg-sidebar px-3">
                <span className="text-sm font-medium">Tidevann</span>
                <span className="font-mono text-xs text-muted-foreground">1.4.0</span>
                <div className="flex-1" />
                <ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />
            </div>
        </Ground>
    )
}

function Shortcuts() {
    const [open, setOpen] = useState(true)
    return (
        <Ground>
            <ShortcutsDialog
                open={open}
                onOpenChange={setOpen}
                groups={[
                    {
                        title: 'Anywhere',
                        shortcuts: [
                            { id: 'palette', action: 'Open the command palette', keys: ['⌘', 'K'] },
                            { id: 'search', action: 'Search this list', keys: ['/'] },
                            { id: 'help', action: 'Show these shortcuts', keys: ['?'] },
                        ],
                    },
                    {
                        title: 'Go to',
                        shortcuts: [
                            { id: 'runs', action: 'Runs', keys: ['G', 'R'] },
                            { id: 'jobs', action: 'Jobs', keys: ['G', 'J'] },
                            { id: 'services', action: 'Services', keys: ['G', 'S'] },
                        ],
                    },
                    {
                        title: 'Editor',
                        shortcuts: [
                            { id: 'save', action: 'Save the job', keys: ['⌘', 'S'] },
                            { id: 'run', action: 'Run it', keys: ['⌘', 'Enter'] },
                        ],
                    },
                ]}
            />
        </Ground>
    )
}

function Lightbox({ open }: { open: boolean }) {
    return (
        <Ground>
            <p className="text-sm">The chart the assistant drew:</p>
            <ImageLightbox src={CHART} alt="Runs per month, 2026" className="w-80" defaultOpen={open} />
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/App controls' }
export default meta

export const Theme: StoryObj = { name: 'Theme toggle', render: () => <Toggle /> }
export const Keys: StoryObj = { name: 'Shortcuts dialog', render: () => <Shortcuts /> }
export const Image: StoryObj = { name: 'Image lightbox', render: () => <Lightbox open={false} /> }
export const ImageOpen: StoryObj = { name: 'Image lightbox, open', render: () => <Lightbox open /> }
