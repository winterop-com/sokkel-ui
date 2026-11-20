/**
 * The built-in lookup, used when no GeoLite2 file is there: the tracking add-on's simulated hosts,
 * addresses on the documentation networks (203.0.113.0/24, 198.51.100.0/24, 192.0.2.0/24 and
 * 2001:db8::/32), which name no real host, each placed in a plain city. The simulation draws its
 * hosts from them, so the map is the same on every machine.
 */

import { networkHosts, networkPlace } from '@winterop-com/sokkel-ui-tracking/simulate'

/** Where an address is: its position, what the map writes for it, and its country. */
export interface Place {
    lon: number
    lat: number
    label: string
    country: string
    /** How far off the position may be, in kilometers, when the lookup says. */
    radius?: number
}

/** Where a documentation address is placed, or undefined for any other address. */
export const builtinPlace = (address: string): Place | undefined => networkPlace(address)

/** The hosts the simulation draws on when there is no GeoLite2 file: documentation addresses only. */
export const builtinHosts = (): { common: string[]; rare: string[] } => networkHosts()
