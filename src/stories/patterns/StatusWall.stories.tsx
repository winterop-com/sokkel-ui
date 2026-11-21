import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { StatusTile, StatusWall, WALL_STATUSES } from '@winterop-com/sokkel-ui/StatusWall'
import { WALL_NOW, WALL_SOURCES, type WallSource } from '../fixtures/wall'

const meta: Meta = { title: 'Patterns/Status wall', parameters: { frame: 'padded' } }
export default meta

const source = (id: string) => {
    const found = WALL_SOURCES.find((each) => each.id === id)
    if (found === undefined) throw new Error(id)
    return found
}

/** A source as a tile, every field it has filled in. */
const tile = (each: WallSource, props: { selected?: boolean; onSelect?: () => void } = {}) => (
    <StatusTile
        key={each.id}
        name={each.name}
        caption={each.kind}
        icon={each.icon}
        status={each.status}
        value={each.latency?.toLocaleString('en-US')}
        unit={each.latency === undefined ? undefined : 'ms'}
        detail={each.detail}
        series={each.series}
        seriesLabel={each.series === undefined ? undefined : `${each.name}: latency over the last hour`}
        flag={each.simulated === true ? 'Simulated' : undefined}
        updatedAt={each.lag === null ? null : WALL_NOW - each.lag}
        now={WALL_NOW}
        {...props}
    />
)

/** One source that is up: its kind and name, its status, its latency as the figure, a line of detail, its freshness and its latency over time along the foot. */
export const Tile: StoryObj = {
    render: () => <Stack className="max-w-xs">{tile(source('earthquakes'))}</Stack>,
}

/** The four statuses with nothing but a name: up in good, degraded in warning, down in critical and pulsing, unknown with no color and a hollow dot. */
export const Statuses: StoryObj = {
    render: () => (
        <StatusWall label="Statuses" tile="sm">
            {WALL_STATUSES.map((status) => (
                <StatusTile key={status} name="api" caption="Service" status={status} />
            ))}
        </StatusWall>
    ),
}

/** A wall of feeds and services: most up, one slow, one that stopped answering, one not checked yet, and two marked as simulated. */
export const Wall: StoryObj = {
    render: () => <StatusWall label="Sources">{WALL_SOURCES.map((each) => tile(each))}</StatusWall>,
}

/** Tiles that are buttons: pressing one picks it, and the one picked is ringed. */
export const Pick: StoryObj = {
    render: function Render() {
        const [picked, setPicked] = useState('flights')
        return (
            <StatusWall label="Sources">
                {WALL_SOURCES.map((each) => tile(each, { selected: each.id === picked, onSelect: () => setPicked(each.id) }))}
            </StatusWall>
        )
    },
}

/** Tiles that are links to each source's own page, on the wall's widest tiles. */
export const Links: StoryObj = {
    render: () => (
        <StatusWall label="Sources" tile="lg">
            {WALL_SOURCES.slice(0, 4).map((each) => (
                <StatusTile
                    key={each.id}
                    name={each.name}
                    caption={each.kind}
                    icon={each.icon}
                    status={each.status}
                    value={each.latency?.toLocaleString('en-US')}
                    unit="ms"
                    detail={each.detail}
                    series={each.series}
                    href={`https://status.example.org/${each.id}`}
                />
            ))}
        </StatusWall>
    ),
}
