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

    it('says a failure beside the microphone, in the words given', () => {
        const failed = renderToStaticMarkup(
            <Composer
                value=""
                onChange={() => undefined}
                onSend={() => undefined}
                dictation={{ transcribe, defaultState: 'error' }}
                words={{ dictation: { failed: 'Could not hear that' } }}
            />,
        )
        expect(failed).toContain('role="alert"')
        expect(failed).toContain('Could not hear that')
        expect(failed).toContain('aria-label="Dictate"')
    })
})
