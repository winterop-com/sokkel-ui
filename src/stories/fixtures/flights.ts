import type { ReadsbAircraft, ReadsbResponse } from '@winterop-com/sokkel-ui-tracking/adsb'

/** The moment Tidevann's flight watch is drawn at, so every freshness is the same each time. */
export const FLIGHTS_NOW = Date.parse('2026-11-20T14:30:00Z')

/** One aircraft as readsb's v2 API writes it, from the few values that differ between them. */
function aircraft(
    hex: string,
    flight: string | undefined,
    type: string,
    [lat, lon]: [number, number],
    altitude: number | 'ground',
    speed: number,
    track: number,
    rate: number,
    seen = 0.4,
): ReadsbAircraft {
    return {
        hex,
        type: 'adsb_icao',
        ...(flight === undefined ? {} : { flight: flight.padEnd(8, ' ') }),
        t: type,
        alt_baro: altitude,
        gs: speed,
        track,
        baro_rate: rate,
        squawk: flight === undefined ? '7000' : '2000',
        category: type === 'C172' || type === 'PA28' ? 'A1' : 'A3',
        lat,
        lon,
        seen_pos: seen,
        seen: seen,
        messages: 1200,
    }
}

/**
 * Tidevann's flights over southern Norway and the North Sea at the watch's now, as the readsb v2
 * `/v2/point` endpoint answers: climbing out of Oslo, Bergen and Stavanger, cruising between them
 * and the cities across the sea, descending to land, two on the ground and two light aircraft with
 * no callsign. The callsigns are fictional; the places are plain geography.
 */
export const FLIGHTS_POINT: ReadsbResponse = {
    now: FLIGHTS_NOW,
    msg: 'No error',
    ac: [
        aircraft('f07a01', 'TDV101', 'B738', [60.42, 9.6], 36_000, 452, 271, 0),
        aircraft('f07a02', 'TDV214', 'A20N', [59.62, 6.1], 34_000, 441, 92, 64),
        aircraft('f07a03', 'TDV305', 'E190', [60.05, 10.7], 9_400, 288, 238, 2_100),
        aircraft('f07a04', 'TDV318', 'B738', [58.98, 5.9], 6_800, 262, 196, -1_600),
        aircraft('f07a05', 'TDV422', 'A20N', [58.2, 3.4], 37_000, 470, 228, 0),
        aircraft('f07a06', 'TDV433', 'B38M', [57.75, 1.4], 24_000, 405, 61, 1_400),
        aircraft('f07a07', 'TDV517', 'AT76', [62.1, 6.7], 17_000, 268, 38, 0),
        aircraft('f07a08', 'TDV526', 'DH8D', [61.02, 5.5], 12_600, 300, 4, -1_200),
        aircraft('f07a09', 'TDV640', 'B738', [56.9, 10.9], 38_000, 458, 34, 0),
        aircraft('f07a0a', 'TDV655', 'A20N', [58.35, 8.6], 15_200, 330, 52, -1_900),
        aircraft('f07a0b', 'TDV702', 'E195', [59.25, 11.6], 29_000, 430, 278, 1_000),
        aircraft('f07a0c', 'TDV811', 'B738', [60.19, 11.1], 'ground', 14, 12, 0, 1.2),
        aircraft('f07a0d', 'TDV834', 'DH8D', [60.29, 5.22], 'ground', 0, 170, 0, 4),
        aircraft('f07a0e', undefined, 'C172', [59.42, 10.2], 2_500, 98, 145, 0, 2),
        aircraft('f07a0f', undefined, 'PA28', [58.95, 5.75], 1_800, 92, 300, 200, 6),
        aircraft('f07a10', 'TDV903', 'B738', [55.9, 4.2], 35_000, 448, 12, 0, 12),
    ],
}
