/** A time of day to the second, in UTC or the browser's own zone, with the zone said when it is UTC. */
export function formatTime(at: number, timeZone: string | undefined): string {
    const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone }).format(at)
    return timeZone === 'UTC' ? `${time} UTC` : time
}
