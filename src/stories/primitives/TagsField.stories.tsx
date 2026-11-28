import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { TagsField } from '@winterop-com/sokkel-ui/TagsField'

/**
 * Several short values typed into one field, each a chip: Enter or a comma adds one, Backspace in an
 * empty input takes the last off, and suggestions are offered as the viewer types.
 */
const meta: Meta = { title: 'Primitives/Inputs/Tags field', parameters: { frame: 'column' } }
export default meta

const LABELS = ['harbor', 'juniper', 'larkspur', 'nightly', 'export', 'inventory', 'orders', 'digest', 'index', 'urgent']

/** Tags with a value and suggestions, an empty optional one, one that takes three at most, and one turned off. */
export const Plain: StoryObj = {
    render: function Render() {
        const [labels, setLabels] = useState<string[]>(['harbor', 'nightly'])
        return (
            <Stack gap="lg" className="max-w-md">
                <TagsField id="plain-labels" label="Labels" value={labels} onValueChange={setLabels} suggestions={LABELS} />
                <TagsField
                    id="plain-notify"
                    label="Notify"
                    help="Press Enter or type a comma after each name."
                    placeholder="ada, grace"
                    suggestions={['ada', 'grace', 'linus', 'margaret']}
                    normalize={(text) => text.trim().toLowerCase()}
                />
                <TagsField id="plain-max" label="Projects" max={3} defaultValue={['harbor', 'juniper', 'larkspur']} hint="Up to 3" />
                <TagsField id="plain-off" label="Steps" defaultValue={['fetch', 'transform', 'validate']} disabled />
            </Stack>
        )
    },
}
