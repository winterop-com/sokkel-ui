import type { Meta, StoryObj } from '@storybook/react-vite'
import { Command, CornerDownLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import { Kbd, KbdGroup } from '../../components/ui/kbd'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

const meta: Meta = { title: 'Primitives/Actions/Kbd' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-end gap-6">
                <Labeled label="single key">
                    <Kbd>K</Kbd>
                </Labeled>
                <Labeled label="word">
                    <Kbd>Esc</Kbd>
                </Labeled>
                <Labeled label="icon">
                    <Kbd>
                        <Command />
                    </Kbd>
                </Labeled>
                <Labeled label="group">
                    <KbdGroup>
                        <Kbd>Ctrl</Kbd>
                        <Kbd>K</Kbd>
                    </KbdGroup>
                </Labeled>
                <Labeled label="group with plus">
                    <KbdGroup>
                        <Kbd>Shift</Kbd>
                        <span className="text-xs text-muted-foreground">+</span>
                        <Kbd>
                            <CornerDownLeft />
                        </Kbd>
                    </KbdGroup>
                </Labeled>
            </div>
        </Ground>
    ),
}

const SHORTCUTS = [
    { keys: ['Ctrl', 'K'], does: 'Search jobs, runs and services' },
    { keys: ['G', 'R'], does: 'Go to runs' },
    { keys: ['G', 'J'], does: 'Go to jobs' },
    { keys: ['Ctrl', 'Enter'], does: 'Run the open job' },
    { keys: ['Esc'], does: 'Close the side panel' },
]

export const Shortcuts: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-md flex-col gap-3">
                <p className="text-sm font-medium">Keyboard shortcuts</p>
                <ul className="divide-y divide-border rounded-lg border border-border">
                    {SHORTCUTS.map((shortcut) => (
                        <li key={shortcut.does} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                            <span>{shortcut.does}</span>
                            <KbdGroup>
                                {shortcut.keys.map((key) => (
                                    <Kbd key={key}>{key}</Kbd>
                                ))}
                            </KbdGroup>
                        </li>
                    ))}
                </ul>
            </div>
        </Ground>
    ),
}
