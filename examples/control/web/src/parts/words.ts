import { Activity, CloudLightning, Network, Orbit, Plane, Satellite, Server, Ship, TriangleAlert, type LucideIcon } from 'lucide-react'

/** The icon each source is drawn with, by its id. */
export const SOURCE_ICONS: Record<string, LucideIcon | undefined> = {
    quakes: Activity,
    disasters: TriangleAlert,
    warnings: CloudLightning,
    vessels: Ship,
    flights: Plane,
    satellites: Satellite,
    station: Orbit,
    server: Server,
    machine: Network,
}

/** What each kind of source gives, as a tile's caption says it. */
export const SOURCE_KINDS: Record<string, string | undefined> = {
    incidents: 'Incidents',
    tracks: 'Tracks',
    server: 'Server health',
    links: 'Connections',
}

/** How a source's data reaches the site, as a list says it. */
export const MODE_WORDS = { live: 'Live', simulated: 'Simulated', off: 'Off' } as const
