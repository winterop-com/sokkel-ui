import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SpeakButton, speakPress } from './SpeakButton'

const load = async () => 'speech.mp3'

describe('speakPress', () => {
    it('fetches on the first press and plays what was kept after it', () => {
        expect(speakPress('idle', false)).toBe('load')
        expect(speakPress('idle', true)).toBe('play')
    })

    it('stops what plays and stops a fetch under way', () => {
        expect(speakPress('playing', true)).toBe('stop')
        expect(speakPress('loading', false)).toBe('cancel')
    })

    it('fetches again after a failure, even with audio kept', () => {
        expect(speakPress('error', false)).toBe('load')
        expect(speakPress('error', true)).toBe('load')
    })
})

describe('SpeakButton', () => {
    it('names each state', () => {
        expect(renderToStaticMarkup(<SpeakButton load={load} />)).toContain('aria-label="Read aloud"')
        const loading = renderToStaticMarkup(<SpeakButton load={load} defaultState="loading" />)
        expect(loading).toContain('aria-label="Loading the audio"')
        expect(loading).toContain('aria-busy="true"')
        expect(renderToStaticMarkup(<SpeakButton load={load} defaultState="playing" />)).toContain('aria-label="Stop"')
        expect(renderToStaticMarkup(<SpeakButton load={load} defaultState="error" />)).toContain(
            'aria-label="The audio could not be played"',
        )
    })

    it('says its words when labeled, and why it failed on hover', () => {
        expect(renderToStaticMarkup(<SpeakButton load={load} variant="labeled" />)).toContain('Read aloud</button>')
        const failed = renderToStaticMarkup(<SpeakButton load={load} variant="labeled" defaultState="error" words={{ retry: 'Again' }} />)
        expect(failed).toContain('title="The audio could not be played"')
        expect(failed).toContain('Again</button>')
    })
})
