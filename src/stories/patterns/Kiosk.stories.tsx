import type { Meta, StoryObj } from '@storybook/react-vite'
import { Maximize2, X } from 'lucide-react'

import { AlertTicker } from '@winterop-com/sokkel-ui/AlertTicker'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Kiosk } from '@winterop-com/sokkel-ui/Kiosk'
import { Center } from '@winterop-com/sokkel-ui/Layout'
import { Surface } from '@winterop-com/sokkel-ui/Section'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { StatusTile, StatusWall } from '@winterop-com/sokkel-ui/StatusWall'
import { TidevannMark } from '../fixtures/TidevannMark'
import { WALL_ALERTS, WALL_NOW, WALL_SOURCES } from '../fixtures/wall'

const meta: Meta = { title: 'Patterns/Kiosk', parameters: { layout: 'fullscreen' } }
export default meta

/** What stands on the stage in these stories, where an app puts its map. */
function Stage() {
    return (
        <Surface tone="well">
            <Center className="h-full p-6 text-sm text-muted-foreground">The stage: a map fills it</Center>
        </Surface>
    )
}

const up = WALL_SOURCES.filter((each) => each.status === 'up').length
const degraded = WALL_SOURCES.filter((each) => each.status === 'degraded').length
const down = WALL_SOURCES.filter((each) => each.status === 'down').length

/** The frame alone: a mark, a title and a clock over a stage that takes all the room left. */
export const Frame: StoryObj = {
    render: () => (
        <Kiosk className="h-svh" label="Wall" mark={<TidevannMark className="size-6" />} title="Tidevann" clock="14:30">
            <Stage />
        </Kiosk>
    ),
}

/** A whole wall: counters under the head, the stage with a status wall beside it, and the alert ticker along the bottom. In a narrow room it all stacks and scrolls down. */
export const Wall: StoryObj = {
    render: () => (
        <Kiosk
            className="h-svh"
            label="Operations wall"
            mark={<TidevannMark className="size-6" />}
            title="Tidevann operations"
            clock="14:30:00"
            actions={
                <>
                    <IconButton label="Full screen">
                        <Maximize2 aria-hidden />
                    </IconButton>
                    <IconButton label="Leave the wall">
                        <X aria-hidden />
                    </IconButton>
                </>
            }
            figures={
                <>
                    <Stat variant="tile" label="Sources up" value={up} dot="var(--good)" />
                    <Stat variant="tile" label="Degraded" value={degraded} dot="var(--warning)" />
                    <Stat variant="tile" label="Down" value={down} dot="var(--critical)" emphasis />
                    <Stat variant="tile" label="Vessels" value="312" note="in view" />
                    <Stat variant="tile" label="Flights" value="1,204" note="in the air" />
                    <Stat variant="tile" label="Alerts" value={WALL_ALERTS.length} note="last hour" />
                </>
            }
            aside={
                <StatusWall label="Sources" tile="sm">
                    {WALL_SOURCES.map((each) => (
                        <StatusTile
                            key={each.id}
                            name={each.name}
                            caption={each.kind}
                            icon={each.icon}
                            status={each.status}
                            value={each.latency?.toLocaleString('en-US')}
                            unit={each.latency === undefined ? undefined : 'ms'}
                            series={each.series}
                            flag={each.simulated === true ? 'Simulated' : undefined}
                            updatedAt={each.lag === null ? null : WALL_NOW - each.lag}
                            now={WALL_NOW}
                        />
                    ))}
                </StatusWall>
            }
            asideWidth="lg"
            foot={<AlertTicker label="Alerts" items={WALL_ALERTS} paused />}
        >
            <Stage />
        </Kiosk>
    ),
}
