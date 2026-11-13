import type { DashboardLayoutItem } from '@winterop-com/sokkel-ui/dashboard/DashboardArrange'
import { createStore, useStore } from '@winterop-com/sokkel-ui/hooks/use-store'

import { SERVICE_IDS, SERVICE_BY_ID, type Service, type ServiceId } from './data'

/** How the person arranged the board: the overview's panels and the services in their order, each null for the default. */
export interface Layout {
    overview: DashboardLayoutItem[] | null
    services: ServiceId[] | null
}

/** The board's arrangement, kept in this browser and shared by every page. */
export const layout = createStore<Layout>(
    { overview: null, services: null },
    { key: 'layout', prefix: 'tidevann-status.', check: (value) => typeof value === 'object' && value !== null && 'overview' in value },
)

export function setLayout(patch: Partial<Layout>): void {
    layout.update((current) => ({ ...current, ...patch }))
}

/** Every service in the person's order: those they placed first, any they never placed after in the board's own order. */
export function useServiceOrder(): Service[] {
    const placed = (useStore(layout).services ?? []).filter((id) => SERVICE_IDS.includes(id))
    return [...placed, ...SERVICE_IDS.filter((id) => !placed.includes(id))].map((id) => SERVICE_BY_ID[id])
}
