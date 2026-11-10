import { Braces, Columns2, Database, ScrollText, Workflow } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Shell } from '@winterop-com/sokkel-ui/Shell'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'

/** The places of Tidevann's editing app, one per editor story. */
export type EditorPlace = 'pipelines' | 'schemas' | 'query' | 'runs' | 'shared'

function groups(place: EditorPlace): RailGroup[] {
    return [
        {
            id: 'edit',
            entries: [
                { id: 'pipelines', label: 'Pipelines', icon: Workflow, href: '#', active: place === 'pipelines' },
                { id: 'schemas', label: 'Schemas', icon: Braces, href: '#', active: place === 'schemas' },
                { id: 'query', label: 'Query', icon: Database, href: '#', active: place === 'query' },
                { id: 'runs', label: 'Runs', icon: ScrollText, href: '#', active: place === 'runs' },
                { id: 'shared', label: 'Side by side', icon: Columns2, href: '#', active: place === 'shared' },
            ],
        },
    ]
}

/** Tidevann's frame around an editor: the rail of places, the trail, and the editor filling the rest. */
export function EditorApp({ place, trail, children }: { place: EditorPlace; trail: Crumb[]; children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={groups(place)}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={
                            <AccountMenu
                                name="ada"
                                image={pictureOf('ada')}
                                where="tidevann.example.org"
                                collapsed={collapsed}
                                onSettings={() => undefined}
                            />
                        }
                    />
                }
                top={<TopBar trail={trail} />}
            >
                <Stack gap="none" className="h-full min-h-0">
                    {children}
                </Stack>
            </Shell>
        </TooltipProvider>
    )
}
