import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'

import { Toaster, createToastManager } from '../../components/ui/toast'

const meta: Meta = { title: 'Primitives/Feedback/Toast' }
export default meta

type Manager = ReturnType<typeof createToastManager>
type Options = Parameters<Manager['add']>[0] & { id: string }

function Shown({ manager, toasts }: { manager: Manager; toasts: Options[] }) {
    useEffect(() => {
        for (const options of toasts) manager.add({ timeout: 0, ...options })
        return () => {
            for (const { id } of toasts) manager.close(id)
        }
    }, [manager, toasts])
    return (
        <Toaster toastManager={manager}>
            <div className="min-h-svh bg-background p-6 text-foreground">
                <p className="text-sm text-muted-foreground">Toasts appear in the bottom corner.</p>
            </div>
        </Toaster>
    )
}

const single = createToastManager()
const SUCCEEDED: Options[] = [
    { id: 'succeeded', type: 'success', title: 'weather-gate succeeded', description: 'Run 01a1a5c6 finished in 1.2s.' },
]

const failing = createToastManager()
const FAILED: Options[] = [
    {
        id: 'failed',
        type: 'error',
        title: 'weather-gate failed',
        description: 'store refused the batch at 2026-11-04 14:02.',
        actionProps: { children: 'View run' },
    },
]

const stacked = createToastManager()
const STACK: Options[] = [
    { id: 'info', type: 'info', title: 'Trigger paused', description: 'nightly-sync starts no runs until resumed.' },
    { id: 'warning', type: 'warning', title: 'Connection slow', description: 'dhis2-play answered in 4.8s.' },
    { id: 'loading', type: 'loading', title: 'Running weather-gate', description: 'Step 2 of 3, gate.' },
]

const plain = createToastManager()
const PLAIN: Options[] = [{ id: 'plain', title: 'Schema saved', description: 'readings-v2 is checked on the next run.' }]

export const Success: StoryObj = { render: () => <Shown manager={single} toasts={SUCCEEDED} /> }
export const ErrorWithAction: StoryObj = { render: () => <Shown manager={failing} toasts={FAILED} /> }
export const Stacked: StoryObj = { render: () => <Shown manager={stacked} toasts={STACK} /> }
export const Plain: StoryObj = { render: () => <Shown manager={plain} toasts={PLAIN} /> }
