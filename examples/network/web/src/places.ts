/**
 * The built-in lookup, used when no GeoLite2 file is there: the documentation networks
 * (203.0.113.0/24, 198.51.100.0/24, 192.0.2.0/24 and 2001:db8::/32), which name no real host, each
 * placed in a plain city. The simulation draws its hosts from them, so the map is the same on every
 * machine.
 */

import { normalizeAddress } from '@winterop-com/sokkel-ui-tracking/network'

/** Where an address is: its position, what the map writes for it, and its country. */
export interface Place {
    lon: number
    lat: number
    label: string
    country: string
    /** How far off the position may be, in kilometers, when the lookup says. */
    radius?: number
}

type City = [city: string, country: string, lon: number, lat: number]

/** Where the common hosts are: the cities data centers and offices gather in. */
const CITIES: readonly City[] = [
    ['Frankfurt', 'Germany', 8.68, 50.11],
    ['Amsterdam', 'Netherlands', 4.9, 52.37],
    ['London', 'United Kingdom', -0.13, 51.51],
    ['Dublin', 'Ireland', -6.26, 53.35],
    ['Stockholm', 'Sweden', 18.07, 59.33],
    ['Paris', 'France', 2.35, 48.86],
    ['Ashburn', 'United States', -77.49, 39.04],
    ['New York', 'United States', -74.01, 40.71],
    ['Chicago', 'United States', -87.63, 41.88],
    ['Dallas', 'United States', -96.8, 32.78],
    ['San Jose', 'United States', -121.89, 37.34],
    ['Seattle', 'United States', -122.33, 47.61],
    ['Toronto', 'Canada', -79.38, 43.65],
    ['Oslo', 'Norway', 10.75, 59.91],
    ['Copenhagen', 'Denmark', 12.57, 55.68],
    ['Helsinki', 'Finland', 24.94, 60.17],
    ['Warsaw', 'Poland', 21.01, 52.23],
    ['Madrid', 'Spain', -3.7, 40.42],
    ['Milan', 'Italy', 9.19, 45.46],
    ['Zurich', 'Switzerland', 8.54, 47.38],
    ['Tokyo', 'Japan', 139.69, 35.69],
    ['Singapore', 'Singapore', 103.82, 1.35],
    ['Sydney', 'Australia', 151.21, -33.87],
    ['São Paulo', 'Brazil', -46.63, -23.55],
    ['Mumbai', 'India', 72.88, 19.08],
    ['Seoul', 'South Korea', 126.98, 37.57],
]

/** Where the rare hosts are, reached by nothing but a process new to the machine. */
const RARE: readonly City[] = [
    ['Reykjavik', 'Iceland', -21.94, 64.15],
    ['Nairobi', 'Kenya', 36.82, -1.29],
    ['Santiago', 'Chile', -70.67, -33.45],
    ['Auckland', 'New Zealand', 174.76, -36.85],
]

const place = ([city, country, lon, lat]: City): Place => ({ lon, lat, label: `${city}, ${country}`, country })

/** Where a documentation address is placed, or undefined for any other address. */
export function builtinPlace(address: string): Place | undefined {
    const plain = normalizeAddress(address)
    const four = /^(203\.0\.113|198\.51\.100|192\.0\.2)\.(\d{1,3})$/.exec(plain)
    if (four !== null) {
        const host = Number(four[2])
        if (host > 255) return undefined
        if (four[1] === '203.0.113') return place(CITIES[host % CITIES.length])
        if (four[1] === '198.51.100') return place(CITIES[(host * 7 + 3) % CITIES.length])
        return place(RARE[host % RARE.length])
    }
    if (plain.startsWith('2001:db8:')) {
        const last = parseInt(plain.split(':').pop() ?? '0', 16)
        return Number.isNaN(last) ? undefined : place(CITIES[(last * 5 + 1) % CITIES.length])
    }
    return undefined
}

/** The hosts the simulation draws on when there is no GeoLite2 file: documentation addresses only. */
export function builtinHosts(): { common: string[]; rare: string[] } {
    const common = [
        ...Array.from({ length: 60 }, (_, index) => `203.0.113.${String(index + 10)}`),
        ...Array.from({ length: 30 }, (_, index) => `198.51.100.${String(index + 20)}`),
        ...Array.from({ length: 8 }, (_, index) => `2001:db8:4::${(index + 1).toString(16)}`),
    ]
    const rare = Array.from({ length: RARE.length }, (_, index) => `192.0.2.${String(200 + index)}`)
    return { common, rare }
}
