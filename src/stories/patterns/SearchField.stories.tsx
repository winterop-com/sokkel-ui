import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { useShortcuts } from '@winterop-com/sokkel-ui/hooks/use-shortcuts'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'

/**
 * The one search box, in the toolbar that sizes it: the glyph, the words typed, a clear button once
 * there are any, and `/` to focus it from anywhere on the page.
 */
const meta: Meta = { title: 'Patterns/Search field', parameters: { frame: 'column' } }
export default meta

function Field({ initial = '', ...props }: { initial?: string } & Omit<Parameters<typeof SearchField>[0], 'value' | 'onChange'>) {
    const [query, setQuery] = useState(initial)
    return <Toolbar search={<SearchField value={query} onChange={setQuery} {...props} />} />
}

/** Empty: the placeholder and the `/` that focuses it. */
export const Empty: StoryObj = { render: () => <Field /> }

/** Words typed: the clear button takes the key hint's place, and Escape clears them. */
export const Typed: StoryObj = { render: () => <Field initial="nightly" /> }

/**
 * On a page that names what it holds: the placeholder stays "Search" while `label` names the field
 * "Search jobs" for assistive technology and in the shortcuts dialog.
 */
export const Labeled: StoryObj = {
    render: () => (
        <>
            <PageHeader title="Jobs" count="5 jobs" />
            <Field label="Search jobs" />
        </>
    ),
}

/** Disabled, as while the jobs load: dimmed, with no clear button and no `/`. */
export const Disabled: StoryObj = { render: () => <Field initial="sync-inventory" disabled /> }

/**
 * An app that answers `/` itself: the field's own key is off, and the app finds the input by the
 * `data-*` mark passed through `inputProps`, as it would any box it marks.
 */
export const Marked: StoryObj = {
    render: function Render() {
        useShortcuts(
            [
                {
                    id: 'find',
                    key: '/',
                    label: 'Search projects',
                    run: () => document.querySelector<HTMLInputElement>('[data-project-search]')?.focus(),
                },
            ],
            [],
        )
        return <Field label="Search projects" shortcut={false} inputProps={{ 'data-project-search': '' }} />
    },
}
