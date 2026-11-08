import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { SavedViews, type SavedView } from '@winterop-com/sokkel-ui/SavedViews'
import { EMPTY_VIEW, type ListViewState } from '@winterop-com/sokkel-ui/lib/list-views'
import { RUN_COLUMN_IDS, RUN_VIEWS, RunsListing } from '../RunsListing'

/**
 * The saved views of a listing: the chosen one named in a menu that lists the rest, saves the
 * listing as a new view, renames the chosen one or deletes it. The app keeps the views; each story
 * holds them in its own state.
 */
const meta: Meta = { title: 'Patterns/Saved views', parameters: { frame: 'padded' } }
export default meta

function Views({ view, current, open = false }: { view: string; current?: Partial<ListViewState>; open?: boolean }) {
    const [views, setViews] = useState<SavedView[]>(RUN_VIEWS)
    const [chosen, setChosen] = useState(view)
    const saved = views.find((one) => one.id === chosen)?.state ?? EMPTY_VIEW
    const [state, setState] = useState<ListViewState>({ ...saved, ...current })
    return (
        <SavedViews
            views={views}
            value={chosen}
            current={state}
            columns={RUN_COLUMN_IDS}
            defaultOpen={open}
            onValueChange={(picked) => {
                setChosen(picked.id)
                setState(picked.state)
            }}
            onSave={(next) => setViews((all) => all.map((one) => (one.id === next.id ? next : one)))}
            onSaveNew={(name, next) => {
                setViews((all) => [...all, { id: name, name, state: next }])
                setChosen(name)
            }}
            onRename={(renamed, name) => setViews((all) => all.map((one) => (one.id === renamed.id ? { ...one, name } : one)))}
            onDelete={(gone) => {
                setViews((all) => all.filter((one) => one.id !== gone.id))
                setChosen('all')
                setState(EMPTY_VIEW)
            }}
        />
    )
}

/** A view chosen, the listing as it keeps it. */
export const Chosen: StoryObj = { render: () => <Views view="failed-week" /> }

/** The listing changed since the view was picked: the trigger says so, with Reset and Save beside it. */
export const Changed: StoryObj = {
    render: () => <Views view="failed-week" current={{ sort: { column: 'duration', direction: 'desc' } }} />,
}

/** The app's own view changed: it is never overwritten, so the listing is saved as a new view instead. */
export const OwnView: StoryObj = {
    name: 'Own view',
    render: () => <Views view="all" current={{ filters: [{ field: 'state', operator: 'oneOf', values: ['running'] }] }} />,
}

/** The menu open: the views to pick, then Save, Save as new view, Rename and Delete. */
export const Open: StoryObj = {
    render: () => <Views view="mine" current={{ widths: { job: 260 } }} open />,
}

/**
 * Over the runs of a week: picking a view sets the filters, the sort and the columns, and changing
 * any of them marks the view changed until it is saved or reset.
 */
export const WithTable: StoryObj = {
    name: 'With a table',
    parameters: { frame: 'none' },
    render: () => (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <RunsListing view="failed-week" />
        </Stack>
    ),
}
