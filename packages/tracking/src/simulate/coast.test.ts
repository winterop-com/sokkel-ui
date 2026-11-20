import { describe, expect, it } from 'vitest'

import { createAisDecoder, decodeAisPayload, parseAisSentence, type AisPosition, type AisStatic } from '../ais'
import { distance } from '../geo'
import {
    COAST_CENTER,
    COAST_EPOCH,
    COAST_HARBORS,
    coastActivity,
    coastAffiliation,
    coastContact,
    coastContacts,
    coastEvents,
    coastLastHeard,
    coastName,
    encodeAisPosition,
    encodeAisStatic,
    findCoastContact,
    simulateAis,
    simulateCoast,
    type CoastContact,
} from '../simulate'
import { FOOT, KNOT } from '../track'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const SEED = 1

/** A picture as text, for telling two apart. */
const written = (seed: number, at: number) => {
    const picture = simulateCoast(seed, at)
    return JSON.stringify({ tracks: picture.tracks, sentences: picture.sentences, contacts: [...picture.contacts.keys()] })
}

/** The first passing contact from a number on that a test holds for. */
function passing(holds: (contact: CoastContact) => boolean, from = 0, seed = SEED): CoastContact {
    for (let index = from; index < from + 500; index += 1) {
        const contact = coastContact(seed, index)
        if (holds(contact)) return contact
    }
    throw new Error('No such contact.')
}

describe('simulateCoast', () => {
    it('gives the same picture for the same seed and moment, however often and in whatever order', () => {
        const moments = [COAST_EPOCH, COAST_EPOCH + 13 * MINUTE + 5000, COAST_EPOCH + 3 * HOUR, COAST_EPOCH - 9 * HOUR]
        const first = moments.map((at) => written(SEED, at))
        const backward = [...moments].reverse().map((at) => written(SEED, at))
        expect(backward.reverse()).toEqual(first)
        expect(moments.map((at) => written(SEED, at))).toEqual(first)
    })

    it('reads a moment played back as it read it live', () => {
        // Live: the picture taken every simulated half minute for an hour. Played back: any of those moments asked for alone.
        const live = new Map<number, string>()
        for (let at = COAST_EPOCH; at <= COAST_EPOCH + HOUR; at += MINUTE / 2) live.set(at, written(SEED, at))
        for (const at of [COAST_EPOCH + 7 * MINUTE, COAST_EPOCH + 41 * MINUTE + MINUTE / 2, COAST_EPOCH + HOUR])
            expect(written(SEED, at)).toBe(live.get(at))
    })

    it('draws other contacts from another seed, round the same regulars', () => {
        const [one, two] = [simulateCoast(1, COAST_EPOCH), simulateCoast(2, COAST_EPOCH)]
        expect([...one.contacts.keys()]).not.toEqual([...two.contacts.keys()])
        for (const id of ['257100020', '257100070', '257100031', '257200410', '257300512', '47a1c3', '4b8e12', 'radar-harbor']) {
            expect(one.contacts.has(id)).toBe(true)
            expect(two.tracks.find((track) => track.id === id)).toEqual(one.tracks.find((track) => track.id === id))
        }
    })

    it('gives the picture the harbor watch has always drawn at its first moment', () => {
        const picture = simulateCoast(SEED, COAST_EPOCH)
        expect(picture.at).toBe(COAST_EPOCH)
        expect(picture.tracks).toHaveLength(21)
        expect(picture.sentences).toHaveLength(179)
        expect(simulateCoast(7, COAST_EPOCH).tracks).toHaveLength(18)
        expect(simulateCoast(SEED, COAST_EPOCH + 3 * HOUR).tracks).toHaveLength(22)
        const pilot = picture.tracks.find((track) => track.id === '257100020')
        expect(pilot).toMatchObject({ kind: 'vessel', affiliation: 'friend', label: 'PILOT 2', source: 'ais', updatedAt: COAST_EPOCH })
        expect(pilot?.speed).toBeCloseTo(14 * KNOT, 6)
        expect(pilot?.properties).toMatchObject({ mmsi: 257100020, callsign: 'LGPT2', shipType: 50, destination: 'HARBOR', class: 'A' })
    })

    it('holds vessels, aircraft and the three radars, each read through its own reader', () => {
        const picture = simulateCoast(SEED, COAST_EPOCH)
        const kinds = picture.tracks.map((track) => track.kind)
        expect(new Set(kinds)).toEqual(new Set(['vessel', 'aircraft', 'sensor']))
        const radars = picture.tracks.filter((track) => track.kind === 'sensor')
        expect(radars.map((track) => track.label)).toEqual(['Harbor radar', 'Juniper radar', 'Larkspur radar'])
        expect(radars.map((track) => [track.lon, track.lat])).toEqual(Object.values(COAST_HARBORS))
        for (const radar of radars) expect(radar).toMatchObject({ affiliation: 'friend', source: 'radar', updatedAt: COAST_EPOCH })
        const survey = picture.tracks.find((track) => track.id === '47a1c3')
        expect(survey).toMatchObject({ kind: 'aircraft', affiliation: 'friend', label: 'TDV01' })
        expect(survey?.altitude).toBeCloseTo(4500 * FOOT, 6)
        expect(survey?.speed).toBeCloseTo(180 * KNOT, 6)
        // Every track is one of the picture's contacts, where that contact is at the moment.
        for (const track of picture.tracks) {
            const contact = picture.contacts.get(track.id)
            expect(contact, track.id).toBeDefined()
            if (contact === undefined) continue
            const motion = contact.motion(Math.min(COAST_EPOCH, coastLastHeard(contact)))
            expect(distance([track.lon, track.lat], [motion.lon, motion.lat])).toBeLessThan(2)
        }
    })

    it('draws each trail from the reports of the twenty minutes before, oldest first', () => {
        const picture = simulateCoast(SEED, COAST_EPOCH)
        const patrol = picture.tracks.find((track) => track.id === '257100070')
        const contact = picture.contacts.get('257100070')
        expect(patrol?.trail).toHaveLength(10)
        patrol?.trail?.forEach((point, index) => {
            const then = contact?.motion(COAST_EPOCH - (10 - index) * 2 * MINUTE)
            expect(distance(point, [then?.lon ?? 0, then?.lat ?? 0])).toBeLessThan(2)
        })
        const flight = picture.tracks.find((track) => track.id === '4b8e12')
        expect(flight?.trail).toHaveLength(10)
        // A trail grows from nothing as a new contact reports, up to its ten points.
        const fresh = passing((each) => each.feed === 'ais' && each.silent === undefined)
        const lengths = [1, 5, 11, 30].map(
            (minutes) =>
                simulateCoast(SEED, fresh.start + minutes * MINUTE).tracks.find((track) => track.id === fresh.id)?.trail?.length ?? 0,
        )
        expect(lengths[0]).toBeLessThanOrEqual(1)
        expect(lengths).toEqual([...lengths].sort((a, b) => a - b))
        expect(lengths[3]).toBe(10)
    })

    it('keeps an aircraft no more trail than a vessel, at a moment off the grid of the reports too', () => {
        for (const offset of [MINUTE, 13 * MINUTE + 5000, 2 * MINUTE]) {
            const picture = simulateCoast(SEED, COAST_EPOCH + offset)
            expect(picture.tracks.find((track) => track.id === '4b8e12')?.trail).toHaveLength(10)
            expect(picture.tracks.find((track) => track.id === '257100070')?.trail).toHaveLength(10)
            for (const track of picture.tracks) expect(track.trail?.length ?? 0, track.id).toBeLessThanOrEqual(10)
        }
    })

    it('lays the judgments made by a moment over the classification, from the moment each was made', () => {
        const judgments = [
            { track: '257100020', affiliation: 'hostile' as const, at: COAST_EPOCH + 10 * MINUTE },
            { track: '257100020', affiliation: 'neutral' as const, at: COAST_EPOCH + 30 * MINUTE },
            { track: 'radar-juniper', affiliation: 'unknown' as const, at: COAST_EPOCH + 10 * MINUTE },
        ]
        const at = (minutes: number, id: string) =>
            simulateCoast(SEED, COAST_EPOCH + minutes * MINUTE, judgments).tracks.find((track) => track.id === id)?.affiliation
        expect(at(9, '257100020')).toBe('friend')
        expect(at(10, '257100020')).toBe('hostile')
        expect(at(29, '257100020')).toBe('hostile')
        expect(at(45, '257100020')).toBe('neutral')
        expect(at(9, 'radar-juniper')).toBe('friend')
        expect(at(20, 'radar-juniper')).toBe('unknown')
        expect(at(20, '257100070')).toBe('friend')
        const pilot = simulateCoast(SEED, COAST_EPOCH).contacts.get('257100020')
        expect(pilot === undefined ? undefined : coastAffiliation(pilot, COAST_EPOCH + HOUR, judgments)).toBe('neutral')
        expect(pilot === undefined ? undefined : coastAffiliation(pilot, COAST_EPOCH + HOUR)).toBe('friend')
    })
})

describe('a passing contact', () => {
    it('is the same contact every time it is asked for, as the watch has always drawn it', () => {
        const contact = coastContact(SEED, 3)
        expect(coastContact(SEED, 3)).toBe(contact)
        expect(contact).toMatchObject({
            id: '257755021',
            feed: 'ais',
            kind: 'vessel',
            mmsi: 257755021,
            name: 'SEA GLASS',
            callsign: 'LKA81',
            shipType: 60,
            destination: 'ABERDEEN',
            length: 146,
            beam: 25,
            draught: 6.4,
            start: 1795195559493,
            silent: 1795199352293,
            end: 1795200552293,
            namedAt: 1795195941418,
            affiliations: [
                { at: 1795195559493, affiliation: 'pending' },
                { at: 1795195768232, affiliation: 'neutral' },
            ],
        })
        const motion = contact.motion(contact.start + 10 * MINUTE)
        expect(motion.lon).toBeCloseTo(3.336708815591578, 9)
        expect(motion.lat).toBeCloseTo(60.14093974457207, 9)
        expect(motion.heading).toBeCloseTo(314.42720713093877, 9)
        expect(motion.speed).toBe(14)
        expect(coastContact(2, 3).id).not.toBe(contact.id)
    })

    it('appears, is named and classified, falls silent, and is gone twenty minutes after', () => {
        const contact = passing((each) => each.feed === 'ais' && each.silent !== undefined && each.namedAt < each.silent)
        const silent = contact.silent ?? 0
        const seen = (at: number) => simulateCoast(SEED, at).tracks.find((track) => track.id === contact.id)
        expect(seen(contact.start - 1)).toBeUndefined()
        // First heard: pending, and known only by its MMSI until it sends its static data.
        expect(seen(contact.start)).toMatchObject({ affiliation: 'pending', label: String(contact.mmsi), updatedAt: contact.start })
        expect(coastName(contact, contact.start)).toBe(String(contact.mmsi))
        const named = seen(contact.namedAt + 2 * MINUTE)
        expect(named?.label).toBe(contact.name)
        expect(named?.properties).toMatchObject({
            callsign: contact.callsign,
            shipType: contact.shipType,
            destination: contact.destination,
        })
        expect(coastName(contact, contact.namedAt)).toBe(contact.name)
        // Classified a few minutes in.
        expect(seen(contact.affiliations[1].at)?.affiliation).toBe(contact.affiliations[1].affiliation)
        // Silent: still in the picture where it was last heard, its time standing still, so it reads stale and then lost.
        const stale = seen(silent + 4 * MINUTE)
        const last = contact.motion(silent)
        expect(stale?.updatedAt).toBe(silent)
        expect(distance([stale?.lon ?? 0, stale?.lat ?? 0], [last.lon, last.lat])).toBeLessThan(2)
        expect(seen(silent + 19 * MINUTE)?.updatedAt).toBe(silent)
        expect(contact.end).toBe(silent + 20 * MINUTE)
        expect(seen(contact.end)).toBeUndefined()
        expect(coastLastHeard(contact)).toBe(silent)
    })

    it('reports until it leaves when it never falls silent', () => {
        const contact = passing((each) => each.feed === 'ais' && each.silent === undefined)
        const before = simulateCoast(SEED, contact.end - 1).tracks.find((track) => track.id === contact.id)
        expect(before?.updatedAt).toBe(contact.end - 1)
        expect(simulateCoast(SEED, contact.end).tracks.find((track) => track.id === contact.id)).toBeUndefined()
        expect(coastLastHeard(contact)).toBe(contact.end)
    })

    it('crosses the area as an aircraft, named from its first report', () => {
        const contact = passing((each) => each.feed === 'adsb')
        const middle = (contact.start + contact.end) / 2
        const track = simulateCoast(SEED, middle).tracks.find((each) => each.id === contact.id)
        const motion = contact.motion(middle)
        expect(track).toMatchObject({ kind: 'aircraft', label: contact.callsign })
        expect(track?.altitude).toBeCloseTo((motion.altitude ?? 0) * FOOT, 6)
        expect(distance([contact.motion(contact.start).lon, contact.motion(contact.start).lat], COAST_CENTER)).toBeCloseTo(260_000, -2)
        expect(distance([motion.lon, motion.lat], COAST_CENTER)).toBeLessThan(140_000)
        expect(coastName(contact, contact.start)).toBe(contact.name)
    })

    it('is found by its track id while it is about, and for six hours after', () => {
        const contact = coastContact(SEED, 3)
        expect(findCoastContact(SEED, contact.id, contact.start + MINUTE)).toBe(contact)
        expect(findCoastContact(SEED, contact.id, contact.end + 5 * HOUR)).toBe(contact)
        expect(findCoastContact(SEED, contact.id, contact.start - MINUTE)).toBeUndefined()
        expect(findCoastContact(SEED, 'radar-harbor', COAST_EPOCH)?.name).toBe('Harbor radar')
        expect(findCoastContact(SEED, 'nothing', COAST_EPOCH)).toBeUndefined()
    })

    it('comes about every seven minutes, on and on, before the epoch as after it', () => {
        for (const from of [COAST_EPOCH - 40 * HOUR, COAST_EPOCH, COAST_EPOCH + 300 * HOUR]) {
            const contacts = coastContacts(SEED, from, from + 7 * HOUR).filter((contact) => Number.isFinite(contact.start))
            const arriving = contacts.filter((contact) => contact.start >= from && contact.start < from + 7 * HOUR)
            expect(arriving).toHaveLength(60)
            for (const contact of arriving) expect(contact.end).toBeGreaterThan(contact.start)
        }
    })
})

describe('simulateAis', () => {
    it('writes real AIS sentences, each with its checksum', () => {
        const batches = simulateAis(SEED, COAST_EPOCH)
        expect(batches.map((batch) => batch.at)).toEqual(batches.map((batch) => batch.at).sort((a, b) => a - b))
        expect(batches.at(-1)?.at).toBe(COAST_EPOCH)
        const lines = batches.flatMap((batch) => batch.lines)
        expect(lines).toEqual(simulateCoast(SEED, COAST_EPOCH).sentences)
        for (const line of lines) {
            expect(line).toMatch(/^!AIVDM,[12],[12],\d?,A,[0-9:;<=>?@A-W`a-w]+,[0-5]\*[0-9A-F]{2}$/)
            expect(parseAisSentence(line), line).toBeDefined()
        }
        // A sentence whose checksum is wrong is not read, so every one above carried the right one.
        expect(parseAisSentence(lines[0].replace(/\*..$/, '*00'))).toBeUndefined()
    })

    it('gives the vessels of the picture when pushed through a decoder in order', () => {
        for (const at of [COAST_EPOCH, COAST_EPOCH + 95 * MINUTE + 12_345]) {
            const decoder = createAisDecoder({ trail: 10 })
            for (const batch of simulateAis(SEED, at)) decoder.push(batch.lines.join('\n'), batch.at)
            const vessels = simulateCoast(SEED, at).tracks.filter((track) => track.kind === 'vessel')
            // The decoder was given no classification, so every vessel it reads is unknown.
            expect(decoder.tracks()).toEqual(vessels.map((track) => ({ ...track, affiliation: 'unknown' })))
            expect(vessels.length).toBeGreaterThan(8)
        }
    })

    it('says each vessel within a meter of where it is, at the speed and heading it has', () => {
        const at = COAST_EPOCH + 50 * MINUTE
        const picture = simulateCoast(SEED, at)
        for (const track of picture.tracks.filter((each) => each.kind === 'vessel')) {
            const contact = picture.contacts.get(track.id)
            if (contact === undefined) throw new Error(`No contact for ${track.id}.`)
            const motion = contact.motion(Math.min(at, coastLastHeard(contact)))
            expect(distance([track.lon, track.lat], [motion.lon, motion.lat])).toBeLessThan(1)
            expect(track.speed).toBeCloseTo(motion.speed * KNOT, 6)
            expect(track.heading).toBe(Math.round(motion.heading) % 360)
        }
    })

    it('sends a vessel its static data once it names itself, in two fragments under a sequence id', () => {
        const contact = passing((each) => each.feed === 'ais' && each.silent === undefined)
        const texts = (at: number) =>
            simulateAis(SEED, at)
                .flatMap((batch) => batch.lines)
                .map((line) => parseAisSentence(line))
        const fragmentsBefore = texts(contact.namedAt - 1).filter((sentence) => sentence?.fragments === 2).length
        const fragmentsAfter = texts(contact.namedAt + 2 * MINUTE).filter((sentence) => sentence?.fragments === 2).length
        expect(fragmentsBefore % 2).toBe(0)
        expect(fragmentsAfter).toBeGreaterThanOrEqual(2)
        for (const sentence of texts(contact.namedAt + 2 * MINUTE)) {
            if (sentence?.fragments === 2) expect(sentence.sequence).toMatch(/^\d$/)
            else expect(sentence?.sequence).toBe('')
        }
    })
})

describe('encodeAisPosition and encodeAisStatic', () => {
    it('write a position the decoder reads back', () => {
        const line = encodeAisPosition({
            mmsi: 257100070,
            lon: -4.81234,
            lat: -60.45678,
            speed: 22.4,
            course: 359.9,
            heading: 5,
            second: 42,
        })
        const sentence = parseAisSentence(line)
        const message = decodeAisPayload(sentence?.payload ?? '', sentence?.fill) as AisPosition
        expect(message.type).toBe(1)
        expect(message.mmsi).toBe(257100070)
        expect(message.lon).toBeCloseTo(-4.81234, 5)
        expect(message.lat).toBeCloseTo(-60.45678, 5)
        expect(message.speed).toBeCloseTo(22.4, 6)
        expect(message.course).toBeCloseTo(359.9, 6)
        expect(message.heading).toBe(5)
        expect(message.second).toBe(42)
        expect(message.status).toBe(0)
    })

    it('leave out a heading that is not known, and hold a speed and a course to what the message can say', () => {
        const line = encodeAisPosition({ mmsi: 1, lon: 5, lat: 60, speed: 400, course: 725, second: 61, status: 5 })
        const sentence = parseAisSentence(line)
        const message = decodeAisPayload(sentence?.payload ?? '', sentence?.fill) as AisPosition
        expect(message.heading).toBeUndefined()
        expect(message.speed).toBeCloseTo(102.2, 6)
        expect(message.course).toBeCloseTo(5, 6)
        expect(message.second).toBe(1)
        expect(message.status).toBe(5)
    })

    it('write a course a hair short of north as north, never as a course not known', () => {
        for (const course of [359.99, 359.96, 719.99, -0.01]) {
            const sentence = parseAisSentence(encodeAisPosition({ mmsi: 1, lon: 5, lat: 60, speed: 10, course, second: 0 }))
            const message = decodeAisPayload(sentence?.payload ?? '', sentence?.fill) as AisPosition
            expect(message.course, String(course)).toBe(0)
        }
        const sentence = parseAisSentence(encodeAisPosition({ mmsi: 1, lon: 5, lat: 60, speed: 10, course: 359.94, second: 0 }))
        expect((decodeAisPayload(sentence?.payload ?? '', sentence?.fill) as AisPosition).course).toBeCloseTo(359.9, 6)
    })

    it('write static data the decoder puts back together', () => {
        const lines = encodeAisStatic(
            {
                mmsi: 257300512,
                imo: 9123456,
                callsign: 'LKCL5',
                name: 'CARGO LARKSPUR',
                shipType: 70,
                length: 142,
                beam: 22,
                draught: 8.6,
                destination: 'LARKSPUR',
            },
            13,
        )
        expect(lines).toHaveLength(2)
        expect(lines.map((line) => parseAisSentence(line)?.sequence)).toEqual(['3', '3'])
        const decoder = createAisDecoder()
        decoder.push(lines.join('\n'), 0)
        decoder.push(encodeAisPosition({ mmsi: 257300512, lon: 5.75, lat: 62.55, speed: 12, course: 290, second: 0 }), 1000)
        const [track] = decoder.tracks()
        expect(track.label).toBe('CARGO LARKSPUR')
        expect(track.properties).toMatchObject({
            mmsi: 257300512,
            imo: 9123456,
            callsign: 'LKCL5',
            shipType: 70,
            length: 142,
            beam: 22,
            draught: 8.6,
            destination: 'LARKSPUR',
        })
        const sentences = lines.map((line) => parseAisSentence(line))
        const message = decodeAisPayload(sentences.map((each) => each?.payload ?? '').join(''), sentences[1]?.fill) as AisStatic
        expect(message.type).toBe(5)
        expect(message.name).toBe('CARGO LARKSPUR')
    })

    it('give the same sentences for the same report', () => {
        const report = { mmsi: 257100020, callsign: 'LGPT2', name: 'PILOT 2', shipType: 50, length: 18, beam: 5 }
        expect(encodeAisStatic(report)).toEqual(encodeAisStatic(report))
        expect(encodeAisStatic(report, 4)).toEqual(encodeAisStatic(report, 14))
        expect(encodeAisStatic(report, 4)).not.toEqual(encodeAisStatic(report, 5))
    })
})

describe('coastEvents', () => {
    it('lists what happened to the contacts of a stretch, oldest first, the same every time', () => {
        const events = coastEvents(SEED, COAST_EPOCH - 6 * HOUR, COAST_EPOCH + 2 * HOUR)
        expect(events).toHaveLength(289)
        expect(coastEvents(7, COAST_EPOCH - 6 * HOUR, COAST_EPOCH + 2 * HOUR)).toHaveLength(294)
        expect(events.map((event) => event.at)).toEqual(events.map((event) => event.at).sort((a, b) => a - b))
        expect(new Set(events.map((event) => event.id)).size).toBe(events.length)
        expect(coastEvents(SEED, COAST_EPOCH - 6 * HOUR, COAST_EPOCH + 2 * HOUR)).toEqual(events)
        for (const event of events) {
            expect(event.at).toBeGreaterThanOrEqual(COAST_EPOCH - 6 * HOUR)
            expect(event.at).toBeLessThanOrEqual(COAST_EPOCH + 2 * HOUR)
        }
        // The regulars are always there: nothing happens to them.
        expect(events.some((event) => event.track === '257100020' || event.track === 'radar-harbor')).toBe(false)
    })

    it('tells a silent contact heard, named, classified, stale after a minute and lost after five', () => {
        const contact = coastContact(SEED, 3)
        const silent = contact.silent ?? 0
        const events = coastEvents(SEED, contact.start - MINUTE, contact.end + MINUTE).filter((event) => event.track === contact.id)
        expect(events.map((event) => [event.kind, event.at])).toEqual([
            ['appeared', contact.start],
            ['affiliation', contact.affiliations[1].at],
            ['named', contact.namedAt],
            ['stale', silent + MINUTE],
            ['lost', silent + 5 * MINUTE],
        ])
        expect(events[0]).toMatchObject({ name: '257755021', affiliation: 'pending', trackKind: 'vessel' })
        expect(events[1]).toMatchObject({ affiliation: 'neutral', was: 'pending' })
        expect(events[2]).toMatchObject({ name: 'SEA GLASS', affiliation: 'neutral' })
    })

    it('tells a contact that never fell silent as leaving the area', () => {
        const contact = passing((each) => each.silent === undefined)
        const events = coastEvents(SEED, contact.start, contact.end).filter((event) => event.track === contact.id)
        expect(events[0].kind).toBe('appeared')
        expect(events.at(-1)).toMatchObject({ kind: 'left', at: contact.end })
        expect(events.some((event) => event.kind === 'stale' || event.kind === 'lost')).toBe(false)
    })

    it('tells a contact leaving at the very start of the stretch asked for', () => {
        const contact = passing((each) => each.silent === undefined)
        const events = coastEvents(SEED, contact.end, contact.end + 1).filter((event) => event.track === contact.id)
        expect(events.map((event) => [event.kind, event.at])).toEqual([['left', contact.end]])
        expect(coastContacts(SEED, contact.end, contact.end + 1)).toContain(contact)
    })

    it('agrees with the picture on when a contact is classified', () => {
        const contact = passing((each) => each.affiliations.length === 3 && each.affiliations[2].at < coastLastHeard(each))
        const [, first, second] = contact.affiliations
        const changes = coastEvents(SEED, contact.start, contact.end).filter(
            (event) => event.track === contact.id && event.kind === 'affiliation',
        )
        expect(changes.map((event) => [event.was, event.affiliation])).toEqual([
            ['pending', 'unknown'],
            ['unknown', second.affiliation],
        ])
        const seen = (at: number) => simulateCoast(SEED, at).tracks.find((track) => track.id === contact.id)?.affiliation
        expect(seen(first.at - 1)).toBe('pending')
        expect(seen(first.at)).toBe('unknown')
        expect(seen(second.at)).toBe(second.affiliation)
        expect(['hostile', 'neutral']).toContain(second.affiliation)
    })
})

describe('coastActivity', () => {
    it('counts the contacts heard in each stretch, as the watch has always drawn them', () => {
        expect(coastActivity(SEED, COAST_EPOCH - 6 * HOUR, COAST_EPOCH, 36)).toEqual([
            21, 21, 23, 24, 22, 22, 21, 22, 24, 22, 23, 23, 23, 21, 22, 21, 22, 24, 23, 21, 20, 21, 21, 21, 21, 22, 20, 21, 21, 21, 19, 20,
            19, 19, 21, 21,
        ])
    })

    it('counts the regulars in every stretch and each passing contact only while it is heard', () => {
        const contact = coastContact(SEED, 3)
        const [before, during, after] = coastActivity(SEED, contact.start - 30 * MINUTE, contact.start + 60 * MINUTE, 3)
        expect(before).toBeGreaterThanOrEqual(10)
        expect(during).toBeGreaterThanOrEqual(11)
        expect(after).toBeGreaterThanOrEqual(11)
        expect(coastActivity(SEED, COAST_EPOCH, COAST_EPOCH + HOUR, 6)).toHaveLength(6)
    })
})
