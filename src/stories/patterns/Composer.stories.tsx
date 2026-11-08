import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Composer, type ComposerAttachment, type ComposerDictation, type ComposerMentions } from '@winterop-com/sokkel-ui/Composer'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { ModelPicker } from '../fixtures/models'
import clip from '../media/fixtures/clip.webm?url'
import { tuneUrl } from '../media/fixtures/tune'
import { waveformOf } from '../media/fixtures/waveform'
import { PEOPLE } from '../fixtures/people'
import { fakeMicrophone, transcribeLater } from '../fixtures/speech'

/**
 * The message composer: empty, with a draft and attachments, while an answer streams, and shut;
 * then files on their way up, a recording and a video that play before they are sent, and
 * dictation into the text.
 */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <Stack gap="none" justify="end" className="min-h-svh bg-background p-6 text-foreground">
            <Stack gap="xl" className="mx-auto w-full max-w-3xl">
                {children}
            </Stack>
        </Stack>
    )
}

const PREVIEW = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112"><rect width="112" height="112" fill="#dbe4f0"/><path d="M0 84 L30 54 L52 74 L78 40 L112 76 L112 112 L0 112Z" fill="#7a93b8"/><circle cx="82" cy="26" r="10" fill="#f2c14e"/></svg>',
)}`

function Live({
    initial,
    files = [],
    busy = false,
    disabled = false,
    dictation,
    mentions,
}: {
    initial: string
    files?: ComposerAttachment[]
    busy?: boolean
    disabled?: boolean
    dictation?: ComposerDictation
    mentions?: ComposerMentions
}) {
    const [value, setValue] = useState(initial)
    const [attachments, setAttachments] = useState(files)
    const [streaming, setStreaming] = useState(busy)
    return (
        <Composer
            value={value}
            onChange={setValue}
            onSend={() => {
                setValue('')
                setAttachments([])
                setStreaming(true)
            }}
            onStop={() => setStreaming(false)}
            busy={streaming}
            disabled={disabled}
            attachments={attachments}
            onAttach={(added) =>
                setAttachments((current) => [
                    ...current,
                    ...added.map((file) => ({
                        id: `${file.name}-${file.size}`,
                        name: file.name,
                        kind: 'file' as const,
                        detail: `${Math.ceil(file.size / 1024)} KB`,
                    })),
                ])
            }
            onRemove={(id) => setAttachments((current) => current.filter((attachment) => attachment.id !== id))}
            onCancel={(id) => setAttachments((current) => current.filter((attachment) => attachment.id !== id))}
            tools={<ModelPicker />}
            dictation={dictation}
            mentions={mentions}
        />
    )
}

function States() {
    return (
        <Ground>
            <Live initial="" />
            <Live
                initial={'Why did nightly-export fail last night?\nThe log says validate rejected 37 rows.'}
                files={[
                    { id: 'a', name: 'orders-2026-10.csv', kind: 'file', detail: 'CSV, 2.1 MB' },
                    { id: 'b', name: 'validate.log', kind: 'file', detail: '14 KB' },
                    { id: 'c', name: 'dashboard.png', kind: 'image', url: PREVIEW },
                ]}
            />
            <Live initial="" busy />
            <Live initial="" disabled />
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/Composer' }
export default meta

export const States_: StoryObj = { name: 'States', render: () => <States /> }

/**
 * Files on their way up: a spinner while the share done is unknown, a ring when it is known, and a
 * picture dimmed under its ring. Send waits until all are up, and each can be cancelled. Below, a
 * recording plays in its chip and a video opens in a dialog.
 */
export const Uploads: StoryObj = {
    render: () => (
        <Ground>
            <Live
                initial="Here are this month's orders and the run's log."
                files={[
                    { id: 'a', name: 'orders-2026-11.csv', kind: 'file', detail: 'CSV, 2.4 MB', uploading: true, progress: 0.4 },
                    { id: 'b', name: 'validate.log', kind: 'file', detail: '14 KB', uploading: true },
                    { id: 'c', name: 'dashboard.png', kind: 'image', url: PREVIEW, uploading: true, progress: 0.75 },
                ]}
            />
            <Live
                initial="What does this run sound like?"
                files={[
                    { id: 'd', name: 'voice-note.wav', kind: 'audio', url: tuneUrl(), waveform: waveformOf(3, 64), duration: 8 },
                    { id: 'e', name: 'coastline.webm', kind: 'video', url: clip },
                ]}
            />
        </Ground>
    ),
}

/**
 * People suggested at the caret as an `@` is typed, from the app's list, by name and handle: the
 * arrow keys move, Enter or Tab puts the one chosen in as `@grace`, and Escape closes them. Under
 * it, the ids the text mentions, as the composer hears them.
 */
export const Mentions: StoryObj = {
    render: function Render() {
        const [mentioned, setMentioned] = useState<string[]>([])
        return (
            <Ground>
                <Live initial="Can @gr" mentions={{ people: PEOPLE, defaultOpen: true, onChange: setMentioned }} />
                <p className="text-xs text-muted-foreground">Mentioned: {mentioned.length === 0 ? 'no one' : mentioned.join(', ')}</p>
            </Ground>
        )
    },
}

/** Dictation through the app's transcriber, here a stand-in that answers with one sentence after a moment, recording a hum made in the page instead of the microphone. */
const DICTATION: ComposerDictation = { transcribe: transcribeLater, microphone: fakeMicrophone }

/**
 * A microphone before Send. The first composer dictates on a press: the row shows a pulsing mark,
 * the level and the time, with a button to cancel; a second press stops, it transcribes, and the
 * text goes in at the caret. Escape cancels. Under it, held still: hearing, transcribing, and a
 * failure said beside the microphone.
 */
export const Dictation: StoryObj = {
    render: () => (
        <Ground>
            <Live initial="Why did nightly-export fail last night?" dictation={DICTATION} />
            <Live initial="Why did nightly-export fail last night?" dictation={{ ...DICTATION, defaultState: 'recording' }} />
            <Live initial="Why did nightly-export fail last night?" dictation={{ ...DICTATION, defaultState: 'transcribing' }} />
            <Live initial="Why did nightly-export fail last night?" dictation={{ ...DICTATION, defaultState: 'error' }} />
        </Ground>
    ),
}
