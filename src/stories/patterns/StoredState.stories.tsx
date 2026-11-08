import type { Meta, StoryObj } from '@storybook/react-vite'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { Surface } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'

/**
 * `useStored`: state kept in local storage as JSON, so it outlasts a reload, held in memory when
 * storage is refused, and followed by every `useStored` of the same key, in this tab or another.
 * An app sets its prefix once with `setStoredPrefix`; these stories pass their own.
 */
const meta: Meta = { title: 'Patterns/Stored state', parameters: { frame: 'column' } }
export default meta

const PREFIX = 'tidevann-stories.'
type View = 'table' | 'board' | 'timeline'
const VIEWS = [
    { value: 'table', label: 'Table' },
    { value: 'board', label: 'Board' },
    { value: 'timeline', label: 'Timeline' },
] as const

function Settings({ id }: { id: string }) {
    const [view, setView, resetView] = useStored<View>('runs.view', 'table', { prefix: PREFIX })
    const [follow, setFollow, resetFollow] = useStored('runs.follow', true, { prefix: PREFIX })
    return (
        <Surface className="p-(--density-panel-pad)">
            <Stack gap="sm">
                <Segmented label="View" value={view} options={VIEWS} onChoose={setView} />
                <SwitchField id={`${id}-follow`} label="Follow new runs" checked={follow} onCheckedChange={setFollow} />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        resetView()
                        resetFollow()
                    }}
                >
                    Reset
                </Button>
            </Stack>
        </Surface>
    )
}

/** A view and a switch kept in storage: choose, reload, and they stay; Reset forgets them. */
export const Kept: StoryObj = { render: () => <Settings id="kept" /> }

/** Two panels reading the same keys follow each other, as two tabs do. */
export const Shared: StoryObj = {
    render: () => (
        <Stack gap="md">
            <Settings id="first" />
            <Settings id="second" />
        </Stack>
    ),
}
