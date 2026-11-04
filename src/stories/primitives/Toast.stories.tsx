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
    { id: 'succeeded', type: 'success', title: 'nightly-export succeeded', description: 'Run 01a1a5c6 finished in 1.2s.' },
]

const failing = createToastManager()
const FAILED: Options[] = [
    {
        id: 'failed',
        type: 'error',
        title: 'import-orders failed',
        description: 'validate rejected 37 rows at 2026-11-04 14:02.',
        actionProps: { children: 'View run' },
    },
]

const stacked = createToastManager()
const STACK: Options[] = [
    { id: 'info', type: 'info', title: 'Schedule paused', description: 'nightly-sync starts no runs until resumed.' },
    { id: 'warning', type: 'warning', title: 'Service slow', description: 'api answered in 4.8s.' },
    { id: 'loading', type: 'loading', title: 'Running import-orders', description: 'Step 3 of 5, validate.' },
]

const plain = createToastManager()
const PLAIN: Options[] = [{ id: 'plain', title: 'Rules saved', description: 'The orders rules apply from the next run.' }]

export const Success: StoryObj = { render: () => <Shown manager={single} toasts={SUCCEEDED} /> }
export const ErrorWithAction: StoryObj = { render: () => <Shown manager={failing} toasts={FAILED} /> }
export const Stacked: StoryObj = { render: () => <Shown manager={stacked} toasts={STACK} /> }
export const Plain: StoryObj = { render: () => <Shown manager={plain} toasts={PLAIN} /> }
