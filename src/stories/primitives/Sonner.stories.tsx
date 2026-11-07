import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { Toaster } from '@winterop-com/sokkel-ui/primitives/sonner'

const meta: Meta = { title: 'Primitives/Feedback/Sonner', parameters: { frame: 'padded' } }
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
        <>
            <p className="text-sm text-muted-foreground">Toasts appear in the bottom corner.</p>
            <Toaster expand={expand} />
        </>
    )
}

const forever = { duration: Infinity }

const KINDS: Shown[] = [
    { id: 'plain', show: (id) => toast('Rules saved', { ...forever, id, description: 'The orders rules apply from the next run.' }) },
    {
        id: 'success',
        show: (id) => toast.success('nightly-export succeeded', { ...forever, id, description: 'Run 01a1a5c6 finished in 1.2s.' }),
    },
    {
        id: 'info',
        show: (id) => toast.info('Schedule paused', { ...forever, id, description: 'nightly-sync starts no runs until resumed.' }),
    },
    { id: 'warning', show: (id) => toast.warning('Service slow', { ...forever, id, description: 'api answered in 4.8s.' }) },
    {
        id: 'error',
        show: (id) =>
            toast.error('import-orders failed', { ...forever, id, description: 'validate rejected 37 rows at 2026-11-04 14:02.' }),
    },
]

const FAILED: Shown[] = [
    {
        id: 'failed',
        show: (id) =>
            toast.error('import-orders failed', {
                ...forever,
                id,
                description: 'Run 01a1a5c2 stopped at validate after 0.3s.',
                action: { label: 'View run', onClick: () => {} },
            }),
    },
]

const RUNNING: Shown[] = [
    { id: 'running', show: (id) => toast.loading('Running import-orders', { ...forever, id, description: 'Step 3 of 5, validate.' }) },
]

export const Variants: StoryObj = { render: () => <Toasts toasts={KINDS} expand /> }
export const Stacked: StoryObj = { render: () => <Toasts toasts={KINDS} /> }
export const WithAction: StoryObj = { render: () => <Toasts toasts={FAILED} /> }
export const Loading: StoryObj = { render: () => <Toasts toasts={RUNNING} /> }
