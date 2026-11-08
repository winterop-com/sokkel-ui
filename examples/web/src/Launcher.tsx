import { AppBar } from '@winterop-com/sokkel-ui/AppBar'
import { Columns } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { ThemeToggle } from '@winterop-com/sokkel-ui/ThemeToggle'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@winterop-com/sokkel-ui/primitives/item'
import { RotateCcwIcon } from 'lucide-react'
import { useState } from 'react'

import { resetAll } from './backend'
import { DEMOS } from './demos'
import type { Frame } from './frame'
import { TidevannMark } from './TidevannMark'

/** The launcher: every demo as a card, and a way to put the demo data back. */
export function Launcher({ frame }: { frame: Frame }) {
    const { settings, setSettings, resolved } = frame.appearance
    const dark = resolved === 'dark'
    const [resetting, setResetting] = useState(false)

    const reset = () => {
        setResetting(true)
        void resetAll().finally(() => setResetting(false))
    }

    return (
        <>
            <AppBar
                desktop={frame.desktop}
                mark={<TidevannMark />}
                trail={[{ label: 'Tidevann' }]}
                actions={<ThemeToggle dark={dark} onToggle={() => setSettings({ ...settings, scheme: dark ? 'light' : 'dark' })} />}
            />
            <Page>
                <PageHeader
                    title="Demos"
                    count={`${String(DEMOS.length)} apps`}
                    actions={
                        <Button size="sm" variant="outline" disabled={resetting} onClick={reset}>
                            <RotateCcwIcon aria-hidden />
                            Reset demo data
                        </Button>
                    }
                />
                <Columns count="fill" min="lg" gap="md">
                    {DEMOS.map((demo) => (
                        <Item key={demo.id} variant="outline" render={<a href={`#/${demo.id}`} />}>
                            <ItemMedia variant="icon">
                                <demo.icon aria-hidden />
                            </ItemMedia>
                            <ItemContent>
                                <ItemTitle>{demo.name}</ItemTitle>
                                <ItemDescription>{demo.summary}</ItemDescription>
                            </ItemContent>
                        </Item>
                    ))}
                </Columns>
            </Page>
        </>
    )
}
