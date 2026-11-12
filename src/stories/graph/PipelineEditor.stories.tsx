import type { Meta, StoryObj } from '@storybook/react-vite'

import { BROKEN_DOC, EMPTY_DOC, NIGHTLY_DOC, SCATTERED_DOC, UNCONNECTED_DOC, WITHOUT_DEDUPE } from './editor/documents'
import { PipelineEditorStory } from './editor/Editor'
import { EditorPage as FullEditor } from './editor/EditorPage'
import { TextAndGraph as BothWays } from './editor/TextAndGraph'

const meta: Meta = { title: 'Graphs/Pipeline editor' }
export default meta

type Story = StoryObj

/** The start: nothing on the canvas but a hint, and the palette beside it. Drag a block in, or click one, to add the first step. */
export const Empty: Story = {
    render: () => <PipelineEditorStory initial={EMPTY_DOC} palette meta="harbor, a new pipeline" />,
}

/**
 * The palette of blocks, grouped as sources, transforms, checks and outputs, with a search, a
 * block's badge plain, in a tone or in its category's hue. Drag a
 * block onto the canvas to add it where it is let go, or click it to add it after the chosen step,
 * validate here.
 */
export const Palette: Story = {
    render: () => <PipelineEditorStory initial={NIGHTLY_DOC} palette selection={['validate']} meta="harbor, validate chosen" />,
}

/** The plus at a step's output, shown on the chosen or hovered step, opens the picker with the blocks that can follow it. */
export const AddAfter: Story = {
    name: 'Add after',
    render: () => (
        <PipelineEditorStory
            initial={NIGHTLY_DOC}
            selection={['validate']}
            picker={{ mode: 'after', source: 'validate' }}
            meta="harbor, adding after validate"
        />
    ),
}

/** The plus at an edge's middle opens the picker with the blocks that fit between the two steps, and puts the step between them. */
export const InsertOnEdge: Story = {
    name: 'Insert on edge',
    render: () => (
        <PipelineEditorStory
            initial={NIGHTLY_DOC}
            picker={{ mode: 'insert', source: 'dedupe-orders', target: 'validate' }}
            meta="harbor, inserting between dedupe-orders and validate"
        />
    ),
}

/** A connection drawn from a step's output and let go on empty ground opens the picker there; the step it makes is already connected. */
export const DropOnGround: Story = {
    name: 'Drop on ground',
    render: () => (
        <PipelineEditorStory
            initial={NIGHTLY_DOC}
            selection={['write-csv']}
            picker={{ mode: 'drop', source: 'write-csv', at: null, anchor: { node: 'write-csv', dx: 80, dy: 110 } }}
            meta="harbor, a connection from write-csv let go on the ground"
        />
    ),
}

/**
 * Drag from one step's output port to another's input port to connect them. A connection that
 * would make a loop, or that joins kinds that do not fit, is refused, and the reason is said
 * beside the pointer and at the foot of the canvas. Here notify waits for its input.
 */
export const Connect: Story = {
    render: () => (
        <PipelineEditorStory
            initial={UNCONNECTED_DOC}
            selection={['notify']}
            notice={{ tone: 'critical', text: 'upload.s3 takes files, and validate.schema gives records.' }}
            meta="harbor, notify not yet connected"
        />
    ),
}

/** The chosen step's code, name and settings in the side panel, the settings drawn from its block's JSON Schema. */
export const SelectAndEdit: Story = {
    name: 'Select and edit',
    render: () => <PipelineEditorStory initial={NIGHTLY_DOC} selection={['validate']} aside="step" meta="harbor, validate chosen" />,
}

/**
 * Steps with a problem, a required setting left empty or an input with nothing flowing in, are
 * marked as a form marks a field, and the toolbar counts them; its count chooses the first.
 */
export const Validation: Story = {
    render: () => <PipelineEditorStory initial={BROKEN_DOC} aside="problems" meta="harbor, two steps to fix" />,
}

/** Shift and a drag on the ground boxes several steps; Shift, Cmd or Ctrl with a click adds one. Chosen steps move and are removed together. */
export const MultiSelect: Story = {
    name: 'Multi-select',
    render: () => (
        <PipelineEditorStory
            initial={NIGHTLY_DOC}
            selection={['join-stock', 'dedupe-orders', 'validate']}
            aside="step"
            meta="harbor, three steps chosen"
        />
    ),
}

/**
 * Delete or Backspace removes what is chosen; Cmd or Ctrl with Z undoes and with Shift redoes, as do
 * the toolbar's buttons. Here dedupe-orders was just removed, and undo brings it back.
 */
export const DeleteAndUndo: Story = {
    name: 'Delete and undo',
    render: () => (
        <PipelineEditorStory
            initial={WITHOUT_DEDUPE}
            past={[NIGHTLY_DOC]}
            notice={{ tone: 'info', text: 'Removed dedupe-orders. Undo brings it back.' }}
            meta="harbor, dedupe-orders removed"
        />
    ),
}

/** Steps placed by hand, out of order; the toolbar's tidy button lays them out again with elk, as one step to undo. Zoom and fit sit beside it. */
export const AutoLayout: Story = {
    name: 'Auto-layout',
    render: () => <PipelineEditorStory initial={SCATTERED_DOC} meta="harbor, placed by hand" />,
}

/**
 * The pipeline as text and as a graph at once, one document: a gesture on the graph is written into
 * the text as an edit to undo (`SharedDocument.replace`), a keystroke in the text redraws the graph,
 * and the text's history is the only undo, from the toolbar, from Cmd or Ctrl with Z on the graph
 * (`useHistoryKeys`) or in the editor. The toolbar leaves zoom to the corner (`zoom={false}`), whose
 * cluster carries the add button.
 */
export const TextAndGraph: Story = { name: 'Text and graph', render: () => <BothWays /> }

/** The whole editor in the shell, as an app ships it, with Save and Run in the page's header. */
export const EditorPage: Story = { name: 'Editor page', render: () => <FullEditor /> }
