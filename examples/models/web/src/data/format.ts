/** How the app writes sizes, counts, contexts and times. */

const GB = 1_000_000_000
const MB = 1_000_000

/** Bytes in decimal units, as disks are sold: `4.37 GB`, `512 MB`. */
export function bytes(value: number): string {
    if (value >= 1000 * GB) return `${(value / (1000 * GB)).toFixed(2)} TB`
    if (value >= GB) return `${(value / GB).toFixed(value >= 100 * GB ? 0 : value >= 10 * GB ? 1 : 2)} GB`
    if (value >= MB) return `${(value / MB).toFixed(value >= 100 * MB ? 0 : 1)} MB`
    if (value >= 1000) return `${(value / 1000).toFixed(0)} KB`
    return `${String(value)} B`
}

/** A rate of bytes a second: `84.2 MB/s`. */
export function speed(value: number): string {
    return `${bytes(value)}/s`
}

/** Tokens of context, as the cards say: `128K`, `8K`. */
export function context(tokens: number): string {
    return tokens >= 1024 ? `${String(Math.round(tokens / 1024))}K` : String(tokens)
}

/** Billions of parameters: `7B`, `1.5B`, `0.5B`. */
export function params(billions: number): string {
    return `${billions >= 10 ? String(Math.round(billions)) : String(Number(billions.toFixed(1)))}B`
}

/** A count with its noun: `1 model`, `12 models`. */
export function counted(count: number, noun: string, plural = `${noun}s`): string {
    return `${count.toLocaleString('en-US')} ${count === 1 ? noun : plural}`
}

/** Seconds left as a person says them: `12 s`, `3 min 20 s`, `1 h 4 min`. */
export function remaining(seconds: number): string {
    if (!Number.isFinite(seconds)) return 'unknown'
    const whole = Math.max(0, Math.round(seconds))
    if (whole < 60) return `${String(whole)} s`
    const minutes = Math.floor(whole / 60)
    if (minutes < 60) return `${String(minutes)} min ${String(whole % 60)} s`
    return `${String(Math.floor(minutes / 60))} h ${String(minutes % 60)} min`
}

/** A day as the tables write it: `Nov 3, 2026`. */
export function day(time: number): string {
    return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** A time of day: `14:05`. */
export function clock(time: number): string {
    return new Date(time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** A time of day with seconds, for the runner's log: `14:05:12`. */
export function clockSeconds(time: number): string {
    return new Date(time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** How long something has run: `3 min`, `2 h 10 min`, `4 days`. */
export function uptime(ms: number): string {
    const minutes = Math.floor(ms / 60_000)
    if (minutes < 1) return 'under a minute'
    if (minutes < 60) return `${String(minutes)} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${String(hours)} h ${String(minutes % 60)} min`
    return counted(Math.floor(hours / 24), 'day')
}

export { GB, MB }
