import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ChipBar } from '@winterop-com/sokkel-ui/ChipBar'

const meta: Meta = { title: 'Patterns/Chip bar', parameters: { frame: 'column' } }
export default meta

const FEW = ['All', 'harbor', 'juniper', 'larkspur'].map((name) => ({ value: name, label: name }))
const MANY = [
    'All',
    'nightly-export',
    'sync-inventory',
    'rebuild-index',
    'send-digest',
    'import-orders',
    'Failed',
    'Running',
    'Queued',
    'Cancelled',
    'Recently changed',
    'Mine',
].map((name) => ({ value: name, label: name }))

/** A few chips that fit: no arrows, nothing fades. */
export const Few: StoryObj = {
    render: function Render() {
        const [value, setValue] = useState('All')
        return <ChipBar label="Projects" chips={FEW} value={value} onValueChange={setValue} />
    },
}

/** More chips than room: the row scrolls sideways with no scroll bar, the cut edge fades, and an arrow scrolls a page. */
export const Overflowing: StoryObj = {
    render: function Render() {
        const [value, setValue] = useState('All')
        return (
            <div className="max-w-md">
                <ChipBar label="Jobs" chips={MANY} value={value} onValueChange={setValue} />
            </div>
        )
    },
}
