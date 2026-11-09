import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Transcript, transcriptLineAt, type TranscriptLine } from './Transcript'

const LINES: TranscriptLine[] = [
    { start: 4, speaker: 'ada', text: 'Welcome back.' },
    { start: 12, speaker: 'ada', text: 'The water is out.' },
    { start: 20, speaker: 'grace', text: 'Bring the bucket.' },
]

describe('transcriptLineAt', () => {
    it('finds the last line started by the position, and none before the first', () => {
        expect(transcriptLineAt(LINES, 0)).toBe(-1)
        expect(transcriptLineAt(LINES, 4)).toBe(0)
        expect(transcriptLineAt(LINES, 19.9)).toBe(1)
        expect(transcriptLineAt(LINES, 600)).toBe(2)
        expect(transcriptLineAt([], 10)).toBe(-1)
    })
})

describe('Transcript', () => {
    it('marks the line said at the position and names each line a press seeks to', () => {
        const html = renderToStaticMarkup(<Transcript lines={LINES} position={13} onSeek={() => undefined} />)
        expect(html.match(/aria-current="true"/g)).toHaveLength(1)
        expect(html).toContain('aria-label="Play from 0:12: The water is out."')
        expect(html).toMatch(/aria-current="true"[^>]*aria-label="Play from 0:12/)
    })

    it('writes the speaker only where the voice changes', () => {
        const html = renderToStaticMarkup(<Transcript lines={LINES} />)
        expect(html.match(/>ada</g)).toHaveLength(1)
        expect(html.match(/>grace</g)).toHaveLength(1)
        expect(html).not.toContain('<button')
    })

    it('says so when there are no lines', () => {
        expect(renderToStaticMarkup(<Transcript lines={[]} words={{ none: 'Nothing said' }} />)).toContain('Nothing said')
    })
})
