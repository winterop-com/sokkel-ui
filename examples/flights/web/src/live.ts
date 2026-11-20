/**
 * The live feed: adsb.lol's public API, read through the Electron shell. adsb.lol answers without
 * CORS headers, so a page in a browser (or in Tauri's webview) may send the request but never read
 * the answer; the Electron shell's main process fetches it instead and hands the page the JSON, and
 * only there is live offered.
 */

/** What the Electron shell's preload hands the page for the live feed. */
interface LiveBridge {
    point: (lat: number, lon: number, radius: number) => Promise<LiveAnswer>
}

/** The shell's answer: the API's JSON and how many requests its limit has left, or why it failed. */
export type LiveAnswer = { ok: true; body: unknown; remaining?: number } | { ok: false; error: string }

const bridge = () => (window as unknown as { tidevannFlights?: LiveBridge }).tidevannFlights

/** Whether this window can read the live feed: only inside the Electron shell. */
export const liveAvailable = (): boolean => bridge() !== undefined

/** The API, its license, and the words its terms ask a page showing its data to carry. */
export const ADSB_LOL = 'https://adsb.lol'
export const ODBL = 'https://opendatacommons.org/licenses/odbl/1-0/'

/** Why live is not offered here, said where it would be chosen. */
export const LIVE_UNAVAILABLE =
    'Live needs the Electron app. adsb.lol sends no CORS headers, so a page in a browser cannot read its answers; the Electron shell fetches them for the page.'

/** The widest circle the API answers for, in nautical miles. */
export const MAX_RADIUS = 250

/** The aircraft within `radius` nautical miles of a point, as readsb's v2 `/v2/point` answers, through the shell. */
export async function fetchPoint(lat: number, lon: number, radius: number): Promise<LiveAnswer> {
    const live = bridge()
    if (live === undefined) return { ok: false, error: LIVE_UNAVAILABLE }
    try {
        return await live.point(lat, lon, Math.max(1, Math.min(MAX_RADIUS, Math.round(radius))))
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
}
