import type { Meta, StoryObj } from '@storybook/react-vite'
import { Command, CornerDownLeft } from 'lucide-react'

import { Kbd, KbdGroup } from '../../components/ui/kbd'
import { Row, Stack } from '../../components/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Actions/Kbd', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="end" wrap>
            <Specimen label="single key">
                <Kbd>K</Kbd>
            </Specimen>
            <Specimen label="word">
                <Kbd>Esc</Kbd>
            </Specimen>
            <Specimen label="icon">
                <Kbd>
                    <Command />
                </Kbd>
            </Specimen>
            <Specimen label="group">
                <KbdGroup>
                    <Kbd>Ctrl</Kbd>
                    <Kbd>K</Kbd>
                </KbdGroup>
            </Specimen>
            <Specimen label="group with plus">
                <KbdGroup>
                    <Kbd>Shift</Kbd>
                    <span className="text-xs text-muted-foreground">+</span>
                    <Kbd>
                        <CornerDownLeft />
                    </Kbd>
                </KbdGroup>
            </Specimen>
        </Row>
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
        <Stack className="max-w-md">
            <p className="text-sm font-medium">Keyboard shortcuts</p>
            <ul className="divide-y divide-border rounded-lg border border-border">
                {SHORTCUTS.map((shortcut) => (
                    <Row key={shortcut.does} as="li" gap="md" justify="between" className="px-3 py-2 text-sm">
                        <span>{shortcut.does}</span>
                        <KbdGroup>
                            {shortcut.keys.map((key) => (
                                <Kbd key={key}>{key}</Kbd>
                            ))}
                        </KbdGroup>
                    </Row>
                ))}
            </ul>
        </Stack>
    ),
}
