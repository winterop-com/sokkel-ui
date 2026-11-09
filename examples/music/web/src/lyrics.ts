/**
 * The words of a song, written from its seed: verses and a chorus from a few banks of lines about
 * the coast. Timed songs come as LRC, a line every two bars from the end of the intro, so the
 * fullscreen view follows them as the song plays; the rest as plain verses to read.
 */
import { albumOf, artistName, type Song } from './catalog'
import { barsOf, seeded } from './synth'

const VERSES = [
    'The boats came in before the light',
    'We left the harbor wall behind',
    'Salt on the window, rain on the quay',
    'You said the tide would wait for us',
    'A lantern swinging on the pier',
    'The ferry calls across the sound',
    'We counted gulls along the shore',
    'The wind came round from the west again',
    'I kept your letters in a tin',
    'The water stands so still tonight',
    'We walked the causeway, shoes in hand',
    'The keeper climbs the winding stair',
    'Your coat still smells of woodsmoke',
    'The nets are drying on the rail',
    'A single light out on the reef',
    'We named the islands one by one',
    'The road runs out where the dunes begin',
    'The radio plays the shipping news',
    'I heard the bell from the far side',
    'The moon is pulling at the bay',
]

const CHORUSES = [
    ['And the tide comes in', 'And the tide goes out', 'And I wait for you', 'By the water'],
    ['Hold on, hold on', 'Till the morning breaks', 'Hold on, hold on', 'For the long way home'],
    ['Low water, high water', 'Every turn of the sea', 'Low water, high water', 'Brings you back to me'],
    ['Over the breakwater', 'Under the open sky', 'We were never lost', 'Only drifting by'],
    ['Carry me home', 'On the evening swell', 'Carry me home', 'Where the lanterns dwell'],
]

/** Seconds written as LRC's stamp: `[01:02.50]`. */
function stamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const rest = seconds - minutes * 60
    return `[${String(minutes).padStart(2, '0')}:${rest.toFixed(2).padStart(5, '0')}]`
}

/** The verses and choruses of a song, as lines, a blank line between each. */
function linesOf(song: Song, count: number): string[] {
    const random = seeded(song.seed ^ 0x2545f491)
    const chorus = CHORUSES[Math.floor(random() * CHORUSES.length)]
    const lines: string[] = []
    let verse = 0
    while (lines.length < count) {
        if (verse % 2 === 0) {
            for (let index = 0; index < 4; index += 1) lines.push(VERSES[Math.floor(random() * VERSES.length)])
        } else {
            lines.push(...chorus)
        }
        verse += 1
    }
    return lines.slice(0, count)
}

/** A song's words as LRC or plain text, or undefined when it has none. */
export function lyricsOf(song: Song): string | undefined {
    if (song.words === 'none') return undefined
    const { bar, bars } = barsOf(song.seed, song.style)
    const start = bars > 8 ? 4 : 2
    const slots = Math.max(4, Math.floor((bars - start - 2) / 2))
    const lines = linesOf(song, Math.min(16, slots))
    if (song.words === 'plain') return lines.map((line, index) => (index > 0 && index % 4 === 0 ? `\n${line}` : line)).join('\n')
    const head = [`[ti:${song.title}]`, `[ar:${artistName(song.artist)}]`, `[al:${albumOf(song).title}]`]
    const timed = lines.map((line, index) => `${stamp((start + index * 2) * bar)}${line}`)
    return [...head, ...timed, `${stamp((start + lines.length * 2) * bar)}`].join('\n')
}
