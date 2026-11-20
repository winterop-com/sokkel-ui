/**
 * The picture the watch sees at a moment, read as an app reads its feeds: the vessels' reports
 * written as AIS sentences and decoded by the tracking add-on's `createAisDecoder`, the aircraft
 * written as a readsb-shaped answer and read by its `parseFlights`, and the radars where they stand.
 * A picture is read afresh from the reports of the minutes before the moment, so a moment played
 * back reads the same as it did live.
 */
import { parseFlights, type ReadsbAircraft } from '@winterop-com/sokkel-ui-tracking/adsb'
import { createAisDecoder } from '@winterop-com/sokkel-ui-tracking/ais'
import type { LonLat, Track, TrackAffiliation } from '@winterop-com/sokkel-ui-tracking/track'

import { positionSentence, staticSentences } from './nmea'
import { contactsBetween, lastHeard, MINUTE, scheduledAffiliation, type Contact } from './world'

/** How far apart the reports a trail is drawn from are. */
const STEP = 2 * MINUTE

/** How many reports back a trail reaches. */
const TRAIL = 10

/** An affiliation set by a person on watch, from a moment on. */
export interface Judgment {
    track: string
    affiliation: TrackAffiliation
    at: number
}

/** A contact's affiliation at a moment: the last judgment made of it by then, or the classification's. */
export function affiliationAt(contact: Contact, at: number, judgments: readonly Judgment[]): TrackAffiliation {
    let judged: Judgment | undefined
    for (const judgment of judgments) {
        if (judgment.track === contact.id && judgment.at <= at && (judged === undefined || judgment.at >= judged.at)) judged = judgment
    }
    return judged?.affiliation ?? scheduledAffiliation(contact, at)
}

/** The moments a contact reported at, up to `at`: a report every step on the clock's grid, and its last. */
function reportTimes(contact: Contact, at: number): number[] {
    const last = Math.min(at, lastHeard(contact))
    if (last < contact.start) return []
    const times: number[] = []
    const grid = Math.floor(last / STEP) * STEP
    for (let step = TRAIL; step >= 0; step -= 1) {
        const time = grid - step * STEP
        if (time >= contact.start && time < last) times.push(time)
    }
    times.push(last)
    return times
}

/** The readsb-shaped row of an aircraft at a moment. */
function readsbRow(contact: Contact, time: number): ReadsbAircraft {
    const motion = contact.motion(time)
    return {
        hex: contact.hex ?? contact.id,
        flight: `${contact.callsign.padEnd(8, ' ')}`,
        type: 'adsb_icao',
        lat: Math.round(motion.lat * 1e5) / 1e5,
        lon: Math.round(motion.lon * 1e5) / 1e5,
        alt_baro: motion.altitude ?? 0,
        gs: motion.speed,
        track: Math.round(motion.heading * 10) / 10,
        squawk: contact.affiliations.some((step) => step.affiliation === 'hostile') ? '7500' : '2000',
        category: 'A3',
        seen_pos: 0,
    }
}

/** What the picture holds of one track beside the add-on's `Track`. */
export interface Picture {
    at: number
    tracks: Track[]
    /** The contacts the tracks were read from, by track id. */
    contacts: ReadonlyMap<string, Contact>
    /** The AIS sentences the picture was decoded from, the latest last. */
    sentences: readonly string[]
}

/** The watch's picture at a moment under a seed, the judgments made by then applied. */
export function pictureAt(seed: number, at: number, judgments: readonly Judgment[]): Picture {
    const contacts = contactsBetween(seed, at - TRAIL * STEP, at).filter((contact) => contact.start <= at && contact.end > at)
    const byId = new Map(contacts.map((contact) => [contact.id, contact]))
    const classify = (track: Track) => {
        const contact = byId.get(track.id)
        return contact === undefined ? undefined : affiliationAt(contact, at, judgments)
    }

    // Vessels: every report written as the sentences a transponder sends, read back in time order.
    const ais = createAisDecoder({ classify, trail: TRAIL })
    const lines = new Map<number, string[]>()
    const add = (time: number, sentence: readonly string[]) => lines.set(time, [...(lines.get(time) ?? []), ...sentence])
    for (const contact of contacts) {
        if (contact.feed !== 'ais' || contact.mmsi === undefined) continue
        let named = false
        for (const time of reportTimes(contact, at)) {
            if (!named && time >= contact.namedAt) {
                add(
                    time,
                    staticSentences({
                        mmsi: contact.mmsi,
                        callsign: contact.callsign,
                        name: contact.name,
                        shipType: contact.shipType ?? 0,
                        length: contact.length ?? 0,
                        beam: contact.beam ?? 0,
                        draught: contact.draught,
                        destination: contact.destination,
                    }),
                )
                named = true
            }
            const motion = contact.motion(time)
            add(time, [
                positionSentence({
                    mmsi: contact.mmsi,
                    lon: motion.lon,
                    lat: motion.lat,
                    speed: motion.speed,
                    course: motion.heading,
                    heading: Math.round(motion.heading),
                    second: Math.floor(time / 1000) % 60,
                }),
            ])
        }
    }
    const sentences: string[] = []
    for (const time of [...lines.keys()].sort((a, b) => a - b)) {
        const batch = lines.get(time) ?? []
        sentences.push(...batch)
        ais.push(batch.join('\n'), time)
    }

    // Aircraft: one readsb-shaped answer a report, each read with the flights reader.
    const flights = new Map<string, { track: Track; trail: LonLat[] }>()
    const answers = new Map<number, ReadsbAircraft[]>()
    for (const contact of contacts) {
        if (contact.feed !== 'adsb') continue
        for (const time of reportTimes(contact, at)) answers.set(time, [...(answers.get(time) ?? []), readsbRow(contact, time)])
    }
    for (const time of [...answers.keys()].sort((a, b) => a - b)) {
        for (const track of parseFlights({ now: time, ac: answers.get(time) }, { classify })) {
            const was = flights.get(track.id)
            flights.set(track.id, { track, trail: was === undefined ? [] : [...was.trail, [was.track.lon, was.track.lat]] })
        }
    }

    // Radars: where they stand, always heard.
    const radars: Track[] = contacts
        .filter((contact) => contact.feed === 'radar')
        .map((contact) => {
            const motion = contact.motion(at)
            return {
                id: contact.id,
                lon: motion.lon,
                lat: motion.lat,
                kind: 'sensor',
                affiliation: affiliationAt(contact, at, judgments),
                label: contact.name,
                updatedAt: at,
                source: 'radar',
            }
        })

    const tracks = [...ais.tracks(), ...[...flights.values()].map(({ track, trail }) => ({ ...track, trail })), ...radars]
    return { at, tracks, contacts: byId, sentences }
}
