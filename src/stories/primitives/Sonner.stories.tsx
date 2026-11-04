import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { Toaster } from '../../components/ui/sonner'

const meta: Meta = { title: 'Primitives/Feedback/Sonner' }
export default meta

type Shown = { id: string; show: (id: string) => void }

function Toasts({ toasts, expand }: { toasts: Shown[]; expand?: boolean }) {
    useEffect(() => {
        for (const { id, show } of toasts) show(id)
        return () => {
            for (const { id } of toasts) toast.dismiss(id)
        }
    }, [toasts])
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <p className="text-sm text-muted-foreground">Toasts appear in the bottom corner.</p>
            <Toaster expand={expand} />
        </div>
    )
}

const forever = { duration: Infinity }

const KINDS: Shown[] = [
    { id: 'plain', show: (id) => toast('Schema saved', { ...forever, id, description: 'readings-v2 is checked on the next run.' }) },
    {
        id: 'success',
        show: (id) => toast.success('weather-gate succeeded', { ...forever, id, description: 'Run 01a1a5c6 finished in 1.2s.' }),
    },
    {
        id: 'info',
        show: (id) => toast.info('Trigger paused', { ...forever, id, description: 'nightly-sync starts no runs until resumed.' }),
    },
    { id: 'warning', show: (id) => toast.warning('Connection slow', { ...forever, id, description: 'dhis2-play answered in 4.8s.' }) },
    {
        id: 'error',
        show: (id) => toast.error('weather-gate failed', { ...forever, id, description: 'store refused the batch at 2026-11-04 14:02.' }),
    },
]

const FAILED: Shown[] = [
    {
        id: 'failed',
        show: (id) =>
            toast.error('weather-gate failed', {
                ...forever,
                id,
                description: 'Run 01a1a5c2 stopped at store after 0.3s.',
                action: { label: 'View run', onClick: () => {} },
            }),
    },
]

const RUNNING: Shown[] = [
    { id: 'running', show: (id) => toast.loading('Running weather-gate', { ...forever, id, description: 'Step 2 of 3, gate.' }) },
]

export const Variants: StoryObj = { render: () => <Toasts toasts={KINDS} expand /> }
export const Stacked: StoryObj = { render: () => <Toasts toasts={KINDS} /> }
export const WithAction: StoryObj = { render: () => <Toasts toasts={FAILED} /> }
export const Loading: StoryObj = { render: () => <Toasts toasts={RUNNING} /> }
