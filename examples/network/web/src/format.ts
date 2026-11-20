/** How the watch writes bytes, rates, endpoints and times. */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/** Bytes in decimal units: 950 B, 12.4 KB, 3.1 MB. */
export function formatBytes(bytes: number): string {
    let value = bytes
    let unit = 0
    while (Math.abs(value) >= 1000 && unit < UNITS.length - 1) {
        value /= 1000
        unit += 1
    }
    const digits = unit === 0 || value >= 100 ? 0 : 1
    return `${value.toFixed(digits)} ${UNITS[unit]}`
}

/** Bytes a second: 12.4 KB/s. */
export const formatRate = (bytes: number): string => `${formatBytes(bytes)}/s`

/** An address and a port as one end of a connection: 203.0.113.10:443, [2001:db8::5]:443. */
export function endpoint(address: string, port: number): string {
    const host = address.includes(':') ? `[${address}]` : address
    return `${host}:${String(port)}`
}

/** A clock time with seconds, on the browser's clock. */
export function clock(at: number): string {
    return new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** A clock time, with the day when it is not today. */
export function moment(at: number, now = Date.now()): string {
    const today = new Date(at).toDateString() === new Date(now).toDateString()
    return today ? clock(at) : new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
