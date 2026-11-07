import type { Meta, StoryObj } from '@storybook/react-vite'
import { Archive, Download, FolderInput, Tag, Trash2 } from 'lucide-react'

import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { SelectionBar } from '@winterop-com/sokkel-ui/SelectionBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'

const meta: Meta = { title: 'Patterns/Selection bar', parameters: { frame: 'column' } }
export default meta

const clear = () => undefined

/** The count and the Clear button, as a list's head says what is selected. */
export const Count: StoryObj = {
    render: () => (
        <Row className="min-h-8">
            <SelectionBar count={3} onClear={clear} />
        </Row>
    ),
}

/** Actions on the selection after the Clear button, the last of them pushed to the end. */
export const Actions: StoryObj = {
    render: () => (
        <Row className="min-h-8">
            <SelectionBar count={12} onClear={clear}>
                <Button variant="ghost" size="xs">
                    <Download aria-hidden />
                    Download
                </Button>
                <Button variant="ghost" size="xs">
                    <FolderInput aria-hidden />
                    Move
                </Button>
                <Row gap="3xs" className="ml-auto">
                    <IconButton label="Archive">
                        <Archive aria-hidden />
                    </IconButton>
                    <IconButton label="Label">
                        <Tag aria-hidden />
                    </IconButton>
                </Row>
            </SelectionBar>
        </Row>
    ),
}

/** An offer after the count, as a table offers every row once the page shown is selected. */
export const Offer: StoryObj = {
    render: () => (
        <Row className="min-h-8">
            <SelectionBar
                count={50}
                onClear={clear}
                offer={
                    <Button variant="link" size="xs">
                        Select all 1,240
                    </Button>
                }
            >
                <Button variant="ghost" size="xs">
                    <Download aria-hidden />
                    Export
                </Button>
            </SelectionBar>
        </Row>
    ),
}

/** Framed: a bar of its own over a list that has none, its actions wrapping when narrow. */
export const Framed: StoryObj = {
    render: () => (
        <SelectionBar count={2} onClear={clear} framed>
            <Button variant="ghost" size="sm">
                <Download aria-hidden />
                Download
            </Button>
            <Button variant="ghost" size="sm">
                <FolderInput aria-hidden />
                Move
            </Button>
            <Button variant="destructive" size="sm" className="ml-auto">
                <Trash2 aria-hidden />
                Delete
            </Button>
        </SelectionBar>
    ),
}

/** Small: the count quiet and small, with no Clear button, for a compact toolbar. */
export const Small: StoryObj = {
    render: () => (
        <Row className="min-h-8">
            <SelectionBar count={4} size="sm" words={{ selected: (count) => `${String(count)} chosen` }}>
                <IconButton label="Remove the chosen steps">
                    <Trash2 aria-hidden />
                </IconButton>
            </SelectionBar>
        </Row>
    ),
}
