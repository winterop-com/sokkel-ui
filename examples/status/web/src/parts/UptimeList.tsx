import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { UptimeBar, type UptimeDay } from '@winterop-com/sokkel-ui/UptimeBar'

import type { Service, ServiceId } from '../data'
import type { Health } from '../status'
import type { UptimeByService } from './uptime'

/**
 * Each service over its last ninety days: its name and what it is, its state now, and a bar a day
 * under them. Pressing a day calls `onDay`, such as to open that day's incidents.
 */
export function UptimeList({
    services,
    health,
    uptime,
    describe = true,
    onDay,
}: {
    services: readonly Service[]
    health: Record<ServiceId, Health>
    uptime: UptimeByService
    /** Whether each service's line under its name says what it is. */
    describe?: boolean
    onDay?: (service: Service, day: UptimeDay) => void
}) {
    return (
        <Stack gap="xl">
            {services.map((service) => (
                <Stack key={service.id} gap="xs">
                    <Row justify="between" gap="md">
                        <Row gap="sm" className="min-w-0">
                            <span className="font-medium">{service.id}</span>
                            {describe && <MetaLine items={[service.description]} truncate />}
                        </Row>
                        <StatusChip status={health[service.id]} />
                    </Row>
                    <UptimeBar
                        label={`${service.id}, the last 90 days`}
                        days={uptime[service.id]}
                        onSelect={onDay === undefined ? undefined : (day) => onDay(service, day)}
                    />
                </Stack>
            ))}
        </Stack>
    )
}
