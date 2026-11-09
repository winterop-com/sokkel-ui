import { Columns } from '@winterop-com/sokkel-ui/Layout'
import { Sparkline, Stat } from '@winterop-com/sokkel-ui/Stat'
import { formatUptime, overallUptime } from '@winterop-com/sokkel-ui/UptimeBar'

import { SERVICES } from '../data'
import type { LiveState } from '../live'
import { type Health, HEALTH_WORDS, healthCss } from '../status'
import type { UptimeByService } from './uptime'

const TONE: Record<Health, 'good' | 'warning' | 'critical' | 'muted'> = {
    operational: 'good',
    degraded: 'warning',
    outage: 'critical',
    maintenance: 'muted',
}

/** Every service as a tile: its state, its latency now with its last minutes as a line, and its uptime. */
export function ServiceTiles({ state, uptime }: { state: LiveState; uptime: UptimeByService }) {
    return (
        <Columns count={4} min="sm" gap="md">
            {SERVICES.map((service) => {
                const health = state.health[service.id]
                const readings = state.readings[service.id]
                const last = readings[readings.length - 1]
                const overall = overallUptime(uptime[service.id])
                return (
                    <Stat
                        key={service.id}
                        variant="tile"
                        href={`#/services/${service.id}`}
                        label={service.id}
                        dot={healthCss(health)}
                        emphasis={health !== 'operational'}
                        value={last === undefined ? '-' : Math.round(last.p95)}
                        unit="ms p95"
                        note={`${HEALTH_WORDS[health]} · ${overall === null ? 'no data' : formatUptime(overall)} over 90 days`}
                        trend={
                            <Sparkline
                                values={readings.map((reading) => reading.p95)}
                                tone={TONE[health]}
                                label={`${service.id} latency, the last ${String(readings.length)} readings`}
                            />
                        }
                    />
                )
            })}
        </Columns>
    )
}
