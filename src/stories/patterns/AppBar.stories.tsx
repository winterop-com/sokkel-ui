import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { AppBar } from '@winterop-com/sokkel-ui/AppBar'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { ThemeToggle } from '@winterop-com/sokkel-ui/ThemeToggle'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { TidevannMark } from '../fixtures/TidevannMark'

const meta: Meta = { title: 'Patterns/App bar' }
export default meta

const TRAIL = [
    { label: 'Tidevann', href: '#' },
    { label: 'harbor', href: '#' },
    { label: 'nightly-export', code: true },
]

/** The bar along the top of a screen drawn without the shell: the mark, the trail, the search and the actions. On a phone the trail keeps its last step. */
export const Bar: StoryObj = {
    render: function Render() {
        const [dark, setDark] = useState(true)
        return (
            <TooltipProvider>
                <Stack gap="none" className="min-h-svh bg-background text-foreground">
                    <AppBar
                        mark={<TidevannMark />}
                        trail={TRAIL}
                        onSearch={() => undefined}
                        actions={
                            <>
                                <Button size="sm" variant="outline">
                                    Run now
                                </Button>
                                <ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />
                            </>
                        }
                    />
                    <Page>
                        <PageHeader
                            title="Nightly export"
                            description="Writes the day's orders to the warehouse, every night at 02:00 UTC."
                        />
                    </Page>
                </Stack>
            </TooltipProvider>
        )
    },
}

/** The mark and the trail alone at the top of a page, with no bar around them, as over a sheet of charts. */
export const Trail: StoryObj = {
    parameters: { frame: 'padded' },
    render: () => <TopBar mark={<TidevannMark />} trail={[{ label: 'Tidevann', href: '#' }, { label: 'Job runs' }]} />,
}
