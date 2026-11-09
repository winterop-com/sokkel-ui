import type { Meta, StoryObj } from '@storybook/react-vite'
import { Play } from 'lucide-react'
import { useState } from 'react'

import { CodeEditor } from '@winterop-com/sokkel-ui/CodeEditor'
import { ExampleList, type ExampleTab } from '@winterop-com/sokkel-ui/ExampleList'
import { FoldingRail } from '@winterop-com/sokkel-ui/FoldingRail'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { QUERY_TABS } from '../fixtures/examples'

/**
 * Main content with a rail beside it that resizes from its inner edge and folds to a strip with its
 * name written down it. In a container too narrow for both, the rail goes under the content.
 */
const meta: Meta = {
    title: 'Patterns/Folding rail',
    decorators: [
        (Story) => (
            <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
                <Story />
            </Stack>
        ),
    ],
}
export default meta

/** An editor of queries beside a rail of runnable examples in tabs per language; choosing one fills the editor. */
function Queries({ folded = false, side }: { folded?: boolean; side?: 'start' | 'end' }) {
    const [language, setLanguage] = useState<'jq' | 'sql'>('jq')
    const [chosen, setChosen] = useState('jq-failed')
    const [source, setSource] = useState(QUERY_TABS[0]?.groups[0]?.examples[0]?.code ?? '')
    const choose = (id: string, code: string | undefined, tab: ExampleTab | undefined) => {
        setChosen(id)
        setSource(code ?? '')
        if (tab !== undefined) setLanguage(tab.id === 'sql' ? 'sql' : 'jq')
    }
    return (
        <FoldingRail
            title="Examples"
            side={side}
            defaultFolded={folded}
            className="min-h-0 flex-1"
            rail={
                <ExampleList
                    tabs={QUERY_TABS}
                    tab={language}
                    onTabChange={(tab) => setLanguage(tab === 'sql' ? 'sql' : 'jq')}
                    chosen={chosen}
                    onChoose={(example, tab) => choose(example.id, example.code, tab)}
                />
            }
        >
            <Section
                title="Query"
                meta={language === 'sql' ? 'SQL' : 'jq'}
                variant="boxed"
                flush
                fill
                className="min-h-0 flex-1"
                actions={
                    <Button size="sm">
                        <Play aria-hidden />
                        Run
                    </Button>
                }
            >
                <CodeEditor label="Query" value={source} onChange={setSource} language={language} variant="pane" className="h-full" />
            </Section>
        </FoldingRail>
    )
}

/** Folded: a strip with the rail's name written down it; a press unfolds it. */
export const Folded: StoryObj = { render: () => <Queries folded /> }

/** Open beside the editor, its edge dragging to resize it and its head's button folding it. */
export const Open: StoryObj = { render: () => <Queries /> }

/** The rail at the start of the content instead of its end. */
export const AtTheStart: StoryObj = { name: 'At the start', render: () => <Queries side="start" /> }
