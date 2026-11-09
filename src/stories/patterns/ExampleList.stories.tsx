import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ExampleList } from '@winterop-com/sokkel-ui/ExampleList'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { QUERY_TABS } from '../fixtures/examples'

/**
 * Runnable examples under headings, each a row that fills an editor or a builder when chosen: its
 * name, its source in the code face and what it shows. In tabs, one per language.
 */
const meta: Meta = { title: 'Patterns/Example list', parameters: { frame: 'padded' } }
export default meta

function List({ tabs }: { tabs: boolean }) {
    const [chosen, setChosen] = useState('jq-failed')
    return (
        <Section title="Examples" variant="boxed" flush className="w-72">
            <ExampleList
                {...(tabs ? { tabs: QUERY_TABS } : { groups: QUERY_TABS[0]?.groups })}
                chosen={chosen}
                onChoose={(example) => setChosen(example.id)}
            />
        </Section>
    )
}

/** One list of groups; the example in use is marked. */
export const Groups: StoryObj = { render: () => <List tabs={false} /> }

/** The groups in tabs, one per language. */
export const InTabs: StoryObj = { name: 'In tabs', render: () => <List tabs /> }
