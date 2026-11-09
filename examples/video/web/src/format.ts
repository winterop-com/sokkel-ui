/** How the site writes its numbers and ages. */

const SHORT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/** A count written short: 52.4K, 1.2M. */
export const short = (count: number) => SHORT.format(count)

export const plural = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`

/** How many watched it, written short: `52.4K views`. */
export const viewsOf = (count: number) => `${short(count)} ${count === 1 ? 'view' : 'views'}`

/** How long ago something was put up, from the days since: `3 days ago`, `2 months ago`. */
export function daysAgo(days: number): string {
    if (days < 1) return 'today'
    if (days < 2) return 'yesterday'
    if (days < 14) return `${String(Math.floor(days))} days ago`
    if (days < 60) return `${String(Math.floor(days / 7))} weeks ago`
    if (days < 365) return `${String(Math.floor(days / 30))} months ago`
    const years = Math.floor(days / 365)
    return years === 1 ? '1 year ago' : `${String(years)} years ago`
}

/** A size in bytes, written short: `4.8 MB`. */
export function bytesOf(bytes: number): string {
    if (bytes < 1024) return `${String(bytes)} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** A bitrate, written short: `850 kbps`, `1.6 Mbps`. */
export function bitrateOf(bits: number): string {
    return bits >= 1_000_000 ? `${(bits / 1_000_000).toFixed(1)} Mbps` : `${String(Math.round(bits / 1000))} kbps`
}

/** A second of a video as a site writes it in a link: `1:05`. */
export function clockOf(seconds: number): string {
    const whole = Math.floor(seconds)
    return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, '0')}`
}
