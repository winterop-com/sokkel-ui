/**
 * A simulated coast: three harbors, harbor, juniper and larkspur, the watch's own vessels and
 * aircraft going round their routes, and an endless run of contacts that come, are classified, fall
 * silent and go. Everything follows from the seed and the moment alone, so the same moment of the
 * same seed is the same picture every time, and a moment played back is what it was live.
 *
 * The picture is read as an app reads its feeds: the vessels' reports written as AIS sentences and
 * decoded by `createAisDecoder`, the aircraft written as a readsb-shaped answer and read by
 * `parseFlights`, and the radars where they stand.
 */
import { parseFlights, type ReadsbAircraft } from '../adsb'
import { createAisDecoder } from '../ais'
import { bearing, destination, distance } from '../geo'
import type { LonLat, Track, TrackAffiliation, TrackKind } from '../track'
import { encodeAisPosition, encodeAisStatic } from './nmea'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

/** The moment the coast's routes and contacts are counted from: an evening in November, so a night watch follows. */
export const COAST_EPOCH = Date.parse('2026-11-20T17:00:00Z')

/** The three harbors on the coast. */
export const COAST_HARBORS: Record<'harbor' | 'juniper' | 'larkspur', LonLat> = {
    harbor: [5.27, 60.4],
    juniper: [5.62, 59.0],
    larkspur: [6.05, 62.48],
}

/** The middle of the watched waters: the three harbors and the sea west of them. */
export const COAST_CENTER: LonLat = [4.6, 60.85]

/** Knots in meters per millisecond. */
const KNOT_MS = 1852 / 3600 / 1000

/** Where something is and how it goes at a moment. */
export interface CoastMotion {
    lon: number
    lat: number
    /** Degrees true. */
    heading: number
    /** Knots. */
    speed: number
    /** Feet, for an aircraft. */
    altitude?: number
}

/** One thing the watch hears of: who it is, which feed tells of it, when, and how it moves. */
export interface CoastContact {
    /** The track's id as its feed gives it: the MMSI for a vessel, the ICAO address for an aircraft. */
    id: string
    feed: 'ais' | 'adsb' | 'radar'
    kind: TrackKind
    /** For a vessel. */
    mmsi?: number
    /** For an aircraft. */
    hex?: string
    name: string
    callsign: string
    shipType?: number
    destination?: string
    length?: number
    beam?: number
    draught?: number
    /** When it is first heard. */
    start: number
    /** When it falls silent before it leaves, going stale and then lost; never for most. */
    silent?: number
    /** When it is gone from the picture: out of the area, or long lost. */
    end: number
    /** When a vessel first sends its static data, which names it; before that it is its MMSI. */
    namedAt: number
    /** Its affiliation over time, as the watch's classification gives it, the first from `start`. */
    affiliations: readonly { at: number; affiliation: TrackAffiliation }[]
    motion: (at: number) => CoastMotion
}

/** When a contact last reports: when it falls silent, or when it leaves. */
export const coastLastHeard = (contact: CoastContact): number => contact.silent ?? contact.end

/** A seeded number in [0, 1) for a contact's draw, the same for the same seed, contact and draw. */
function draw(seed: number, index: number, which: number): number {
    let state = (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(index, 0xc2b2ae35) + Math.imul(which, 0x27d4eb2f)) >>> 0
    state = Math.imul(state ^ (state >>> 16), 0x7feb352d) >>> 0
    state = Math.imul(state ^ (state >>> 15), 0x846ca68b) >>> 0
    return ((state ^ (state >>> 16)) >>> 0) / 4294967296
}

/** A loop of waypoints gone round at a steady speed, from a share of the way round. */
function loop(points: readonly LonLat[], knots: number, from = 0, altitude?: number): (at: number) => CoastMotion {
    const legs = points.map((start, index) => {
        const end = points[(index + 1) % points.length]
        return { start, end, meters: distance(start, end) }
    })
    const total = legs.reduce((sum, leg) => sum + leg.meters, 0)
    return (at) => {
        let left = (((from * total + knots * KNOT_MS * (at - COAST_EPOCH)) % total) + total) % total
        for (const leg of legs) {
            if (left <= leg.meters) {
                const way = bearing(leg.start, leg.end)
                const [lon, lat] = destination(leg.start, way, left)
                return { lon, lat, heading: way, speed: knots, altitude }
            }
            left -= leg.meters
        }
        const [lon, lat] = legs[0].start
        return { lon, lat, heading: 0, speed: knots, altitude }
    }
}

/** A straight course from a point at a steady speed, from a moment. */
function course(from: LonLat, way: number, knots: number, start: number, altitude?: number): (at: number) => CoastMotion {
    return (at) => {
        const [lon, lat] = destination(from, way, knots * KNOT_MS * Math.max(0, at - start))
        return { lon, lat, heading: way, speed: knots, altitude }
    }
}

const standing =
    (at: LonLat): ((moment: number) => CoastMotion) =>
    () => ({ lon: at[0], lat: at[1], heading: 0, speed: 0 })

const ALWAYS = { start: -Infinity, end: Infinity, namedAt: -Infinity }

/** The watch's own and the regular traffic: always there, going round their routes. */
const REGULARS: readonly CoastContact[] = [
    {
        ...ALWAYS,
        id: '257100020',
        feed: 'ais',
        kind: 'vessel',
        mmsi: 257100020,
        name: 'PILOT 2',
        callsign: 'LGPT2',
        shipType: 50,
        destination: 'HARBOR',
        length: 18,
        beam: 5,
        draught: 1.8,
        affiliations: [{ at: -Infinity, affiliation: 'friend' }],
        motion: loop(
            [
                [5.05, 60.38],
                [4.75, 60.33],
                [4.7, 60.5],
                [5.0, 60.52],
            ],
            14,
        ),
    },
    {
        ...ALWAYS,
        id: '257100070',
        feed: 'ais',
        kind: 'vessel',
        mmsi: 257100070,
        name: 'PATROL 7',
        callsign: 'LGPA7',
        shipType: 55,
        destination: 'PATROL BOX',
        length: 46,
        beam: 9,
        draught: 3.2,
        affiliations: [{ at: -Infinity, affiliation: 'friend' }],
        motion: loop(
            [
                [4.85, 60.45],
                [5.1, 61.4],
                [5.4, 62.3],
                [5.1, 61.4],
            ],
            22,
            0.1,
        ),
    },
    {
        ...ALWAYS,
        id: '257100031',
        feed: 'ais',
        kind: 'vessel',
        mmsi: 257100031,
        name: 'TUG ADA',
        callsign: 'LGTA3',
        shipType: 52,
        destination: 'JUNIPER',
        length: 28,
        beam: 10,
        draught: 4.1,
        affiliations: [{ at: -Infinity, affiliation: 'friend' }],
        motion: loop(
            [
                [5.35, 59.02],
                [5.15, 59.1],
                [5.25, 59.2],
            ],
            8,
        ),
    },
    {
        ...ALWAYS,
        id: '257200410',
        feed: 'ais',
        kind: 'vessel',
        mmsi: 257200410,
        name: 'FERRY JUNIPER',
        callsign: 'LJFJ4',
        shipType: 60,
        destination: 'HARBOR',
        length: 96,
        beam: 18,
        draught: 4.4,
        affiliations: [{ at: -Infinity, affiliation: 'neutral' }],
        motion: loop(
            [
                [5.15, 59.05],
                [4.8, 59.6],
                [4.8, 60.3],
                [5.0, 60.4],
                [4.8, 60.3],
                [4.8, 59.6],
            ],
            20,
            0.35,
        ),
    },
    {
        ...ALWAYS,
        id: '257300512',
        feed: 'ais',
        kind: 'vessel',
        mmsi: 257300512,
        name: 'CARGO LARKSPUR',
        callsign: 'LKCL5',
        shipType: 70,
        destination: 'LARKSPUR',
        length: 142,
        beam: 22,
        draught: 8.6,
        affiliations: [{ at: -Infinity, affiliation: 'neutral' }],
        motion: loop(
            [
                [5.75, 62.55],
                [4.6, 62.9],
                [3.4, 63.3],
                [4.6, 62.9],
            ],
            12,
            0.15,
        ),
    },
    {
        ...ALWAYS,
        id: '47a1c3',
        feed: 'adsb',
        kind: 'aircraft',
        hex: '47a1c3',
        name: 'SURVEY 1',
        callsign: 'TDV01',
        affiliations: [{ at: -Infinity, affiliation: 'friend' }],
        motion: loop(
            [
                [4.2, 59.6],
                [4.2, 61.6],
                [3.6, 61.6],
                [3.6, 59.6],
            ],
            180,
            0.3,
            4500,
        ),
    },
    {
        ...ALWAYS,
        id: '4b8e12',
        feed: 'adsb',
        kind: 'aircraft',
        hex: '4b8e12',
        name: 'FLIGHT 312',
        callsign: 'FLT312',
        affiliations: [{ at: -Infinity, affiliation: 'neutral' }],
        motion: loop(
            [
                [5.6, 59.1],
                [6.1, 62.4],
            ],
            420,
            0.4,
            31000,
        ),
    },
    {
        ...ALWAYS,
        id: 'radar-harbor',
        feed: 'radar',
        kind: 'sensor',
        name: 'Harbor radar',
        callsign: 'RDR-H',
        affiliations: [{ at: -Infinity, affiliation: 'friend' }],
        motion: standing(COAST_HARBORS.harbor),
    },
    {
        ...ALWAYS,
        id: 'radar-juniper',
        feed: 'radar',
        kind: 'sensor',
        name: 'Juniper radar',
        callsign: 'RDR-J',
        affiliations: [{ at: -Infinity, affiliation: 'friend' }],
        motion: standing(COAST_HARBORS.juniper),
    },
    {
        ...ALWAYS,
        id: 'radar-larkspur',
        feed: 'radar',
        kind: 'sensor',
        name: 'Larkspur radar',
        callsign: 'RDR-L',
        affiliations: [{ at: -Infinity, affiliation: 'friend' }],
        motion: standing(COAST_HARBORS.larkspur),
    },
]

/** How often a new contact comes, on average. */
const GAP = 7 * MINUTE

/** The longest a contact stays, so the contacts of a stretch of time can be found from their indexes. */
const LONGEST = 3 * HOUR

const VESSEL_NAMES = [
    'KITTIWAKE',
    'SHEARWATER',
    'FULMAR',
    'GUILLEMOT',
    'GANNET',
    'PETREL',
    'EIDER',
    'SKUA',
    'CORMORANT',
    'TERN',
    'PUFFIN',
    'MERGANSER',
    'SEA GLASS',
    'DRIFTWOOD',
    'LANTERN ROCK',
    'NEAP TIDE',
    'LONG SWELL',
    'SALT CEDAR',
]

const DESTINATIONS = ['HARBOR', 'JUNIPER', 'LARKSPUR', 'ROTTERDAM', 'ABERDEEN', 'REYKJAVIK', 'FISHING GROUNDS']

/** A ship type for a vessel by its draw: mostly cargo, fishing and passenger, now and then a tanker. */
function shipTypeOf(share: number): number {
    if (share < 0.35) return 70
    if (share < 0.6) return 30
    if (share < 0.78) return 60
    if (share < 0.9) return 80
    return 37
}

/** The affiliation a contact is classified as once it has been heard a while. */
function classOf(share: number): TrackAffiliation {
    if (share < 0.45) return 'neutral'
    if (share < 0.83) return 'unknown'
    if (share < 0.94) return 'hostile'
    return 'friend'
}

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

/** The contacts worked out so far, by seed and number; each is the same however often it is asked for. */
const cache = new Map<string, CoastContact>()

/** The passing contact numbered `index` under `seed`: when it comes, what it is, how it moves and what the watch makes of it. */
export function coastContact(seed: number, index: number): CoastContact {
    const key = `${String(seed)}:${String(index)}`
    const kept = cache.get(key)
    if (kept !== undefined) return kept
    const random = (which: number) => draw(seed, index, which)
    const start = COAST_EPOCH + index * GAP + Math.round(random(0) * GAP * 0.8)
    const aircraft = random(1) < 0.22
    const affiliation = classOf(random(2))
    const affiliations: { at: number; affiliation: TrackAffiliation }[] = [
        { at: start, affiliation: 'pending' },
        { at: start + Math.round((2 + random(3) * 4) * MINUTE), affiliation },
    ]
    let contact: CoastContact
    if (aircraft) {
        // Across the area from its edge, toward the middle give or take thirty degrees.
        const from = destination(COAST_CENTER, random(4) * 360, 260_000)
        const way = (bearing(from, COAST_CENTER) + (random(5) - 0.5) * 60 + 360) % 360
        const knots = 220 + Math.round(random(6) * 24) * 10
        const altitude = 8000 + Math.round(random(7) * 28) * 1000
        const end = start + Math.round(520_000 / (knots * KNOT_MS))
        const number = 100 + Math.floor(random(8) * 900)
        const hex = (0x400000 + Math.floor(random(9) * 0x3fffff)).toString(16)
        contact = {
            id: hex,
            feed: 'adsb',
            kind: 'aircraft',
            hex,
            name: affiliation === 'friend' ? `TDV${String(number)}` : `FLT${String(number)}`,
            callsign: affiliation === 'friend' ? `TDV${String(number)}` : `FLT${String(number)}`,
            start,
            end,
            namedAt: start,
            affiliations,
            motion: course(from, way, knots, start, altitude),
        }
    } else {
        // Out at sea west of the coast, heading south, west or north, so it never runs ashore.
        const from: LonLat = [2.7 + random(4) * 1.9, 59.1 + random(5) * 3.6]
        const way = (160 + random(6) * 220) % 360
        const knots = 6 + Math.round(random(7) * 12)
        const life = (50 + random(8) * 80) * MINUTE
        const quiet = random(10) < 0.3
        const silent = quiet ? start + Math.round(life * (0.35 + random(11) * 0.4)) : undefined
        const mmsi = 257_500_000 + Math.floor(random(9) * 400_000)
        const callsign = `LK${LETTERS[Math.floor(random(12) * LETTERS.length)]}${String(Math.floor(random(13) * 90) + 10)}`
        const shipType = shipTypeOf(random(14))
        contact = {
            id: String(mmsi),
            feed: 'ais',
            kind: 'vessel',
            mmsi,
            name: VESSEL_NAMES[Math.floor(random(15) * VESSEL_NAMES.length)],
            callsign,
            shipType,
            destination: DESTINATIONS[Math.floor(random(16) * DESTINATIONS.length)],
            length: shipType === 30 ? 24 + Math.round(random(17) * 30) : 80 + Math.round(random(17) * 120),
            beam: shipType === 30 ? 7 : 14 + Math.round(random(18) * 14),
            draught: Math.round((3 + random(19) * 7) * 10) / 10,
            start,
            silent,
            end: silent === undefined ? start + Math.round(life) : silent + 20 * MINUTE,
            namedAt: start + Math.round((3 + random(20) * 5) * MINUTE),
            affiliations,
            motion: course(from, way, knots, start),
        }
        // An unknown vessel is now and then made out later: hostile, or harmless after all.
        if (affiliation === 'unknown' && random(21) < 0.55) {
            const at = start + Math.round((coastLastHeard(contact) - start) * (0.3 + random(22) * 0.3))
            affiliations.push({ at, affiliation: random(23) < 0.35 ? 'hostile' : 'neutral' })
        }
    }
    cache.set(key, contact)
    return contact
}

/** Every contact heard of at some moment between `from` and `to`, the regulars first. */
export function coastContacts(seed: number, from: number, to: number): CoastContact[] {
    const first = Math.floor((from - COAST_EPOCH - LONGEST) / GAP)
    const last = Math.ceil((to - COAST_EPOCH) / GAP)
    const passing: CoastContact[] = []
    for (let index = first; index <= last; index += 1) {
        const contact = coastContact(seed, index)
        if (contact.start <= to && contact.end > from) passing.push(contact)
    }
    return [...REGULARS, ...passing]
}

/** An affiliation set by a person on watch, from a moment on. */
export interface CoastJudgment {
    /** The id of the track judged. */
    track: string
    affiliation: TrackAffiliation
    at: number
}

/** A contact's affiliation as the watch's classification has it at a moment. */
function scheduledAffiliation(contact: CoastContact, at: number): TrackAffiliation {
    let found = contact.affiliations[0].affiliation
    for (const step of contact.affiliations) if (step.at <= at) found = step.affiliation
    return found
}

/** A contact's affiliation at a moment: the last judgment made of it by then, or the classification's. */
export function coastAffiliation(contact: CoastContact, at: number, judgments: readonly CoastJudgment[] = []): TrackAffiliation {
    let judged: CoastJudgment | undefined
    for (const judgment of judgments) {
        if (judgment.track === contact.id && judgment.at <= at && (judged === undefined || judgment.at >= judged.at)) judged = judgment
    }
    return judged?.affiliation ?? scheduledAffiliation(contact, at)
}

/** What a contact is called at a moment: its name once it has said it, else its MMSI. */
export function coastName(contact: CoastContact, at: number): string {
    if (contact.feed === 'ais' && at < contact.namedAt) return String(contact.mmsi)
    return contact.name
}

/** Finds a contact by its track id among those of the six hours up to a moment. */
export function findCoastContact(seed: number, id: string, around: number): CoastContact | undefined {
    return coastContacts(seed, around - 6 * HOUR, around).find((contact) => contact.id === id)
}

/** Something the watch saw happen to a contact. */
export interface CoastEvent {
    id: string
    at: number
    kind: 'appeared' | 'named' | 'affiliation' | 'stale' | 'lost' | 'left'
    /** The id of the track it happened to. */
    track: string
    trackKind: TrackKind
    name: string
    affiliation: TrackAffiliation
    /** The affiliation it had before, for a change. */
    was?: TrackAffiliation
}

/** What happened to the contacts between two moments, oldest first: heard, named, classified, gone stale, lost and gone. */
export function coastEvents(seed: number, from: number, to: number): CoastEvent[] {
    const events: CoastEvent[] = []
    for (const contact of coastContacts(seed, from, to)) {
        if (!Number.isFinite(contact.start)) continue
        const add = (at: number, kind: CoastEvent['kind'], was?: TrackAffiliation) => {
            if (at < from || at > to) return
            events.push({
                id: `${contact.id}:${kind}:${String(at)}`,
                at,
                kind,
                track: contact.id,
                trackKind: contact.kind,
                name: coastName(contact, at),
                affiliation: scheduledAffiliation(contact, at),
                was,
            })
        }
        add(contact.start, 'appeared')
        if (contact.feed === 'ais') add(contact.namedAt, 'named')
        for (let step = 1; step < contact.affiliations.length; step += 1) {
            const change = contact.affiliations[step]
            if (change.at < coastLastHeard(contact) + 5 * MINUTE) add(change.at, 'affiliation', contact.affiliations[step - 1].affiliation)
        }
        if (contact.silent !== undefined) {
            add(contact.silent + MINUTE, 'stale')
            add(contact.silent + 5 * MINUTE, 'lost')
        } else add(contact.end, 'left')
    }
    return events.sort((a, b) => a.at - b.at)
}

/** How many contacts were heard in each of `bins` stretches from `from` to `to`. */
export function coastActivity(seed: number, from: number, to: number, bins: number): number[] {
    const width = (to - from) / bins
    const contacts = coastContacts(seed, from, to)
    return Array.from({ length: bins }, (_, bin) => {
        const start = from + bin * width
        const end = start + width
        return contacts.filter((contact) => contact.start < end && coastLastHeard(contact) > start).length
    })
}

/** How far apart the reports a trail is drawn from are. */
const STEP = 2 * MINUTE

/** How many reports back a trail reaches. */
const TRAIL = 10

/** The contacts in the picture at a moment: heard by then and not yet gone. */
function contactsAt(seed: number, at: number): CoastContact[] {
    return coastContacts(seed, at - TRAIL * STEP, at).filter((contact) => contact.start <= at && contact.end > at)
}

/** The moments a contact reported at, up to `at`: a report every step on the clock's grid, and its last. */
function reportTimes(contact: CoastContact, at: number): number[] {
    const last = Math.min(at, coastLastHeard(contact))
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

/** The AIS sentences heard at one moment. */
export interface AisBatch {
    /** When they were heard, in milliseconds since the epoch. */
    at: number
    lines: string[]
}

/** The vessels' reports up to `at` as the sentences their transponders send, by the moment each was sent, oldest first. */
function aisBatches(contacts: readonly CoastContact[], at: number): AisBatch[] {
    const lines = new Map<number, string[]>()
    const add = (time: number, sentences: readonly string[]) => lines.set(time, [...(lines.get(time) ?? []), ...sentences])
    // Each static message takes the next sequence id, so its two fragments are told from another vessel's.
    let sequence = 0
    for (const contact of contacts) {
        if (contact.feed !== 'ais' || contact.mmsi === undefined) continue
        let named = false
        for (const time of reportTimes(contact, at)) {
            if (!named && time >= contact.namedAt) {
                sequence += 1
                add(
                    time,
                    encodeAisStatic(
                        {
                            mmsi: contact.mmsi,
                            callsign: contact.callsign,
                            name: contact.name,
                            shipType: contact.shipType ?? 0,
                            length: contact.length ?? 0,
                            beam: contact.beam ?? 0,
                            draught: contact.draught,
                            destination: contact.destination,
                        },
                        sequence,
                    ),
                )
                named = true
            }
            const motion = contact.motion(time)
            add(time, [
                encodeAisPosition({
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
    return [...lines.keys()].sort((a, b) => a - b).map((time) => ({ at: time, lines: lines.get(time) ?? [] }))
}

/**
 * The coast's AIS feed over the twenty minutes up to a moment: each vessel's position every two
 * minutes and its static data once it names itself, as `!AIVDM` sentences by the moment they were
 * sent, oldest first. Pushed through `createAisDecoder` in that order they give the vessels with
 * their trails.
 */
export function simulateAis(seed: number, at: number): AisBatch[] {
    return aisBatches(contactsAt(seed, at), at)
}

/** The readsb-shaped row of an aircraft at a moment. */
function readsbRow(contact: CoastContact, time: number): ReadsbAircraft {
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

/** The watch's picture of the coast at one moment. */
export interface CoastPicture {
    at: number
    /** The vessels, then the aircraft, then the radars. */
    tracks: Track[]
    /** The contacts the tracks were read from, by track id. */
    contacts: ReadonlyMap<string, CoastContact>
    /** The AIS sentences the vessels were decoded from, the latest last. */
    sentences: readonly string[]
}

/**
 * The watch's picture of the coast at a moment under a seed, with the judgments made by then laid
 * over the classification. It is read afresh from the reports of the minutes before the moment, so
 * a moment played back reads the same as it did live.
 */
export function simulateCoast(seed: number, at: number, judgments: readonly CoastJudgment[] = []): CoastPicture {
    const contacts = contactsAt(seed, at)
    const byId = new Map(contacts.map((contact) => [contact.id, contact]))
    const classify = (track: Track) => {
        const contact = byId.get(track.id)
        return contact === undefined ? undefined : coastAffiliation(contact, at, judgments)
    }

    // Vessels: every report written as the sentences a transponder sends, read back in time order.
    const ais = createAisDecoder({ classify, trail: TRAIL })
    const sentences: string[] = []
    for (const batch of aisBatches(contacts, at)) {
        sentences.push(...batch.lines)
        ais.push(batch.lines.join('\n'), batch.at)
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
                affiliation: coastAffiliation(contact, at, judgments),
                label: contact.name,
                updatedAt: at,
                source: 'radar',
            }
        })

    const tracks = [...ais.tracks(), ...[...flights.values()].map(({ track, trail }) => ({ ...track, trail })), ...radars]
    return { at, tracks, contacts: byId, sentences }
}
