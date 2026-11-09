/**
 * What is said in an episode, and when: its transcript, its chapters and every syllable of every
 * line, timed as the voices in `voice.ts` speak them, so the transcript follows the sound. Made
 * from the episode's chapters and a few banks of sentences, the same every time for an episode.
 */

import type { MediaChapter } from '@winterop-com/sokkel-ui-media/ChapterList'
import type { TranscriptLine } from '@winterop-com/sokkel-ui-media/Transcript'

import { episodeById, showById, type Episode, type Host, type Show, type Talk } from './catalog'

/** The mouth's shape for a vowel, read from its letter. */
export type Vowel = 'a' | 'e' | 'i' | 'o' | 'u'

/** How a syllable begins: a hiss, a breath, a stop, a hum, a glide, or straight into the vowel. */
export type Onset = 'hiss' | 'breath' | 'stop' | 'hum' | 'glide' | 'none'

export interface Syllable {
    at: number
    length: number
    vowel: Vowel
    onset: Onset
    /** The pitch at its start and end, in hertz. */
    pitch: number
    pitchEnd: number
    /** How loud, around 1. */
    gain: number
    /** Whether the voice stops after it, at the end of a word. */
    last: boolean
    voice: Host
}

/** A tune played at a moment: the jingle at the start and the end, a chime between chapters. */
export interface Cue {
    at: number
    /** Semitones above the show's key. */
    notes: readonly number[]
    /** Seconds between notes. */
    step: number
}

export interface Script {
    duration: number
    chapters: MediaChapter[]
    lines: TranscriptLine[]
    syllables: Syllable[]
    cues: Cue[]
}

/** How each host sounds: the pitch they speak at and how long a syllable takes them. */
export const VOICES: Record<Host, { pitch: number; syllable: number; formant: number }> = {
    ada: { pitch: 205, syllable: 0.168, formant: 1.16 },
    grace: { pitch: 186, syllable: 0.176, formant: 1.12 },
    margaret: { pitch: 174, syllable: 0.186, formant: 1.1 },
    linus: { pitch: 112, syllable: 0.18, formant: 1 },
}

/** A number from a string, the same every time. */
function hash(text: string): number {
    let value = 2166136261
    for (let index = 0; index < text.length; index += 1) {
        value ^= text.charCodeAt(index)
        value = Math.imul(value, 16777619)
    }
    return value >>> 0
}

/** Numbers from 0 to 1 drawn from a seed, the same run every time. */
export function seeded(seed: string): () => number {
    let state = hash(seed) || 1
    return () => {
        state = (state + 0x6d2b79f5) | 0
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
    }
}

const COAST = [
    'We got to {place} early, before anyone else was up.',
    'The first thing you notice at {place} is how quiet it is.',
    'Most people walk straight past it without looking.',
    'It changes with every tide, and with every season too.',
    'The old maps show {place} a little further north than it is today.',
    'There is a bench there, and on a clear day you can see the whole coast.',
    'Nobody quite agrees on how long it has been like this.',
    'I asked around, and everyone had a different answer.',
    'It takes about an hour on foot, less if the path is dry.',
    'The wind came round from the west while we stood there.',
    'You can hear the water long before you see it.',
    'That is the part I keep coming back to.',
    'It is easy to miss if you are in a hurry.',
    'In winter the light is gone by four, so you have to be quick.',
    'The people who live here have a name for it that is on no map.',
    'It is smaller than it looks in the pictures, and somehow better.',
    'We brought a flask of coffee and stayed far longer than we meant to.',
    'That is what makes {place} worth the trip.',
    'The gulls were there first, as always, and they let us know it.',
    'If you stand still long enough, everything starts to move again.',
    'Bring good boots. Whatever the forecast says, bring good boots.',
    'There was a fisherman there who told us the whole story in five minutes.',
]

const COAST_ASKED: readonly (readonly [string, string])[] = [
    ['How far out does it go at low water?', 'About as far as you can throw a stone, and then a good bit more.'],
    ['And who looks after it now?', 'A few volunteers, mostly, and the weather does the rest.'],
    ['Is it always that windy up there?', 'Most days. The calm ones are worth the wait.'],
    ['Did anyone keep a record of it?', 'There is a notebook in the harbor office that goes back years.'],
    ['Would you go back?', 'Tomorrow, if the tide is right.'],
    ['What surprised you the most?', 'How quickly it all changed once the water came back.'],
]

const WEATHER = [
    'The pressure has been falling slowly since Monday.',
    'Cold air is heavier than warm air, so on a still night it runs downhill and fills the valley.',
    'Up on the ridge it was clear, and down in the town you could not see the end of the street.',
    'The wind has a long way to come across the sea, and it picks up the damp on the way.',
    'The station on {place} has read the same instruments every morning for sixty years.',
    'When the wind turns to the north, it gets colder and the sky clears.',
    'Rain on the coast, snow on the hills, and sunshine somewhere in between.',
    'Watch the tops of the trees; they turn before the weather does.',
    'The thermometer said two degrees, but the wind made it feel much colder.',
    'By the weekend it should settle, though I would not bet the picnic on it.',
    'A ring around the moon usually means rain within a day or two.',
    'The fog lifts once the sun has warmed the ground, usually by ten.',
]

const WEATHER_ASKED: readonly (readonly [string, string])[] = [
    ['You might ask why it always seems worse on a Monday.', 'It is not, but it does feel that way.'],
    ['Will it last?', 'Two more days, and then the wind turns.'],
]

const OPS = [
    'The {job} job ran every night this week, and failed only once.',
    'It failed at the {step} step, the one we changed on Monday.',
    'Grace moved the {step} step onto the worker, and the runs got faster.',
    'The scheduler started it on time; the trouble came later.',
    'We looked at the logs from the {project} project first.',
    'A retry fixed it, but a retry is not a fix.',
    'The api was slow for about ten minutes, and everything behind it waited.',
    'Margaret wrote a runbook for it, so the next person has an easier night.',
    'Nothing was lost; the run picked up where it stopped.',
    'We added a validate step, so a bad file stops early instead of late.',
    'Most runs finish in under four minutes now.',
    'The queue was empty again by six, before anyone logged on.',
    'It is the kind of failure you see once a month, which makes it hard to catch.',
    'We cancelled the stuck run, and the next one succeeded.',
]

const OPS_ASKED: readonly (readonly [string, string])[] = [
    ['How did you find it?', 'The logs from the {step} step said exactly what was wrong, for once.'],
    ['Could it happen again?', 'Not this way. There is a check for it now.'],
    ['Who was on call?', 'Grace, and she had it fixed before her coffee was cold.'],
]

const BANKS: Record<Talk, { said: readonly string[]; asked: readonly (readonly [string, string])[] }> = {
    coast: { said: COAST, asked: COAST_ASKED },
    weather: { said: WEATHER, asked: WEATHER_ASKED },
    ops: { said: OPS, asked: OPS_ASKED },
}

const INTROS = ['So: {chapter}.', 'Let us start with {chapter}.', 'Now, {chapter}.', 'Which brings us to {chapter}.', 'Next, {chapter}.']

const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders']
const STEPS = ['fetch', 'transform', 'validate', 'upload', 'notify']
const PROJECTS = ['harbor', 'juniper', 'larkspur']

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

/** Who says what in an episode, chapter by chapter, before any of it is timed. */
function written(episode: Episode, show: Show): { title: string; lines: { speaker: Host; text: string }[] }[] {
    const random = seeded(episode.id)
    const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T
    const fill = (text: string) =>
        text
            .replaceAll('{place}', episode.place)
            .replaceAll('{job}', pick(JOBS))
            .replaceAll('{step}', pick(STEPS))
            .replaceAll('{project}', pick(PROJECTS))
    const bank = BANKS[show.talk]
    const said = [...bank.said]
    // Each sentence once per episode, in an order of its own.
    const next = () => fill(said.splice(Math.floor(random() * said.length), 1)[0] ?? pick(bank.said))
    const [host = 'ada', other] = show.hosts
    let turn = 0
    const speaker = (): Host => (other === undefined ? host : turn++ % 2 === 0 ? host : other)
    return episode.chapters.map((title, index) => {
        const lines: { speaker: Host; text: string }[] = []
        const last = index === episode.chapters.length - 1
        if (index === 0) {
            const with_ = other === undefined ? '' : `, here with ${other}`
            lines.push({ speaker: host, text: `Welcome to ${show.title}. I am ${host}${with_}, and this time: ${lower(episode.title)}.` })
            lines.push({ speaker: host, text: episode.summary })
            turn = 1
        } else {
            lines.push({ speaker: speaker(), text: pick(INTROS).replace('{chapter}', lower(title)) })
        }
        const body = last ? 2 : 3 + Math.floor(random() * 2)
        for (let count = 0; count < body; count += 1) {
            if (random() < 0.3) {
                const [question, answer] = pick(bank.asked)
                const asks = other ?? host
                const answers = other === undefined ? host : asks === host ? other : host
                lines.push({ speaker: asks, text: fill(question) })
                lines.push({ speaker: answers, text: fill(answer) })
            } else {
                lines.push({ speaker: speaker(), text: random() < 0.35 ? `${next()} ${next()}` : next() })
            }
        }
        if (last) {
            lines.push({ speaker: host, text: `That is all for this episode of ${show.title}. Thanks for listening.` })
            if (other !== undefined) lines.push({ speaker: other, text: 'See you next time.' })
        }
        return { title, lines }
    })
}

/** A word's syllables: each vowel group with the consonants before it. */
function syllablesOf(word: string): { onset: Onset; vowel: Vowel }[] {
    const letters = word.toLowerCase().replace(/[^a-z]/g, '')
    const found: { onset: Onset; vowel: Vowel }[] = []
    for (const match of letters.matchAll(/([^aeiouy]*)([aeiouy]+)/g)) {
        found.push({ onset: onsetOf(match[1] ?? ''), vowel: vowelOf(match[2] ?? 'a') })
    }
    // A silent e at the end of a longer word.
    if (found.length > 1 && /[^aeiouy]e$/.test(letters)) found.pop()
    return found.length === 0 ? [{ onset: 'none', vowel: 'a' }] : found
}

function onsetOf(consonants: string): Onset {
    const first = consonants.slice(-2).charAt(0)
    if (first === '') return 'none'
    if ('szcx'.includes(first)) return 'hiss'
    if ('fvh'.includes(first) || consonants.endsWith('th')) return 'breath'
    if ('pbtdkgq'.includes(first)) return 'stop'
    if ('mn'.includes(first)) return 'hum'
    return 'glide'
}

function vowelOf(group: string): Vowel {
    const first = group.charAt(0)
    if (first === 'y') return 'i'
    return (first === 'a' || first === 'e' || first === 'i' || first === 'o' || first === 'u' ? first : 'a') as Vowel
}

/** How long the jingle at the start and the end takes, and a chime between chapters. */
const JINGLE = 2.6
const CHIME = 1.2

const scripts = new Map<string, Script>()

/** An episode's script, timed: made once and kept. */
export function scriptOf(id: string): Script {
    const kept = scripts.get(id)
    if (kept !== undefined) return kept
    const episode = episodeById.get(id)
    const show = episode === undefined ? undefined : showById.get(episode.show)
    if (episode === undefined || show === undefined) throw new Error(`No episode with the id ${id}.`)
    const random = seeded(`${id}:voice`)
    const chapters: MediaChapter[] = []
    const lines: TranscriptLine[] = []
    const syllables: Syllable[] = []
    const cues: Cue[] = [{ at: 0, notes: show.jingle, step: 0.26 }]
    let at = JINGLE
    let previous: Host | undefined
    written(episode, show).forEach((chapter, index) => {
        if (index > 0) {
            cues.push({ at: at + 0.2, notes: [show.jingle[0] ?? 0, show.jingle[2] ?? 7], step: 0.18 })
            at += CHIME
        }
        chapters.push({ title: chapter.title, start: index === 0 ? 0 : Math.round((at - CHIME) * 10) / 10 })
        for (const line of chapter.lines) {
            if (previous !== undefined && previous !== line.speaker) at += 0.25
            previous = line.speaker
            const voice = VOICES[line.speaker]
            lines.push({ start: Math.round(at * 10) / 10, speaker: line.speaker, text: line.text })
            for (const sentence of line.text.match(/[^.?!;:]+[.?!;:]*/g) ?? [line.text]) {
                const words = sentence.trim().split(/\s+/).filter(Boolean)
                const asking = sentence.trim().endsWith('?')
                const parts = words.map(syllablesOf)
                const total = parts.reduce((sum, part) => sum + part.length, 0)
                let counted = 0
                words.forEach((word, place) => {
                    const part = parts[place] ?? []
                    part.forEach((syllable, within) => {
                        const share = counted / Math.max(1, total - 1)
                        // The voice falls through a sentence, and a question rises at its end.
                        const fall = 1.12 - 0.26 * share
                        const rise = asking && counted >= total - 2 ? 1.18 + 0.1 * (counted - total + 2) : 1
                        const stress = within === 0 && part.length > 1 ? 1.08 : 1
                        const wobble = 1 + (random() - 0.5) * 0.08
                        const length = voice.syllable * (0.78 + random() * 0.44) * (stress > 1 ? 1.15 : 1)
                        syllables.push({
                            at,
                            length,
                            vowel: syllable.vowel,
                            onset: syllable.onset,
                            pitch: voice.pitch * fall * stress * wobble * rise,
                            pitchEnd: voice.pitch * (fall - 0.03) * wobble * rise,
                            gain: (0.82 + random() * 0.3) * (stress > 1 ? 1.12 : 1),
                            last: within === part.length - 1,
                            voice: line.speaker,
                        })
                        at += length
                        counted += 1
                    })
                    at += 0.05 + (word.endsWith(',') ? 0.18 : 0)
                })
                at += asking ? 0.34 : 0.28
            }
            at += 0.3
        }
    })
    at += 0.4
    cues.push({ at, notes: [...show.jingle].reverse(), step: 0.3 })
    const script = { duration: Math.ceil((at + JINGLE) * 10) / 10, chapters, lines, syllables, cues }
    scripts.set(id, script)
    return script
}

/** The length of an episode in seconds. */
export const lengthOf = (id: string): number => scriptOf(id).duration

/** A line said alone, timed as an episode's are, for an episode's summary read aloud. */
export function spokenScript(text: string, speaker: Host, seed: string): Script {
    const voice = VOICES[speaker]
    const random = seeded(seed)
    const syllables: Syllable[] = []
    let at = 0.3
    for (const sentence of text.match(/[^.?!]+[.?!]*/g) ?? [text]) {
        const words = sentence.trim().split(/\s+/).filter(Boolean)
        const parts = words.map(syllablesOf)
        const total = parts.reduce((sum, part) => sum + part.length, 0)
        let counted = 0
        for (const part of parts) {
            part.forEach((syllable, within) => {
                const fall = 1.1 - 0.24 * (counted / Math.max(1, total - 1))
                const length = voice.syllable * (0.8 + random() * 0.4)
                syllables.push({
                    at,
                    length,
                    vowel: syllable.vowel,
                    onset: syllable.onset,
                    pitch: voice.pitch * fall,
                    pitchEnd: voice.pitch * (fall - 0.03),
                    gain: 0.85 + random() * 0.25,
                    last: within === part.length - 1,
                    voice: speaker,
                })
                at += length
                counted += 1
            })
            at += 0.05
        }
        at += 0.3
    }
    return { duration: at + 0.3, chapters: [], lines: [{ start: 0.3, speaker, text }], syllables, cues: [] }
}
