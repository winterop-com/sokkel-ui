/**
 * Simulated satellites: a station and a handful of satellites in low and middle orbits, as the OMM
 * elements a catalog publishes them in, in CSV (`parseOmmCsv`), and the station's position as a
 * position service answers with it (`parseStationPosition`). The elements are fixed, measured at one
 * epoch, so where each satellite is follows from the moment alone, as it does for a real one.
 */
import { parseOmmCsv, satellitePosition, STATION_ID, type Satellite, type StationPosition } from '../orbits'

/** When the simulated elements were measured: midnight UTC on 20 November 2026. */
export const ORBIT_EPOCH = Date.parse('2026-11-20T00:00:00Z')

/**
 * One simulated satellite: its name, catalog number, designator, revolutions a day, eccentricity,
 * and in degrees its inclination, ascending node, argument of pericenter and mean anomaly.
 */
type Orbit = readonly [
    name: string,
    id: number,
    designator: string,
    motion: number,
    eccentricity: number,
    inclination: number,
    node: number,
    pericenter: number,
    anomaly: number,
]

const ORBITS: readonly Orbit[] = [
    ['STATION', Number(STATION_ID), '1998-067A', 15.4958, 0.0004, 51.63, 212.4, 78.1, 14.6],
    ['HARBOR 1', 90001, '2024-011A', 14.8102, 0.0011, 97.6, 31.2, 120.4, 201.3],
    ['HARBOR 2', 90002, '2024-011B', 14.8102, 0.0011, 97.6, 31.2, 120.4, 21.3],
    ['JUNIPER 1', 90003, '2025-043A', 15.0611, 0.0007, 53.1, 118.9, 44.0, 300.2],
    ['JUNIPER 2', 90004, '2025-043B', 15.0611, 0.0007, 53.1, 238.9, 44.0, 96.7],
    ['JUNIPER 3', 90005, '2025-043C', 15.0611, 0.0007, 53.1, 358.9, 44.0, 187.5],
    ['LARKSPUR 1', 90006, '2023-077A', 14.2204, 0.0013, 86.4, 75.5, 250.3, 132.8],
    ['LARKSPUR 2', 90007, '2023-077B', 14.2204, 0.0013, 86.4, 165.5, 250.3, 262.8],
    ['SOUNDER', 90008, '2022-105A', 14.5712, 0.0009, 98.7, 300.1, 199.0, 55.4],
    ['BEACON 4', 90009, '2021-030D', 2.0056, 0.0061, 55.2, 143.7, 12.9, 271.0],
    ['BEACON 7', 90010, '2021-030G', 2.0056, 0.0048, 55.2, 263.7, 301.4, 88.1],
    ['RELAY', 90011, '2020-064A', 1.0027, 0.0002, 0.04, 88.0, 180.0, 142.6],
]

const FIELDS =
    'OBJECT_NAME,OBJECT_ID,EPOCH,MEAN_MOTION,ECCENTRICITY,INCLINATION,RA_OF_ASC_NODE,ARG_OF_PERICENTER,MEAN_ANOMALY,EPHEMERIS_TYPE,CLASSIFICATION_TYPE,NORAD_CAT_ID,ELEMENT_SET_NO,REV_AT_EPOCH,BSTAR,MEAN_MOTION_DOT,MEAN_MOTION_DDOT'

/**
 * The simulated catalog as OMM in CSV, the form a catalog asks its readers to take: a line of field
 * names, then a line for each satellite, the station first.
 */
export function simulateOmmCsv(): string {
    const epoch = new Date(ORBIT_EPOCH).toISOString().replace('Z', '000')
    const lines = ORBITS.map(([name, id, designator, motion, eccentricity, inclination, node, pericenter, anomaly]) =>
        [
            name,
            designator,
            epoch,
            motion,
            eccentricity,
            inclination,
            node,
            pericenter,
            anomaly,
            0,
            'U',
            id,
            999,
            1000 + (id % 9000),
            0.0001,
            0.00001,
            0,
        ].join(','),
    )
    return [FIELDS, ...lines].join('\r\n')
}

let station: Satellite | undefined

/**
 * Where the simulated station is at a moment, in milliseconds since the epoch, as a position service
 * answers: the point under it, its height in kilometers and its speed in kilometers an hour.
 */
export function simulateStation(at: number): StationPosition {
    station ??= parseOmmCsv(simulateOmmCsv())[0]
    const here = satellitePosition(station, at)
    const base: StationPosition = { name: 'station', id: Number(STATION_ID), units: 'kilometers', timestamp: Math.floor(at / 1000) }
    if (here === undefined) return base
    return {
        ...base,
        latitude: Math.round(here.lat * 1e6) / 1e6,
        longitude: Math.round(here.lon * 1e6) / 1e6,
        altitude: Math.round(here.altitude) / 1000,
        velocity: Math.round(here.velocity * 3.6 * 100) / 100,
        visibility: 'daylight',
    }
}
