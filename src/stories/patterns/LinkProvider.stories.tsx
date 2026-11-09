import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ItemCard } from '@winterop-com/sokkel-ui/ItemCard'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { LinkProvider } from '@winterop-com/sokkel-ui/Link'
import { NavBar } from '@winterop-com/sokkel-ui/NavBar'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { ProfileRow } from '@winterop-com/sokkel-ui/ProfileRow'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { pictureOf } from '../fixtures/portraits'
import { routerLink } from '../fixtures/router'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * One link renderer for the whole app: `LinkProvider` at the root draws every internal link the
 * library draws, in the navigation, the trail, a stat, a card, a profile or a sentence, through the
 * app's router, while each stays a real anchor for a middle click or "Copy link address". Links
 * opening a new tab, downloading or leaving for another origin stay plain anchors.
 */
const meta: Meta = { title: 'Patterns/Link provider', parameters: { frame: 'none' } }
export default meta

const PLACES = [
    { id: 'runs', label: 'Runs' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'people', label: 'People' },
] as const

const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index'] as const

/** The page a path names, in a tiny router held in memory. */
function Page({ path }: { path: string }) {
    const [place = 'runs', item] = path.split('/').filter((part) => part !== '')
    const label = PLACES.find((entry) => entry.id === place)?.label ?? 'Runs'
    return (
        <Stack gap="lg" className="p-6">
            <PageHeader
                trail={item === undefined ? undefined : [{ label, href: `/${place}` }]}
                title={item ?? label}
                description={
                    <>
                        At <code>{path}</code>, reached without a reload.
                    </>
                }
            />
            {place === 'people' ? (
                <Stack>
                    <ProfileRow name="ada" image={pictureOf('ada')} detail="Owns nightly-export" href="/people/ada" />
                    <ProfileRow name="grace" image={pictureOf('grace')} detail="Owns sync-inventory" href="/people/grace" />
                </Stack>
            ) : (
                <>
                    <Columns count={3} min="sm" gap="md">
                        <Stat variant="tile" label="Succeeded" value="128" href="/runs/succeeded" />
                        <Stat variant="tile" label="Failed" value="3" href="/runs/failed" />
                        <Stat variant="tile" label="Running" value="2" href="/runs/running" />
                    </Columns>
                    <Columns count={3} min="sm" gap="md">
                        {JOBS.map((job) => (
                            <ItemCard key={job} code={job} description="Runs every night on the worker" href={`/jobs/${job}`} />
                        ))}
                    </Columns>
                </>
            )}
            <p className="text-sm">
                Owned by <TextLink href="/people/margaret">margaret</TextLink>; the handbook is at{' '}
                <TextLink href="https://handbook.example.org" external>
                    handbook.example.org
                </TextLink>
                , which opens in a new tab.
            </p>
        </Stack>
    )
}

/**
 * A router-style renderer wired once at the root: a press on a place, a crumb, a stat, a card, a
 * profile or a link in the sentence moves to its page in place, and the external link stays a plain
 * anchor.
 */
export const Router: StoryObj = {
    render: function Router() {
        const [path, setPath] = useState('/runs')
        const place = path.split('/')[1]
        return (
            <LinkProvider render={routerLink(setPath)}>
                <NavBar
                    mark={<TidevannMark />}
                    name="Tidevann"
                    links={PLACES.map((entry) => ({ ...entry, href: `/${entry.id}`, active: entry.id === place }))}
                />
                <Page path={path} />
            </LinkProvider>
        )
    },
}
