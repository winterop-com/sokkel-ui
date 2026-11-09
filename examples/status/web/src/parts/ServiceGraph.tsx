import { GraphCanvas } from '@winterop-com/sokkel-ui-graph/GraphCanvas'
import { type GraphItem, type GraphLink, useNodeGraph } from '@winterop-com/sokkel-ui-graph/use-node-graph'
import { Database, Server } from 'lucide-react'
import { useMemo } from 'react'

import { type ServiceId, SERVICES } from '../data'
import type { Health } from '../status'

const LINKS: GraphLink[] = SERVICES.flatMap((service) =>
    service.dependsOn.map((dependency) => ({ source: service.id, target: dependency, arrow: true })),
)

/**
 * Every service and what it calls on, each in its state now, the chosen one marked: a service at
 * the left calls on those to its right. A store is drawn round with a cylinder, a service as a box.
 */
export function ServiceGraph({
    health,
    selected,
    onSelect,
    className,
}: {
    health: Record<ServiceId, Health>
    selected: ServiceId
    onSelect: (id: ServiceId) => void
    className?: string
}) {
    // The nodes change only when a state does, so the graph is not laid out again every reading.
    const signature = SERVICES.map((service) => health[service.id]).join(' ')
    const items = useMemo<GraphItem[]>(() => {
        const states = signature.split(' ')
        return SERVICES.map((service, index) => ({
            id: service.id,
            data: {
                code: service.id,
                kind: service.store ? 'store' : 'service',
                status: states[index] ?? 'operational',
                icon: service.store ? Database : Server,
                shape: service.store ? 'round' : 'box',
            },
        }))
    }, [signature])
    const graph = useNodeGraph(items, LINKS, { direction: 'right', selected })
    return (
        <GraphCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            settled={graph.settled}
            direction="right"
            frame="fitted"
            onSelect={(id) => {
                if (id !== null) onSelect(id as ServiceId)
            }}
            words={{ label: 'Services and what they call on' }}
            className={className}
        />
    )
}
