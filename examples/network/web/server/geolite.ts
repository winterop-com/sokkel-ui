/**
 * GeoLite2 City read on this machine: where an address is, as a city and its country, from the
 * `.mmdb` file `scripts/geolite.sh` downloads. It runs in Node only (the dev and preview servers,
 * and the Electron shell's main process), so the file never reaches a page. The file is read when
 * first asked, and again whenever it changes on disk, so a fresh download is picked up as it lands.
 */

import { readFileSync, statSync } from 'node:fs'
import { basename } from 'node:path'

import { Reader, type CityResponse } from 'mmdb-lib'

/** Where an address is, as GeoLite2 places it. */
export interface GeolitePlace {
    lon: number
    lat: number
    /** "City, Country", or the country alone when it names no city. */
    label: string
    /** The country's name, or the continent's when it names no country. */
    country: string
    /** How far off the position may be, in kilometers, as GeoLite2 says it. */
    radius?: number
}

/** Whether the file is there to read, and what it is. */
export interface GeoliteStatus {
    available: boolean
    /** The file's name. */
    file: string
    /** The database's type, such as `GeoLite2-City`. */
    database?: string
    /** When MaxMind built it, as a date `YYYY-MM-DD`. */
    built?: string
    /** Why it cannot be read, when it is there but unreadable. */
    problem?: string
}

export interface Geolite {
    status(): GeoliteStatus
    /** Each address it can place, by the address as asked. */
    locate(addresses: readonly unknown[]): Record<string, GeolitePlace>
}

/** The most addresses one call places. */
export const MOST_ADDRESSES = 4096

/** What an address may be written with; anything else is never handed to the reader. */
const ADDRESS = /^[0-9a-fA-F:.]{2,45}$/

/** A reader of the file at `path`, opened lazily and again when the file changes. */
export function openGeolite(path: string): Geolite {
    let reader: Reader<CityResponse> | undefined
    let readAt = -1
    let problem: string | undefined

    const open = (): Reader<CityResponse> | undefined => {
        let modified: number
        try {
            modified = statSync(path).mtimeMs
        } catch {
            reader = undefined
            readAt = -1
            problem = undefined
            return undefined
        }
        if (modified === readAt) return reader
        readAt = modified
        try {
            reader = new Reader<CityResponse>(readFileSync(path))
            problem = undefined
        } catch (error) {
            reader = undefined
            problem = error instanceof Error ? error.message : 'The file could not be read.'
        }
        return reader
    }

    return {
        status() {
            const found = open()
            const status: GeoliteStatus = { available: found !== undefined, file: basename(path) }
            if (found !== undefined) {
                status.database = found.metadata.databaseType
                status.built = found.metadata.buildEpoch.toISOString().slice(0, 10)
            }
            if (problem !== undefined) status.problem = problem
            return status
        },
        locate(addresses) {
            const found = open()
            const places: Record<string, GeolitePlace> = {}
            if (found === undefined) return places
            for (const address of addresses.slice(0, MOST_ADDRESSES)) {
                if (typeof address !== 'string' || !ADDRESS.test(address)) continue
                let answer: CityResponse | null
                try {
                    answer = found.get(address)
                } catch {
                    continue
                }
                const where = answer?.location
                if (answer === null || where?.longitude === undefined || where.latitude === undefined) continue
                const city = answer.city?.names.en
                const country = answer.country?.names.en ?? answer.registered_country?.names.en ?? answer.continent?.names.en ?? 'Unknown'
                const place: GeolitePlace = {
                    lon: where.longitude,
                    lat: where.latitude,
                    label: city === undefined ? country : `${city}, ${country}`,
                    country,
                }
                if (where.accuracy_radius !== undefined) place.radius = where.accuracy_radius
                places[address] = place
            }
            return places
        },
    }
}
