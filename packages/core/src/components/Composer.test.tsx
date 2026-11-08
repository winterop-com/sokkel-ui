import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Composer, type ComposerDictation } from './Composer'

const transcribe = async () => 'Rerun nightly-export'

function draw(dictation?: ComposerDictation, value = '') {
    return renderToStaticMarkup(<Composer value={value} onChange={() => undefined} onSend={() => undefined} dictation={dictation} />)
}

describe('Composer dictation', () => {
    it('offers no microphone where the page cannot dictate with what the app gave', () => {
        expect(draw()).not.toContain('Dictate')
        // Outside a browser there is no microphone to record.
        expect(draw({ transcribe })).not.toContain('Dictate')
    })

    it('shows a recording with its time, a way to cancel and the microphone that finishes it', () => {
        const recording = draw({ transcribe, defaultState: 'recording' }, 'Why did it fail?')
        expect(recording).toContain('aria-label="Cancel dictation"')
        expect(recording).toContain('aria-label="Finish dictating"')
        expect(recording).toContain('0:00')
        expect(recording).not.toContain('aria-label="Attach files"')
    })

    it('shows a transcription under way, with Send waiting', () => {
        const transcribing = draw({ transcribe, defaultState: 'transcribing' }, 'Why did it fail?')
        expect(transcribing).toContain('>Transcribing</span>')
        expect(transcribing).toMatch(/aria-disabled="true" aria-label="Send"/)
    })

    it('says a failure whole, in the words given, on a line of its own over the row', () => {
        const failed = renderToStaticMarkup(
            <Composer
                value=""
                onChange={() => undefined}
                onSend={() => undefined}
                dictation={{ transcribe, defaultState: 'error' }}
                words={{ dictation: { failed: 'Could not hear that' } }}
            />,
        )
        const alert = /<p role="alert" class="([^"]*)">.*?<\/p>/.exec(failed)
        expect(alert?.[0]).toContain('Could not hear that')
        // It wraps rather than being cut short, and stands before the row with the microphone.
        expect(alert?.[1]).not.toMatch(/truncate|line-clamp|nowrap/)
        expect(failed.indexOf('role="alert"')).toBeLessThan(failed.indexOf('aria-label="Dictate"'))
    })
})
