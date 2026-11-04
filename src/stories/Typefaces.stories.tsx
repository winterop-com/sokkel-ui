import type { Meta, StoryObj } from '@storybook/react-vite'
import type { CSSProperties } from 'react'

import { RunsPage } from './RunsPage'

/**
 * The Runs page in each candidate pair of typefaces. A theme sets `--typeface-sans` and
 * `--typeface-mono`; these stories set them on the page alone.
 */
const PAIRS: Record<string, { sans: string; mono: string }> = {
    plex: { sans: "'IBM Plex Sans Variable', sans-serif", mono: "'IBM Plex Mono', monospace" },
    inter: { sans: "'Inter Variable', sans-serif", mono: "'JetBrains Mono Variable', monospace" },
    geist: { sans: "'Geist Variable', sans-serif", mono: "'Geist Mono Variable', monospace" },
    system: { sans: 'system-ui, sans-serif', mono: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
}

function Typeface({ pair }: { pair: keyof typeof PAIRS }) {
    const { sans, mono } = PAIRS[pair]
    return (
        <div style={{ '--typeface-sans': sans, '--typeface-mono': mono, fontFamily: sans } as CSSProperties}>
            <RunsPage />
        </div>
    )
}

const meta: Meta<typeof Typeface> = {
    title: 'Foundations/Typefaces',
    component: Typeface,
}
export default meta

type Story = StoryObj<typeof Typeface>

export const PlexSansAndMono: Story = { args: { pair: 'plex' } }
export const InterAndJetBrainsMono: Story = { args: { pair: 'inter' } }
export const GeistAndGeistMono: Story = { args: { pair: 'geist' } }
export const SystemFonts: Story = { args: { pair: 'system' } }
