import type { Meta, StoryObj } from '@storybook/react-vite'
import { Copy, Play, ScrollText, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Center, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PointMenu, menuPoint, type MenuPoint, type PointMenuItem } from '@winterop-com/sokkel-ui/PointMenu'
import { Surface } from '@winterop-com/sokkel-ui/Section'

const meta: Meta = { title: 'Patterns/Point menu', parameters: { frame: 'padded' } }
export default meta

/** Where the menu stands open when the story is drawn, inside the ground at every width. */
const OPEN_AT: MenuPoint = { x: 56, y: 72 }

/** A ground that opens the menu where it is right-clicked, and says the row last chosen. */
function Ground({ items, head }: { items: (choose: (what: string) => void) => PointMenuItem[]; head?: string }) {
    const [at, setAt] = useState<MenuPoint | null>(OPEN_AT)
    const [said, setSaid] = useState('Right-click anywhere on the ground.')
    return (
        <Stack gap="sm">
            <Surface
                tone="well"
                onContextMenu={(event) => {
                    event.preventDefault()
                    setAt(menuPoint(event))
                }}
            >
                <Center className="h-56 text-sm text-muted-foreground">{said}</Center>
            </Surface>
            <PointMenu at={at} onClose={() => setAt(null)} items={items(setSaid)} head={head} label="Step" />
        </Stack>
    )
}

/** A few plain rows, opened where the ground was right-clicked. */
export const Open: StoryObj = {
    render: () => (
        <Ground
            items={(say) => [
                { id: 'run', label: 'Run from here', onSelect: () => say('Ran from validate.') },
                { id: 'output', label: 'Show output', onSelect: () => say('Showed the output of validate.') },
            ]}
        />
    ),
}

/**
 * A step's menu: its code as the head, icons, a shortcut, a row that is shut, a separator and a
 * destructive row at the end.
 */
export const StepMenu: StoryObj = {
    name: 'Step menu',
    render: () => (
        <Ground
            head="validate"
            items={(say) => [
                { id: 'run', label: 'Run from here', icon: <Play />, onSelect: () => say('Ran from validate.') },
                { id: 'output', label: 'Show output', icon: <ScrollText />, shortcut: 'O', onSelect: () => say('Showed the output.') },
                { id: 'copy', label: 'Copy config', icon: <Copy />, disabled: true, onSelect: () => say('Copied.') },
                { id: 'line', separator: true },
                { id: 'remove', label: 'Remove step', icon: <Trash2 />, destructive: true, onSelect: () => say('Removed validate.') },
            ]}
        />
    ),
}
