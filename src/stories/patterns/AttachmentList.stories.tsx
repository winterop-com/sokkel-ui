import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileJson, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'

import { AttachmentList, type AttachmentFile } from '@winterop-com/sokkel-ui/AttachmentList'
import { Banner } from '@winterop-com/sokkel-ui/Banner'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { useUploads } from '@winterop-com/sokkel-ui/hooks/use-uploads'
import { PICKED_FILES, PICKED_LIMIT, useFakeUploader } from '../fixtures/uploader'
import { HARBOR_DUSK } from '../fixtures/photos'
import clip from '../media/fixtures/clip.webm?url'
import { tuneUrl } from '../media/fixtures/tune'
import { waveformOf } from '../media/fixtures/waveform'

const meta: Meta = { title: 'Patterns/Attachment list', parameters: { frame: 'column' } }
export default meta

const FILES: AttachmentFile[] = [
    { id: 'orders', name: 'orders-2026-10.csv', detail: 'CSV, 2.1 MB', icon: <FileSpreadsheet aria-hidden /> },
    { id: 'config', name: 'nightly-export.yaml', detail: 'YAML, 0.6 KB' },
    { id: 'schema', name: 'import-orders.schema.json', detail: 'JSON, 3.4 KB', icon: <FileJson aria-hidden /> },
    { id: 'shot', name: 'rejections.png', detail: 'PNG, 184 KB', image: HARBOR_DUSK },
]

/** The files of a letter, wrapping onto a second line when the row runs out of room. */
export const Files: StoryObj = {
    render: () => <AttachmentList files={FILES} />,
}

/** Files waiting to be sent, each with a remove button. */
export const Removable: StoryObj = {
    render: function Render() {
        const [files, setFiles] = useState(FILES.slice(0, 3))
        return <AttachmentList files={files} onRemove={(id) => setFiles((current) => current.filter((file) => file.id !== id))} />
    },
}

/** Files still on their way up: a spinner, or a ring with the share done when it is known. */
export const Uploading: StoryObj = {
    render: () => <AttachmentList files={[FILES[0], { ...FILES[1], uploading: true, progress: 0.42 }, { ...FILES[2], uploading: true }]} />,
}

/** A recording plays in one line under its name, and a video in the library's player. */
export const Media: StoryObj = {
    render: () => (
        <AttachmentList
            files={[
                { id: 'note', name: 'voice-note.wav', kind: 'audio', src: tuneUrl(), waveform: waveformOf(3, 64), duration: 8 },
                { id: 'clip', name: 'coastline.webm', kind: 'video', src: clip },
            ]}
        />
    ),
}

function UploadQueue() {
    const fake = useFakeUploader()
    const uploads = useUploads({ accept: '.csv,.yaml,.json', maxSize: PICKED_LIMIT, upload: fake.upload })
    return (
        <Stack gap="sm">
            <Row gap="sm" wrap>
                <Button variant="outline" size="sm" onClick={() => uploads.add(PICKED_FILES)}>
                    Add files
                </Button>
                <Button variant="outline" size="sm" onClick={fake.step}>
                    Progress
                </Button>
                <Button variant="outline" size="sm" onClick={fake.failOne}>
                    Fail one
                </Button>
            </Row>
            {uploads.refused.map((refused) => (
                <Banner key={refused.id} tone="warning" onDismiss={uploads.clearRefused}>
                    {refused.message}
                </Banner>
            ))}
            <AttachmentList files={uploads.files} onRemove={uploads.onRemove} onCancel={uploads.onCancel} />
        </Stack>
    )
}

/**
 * `useUploads` feeding the list: Add files takes two files and refuses one by its type and one by
 * its size, Progress moves every upload on a quarter, and Fail one fails the first still going. A
 * file going up cancels, one that is up removes.
 */
export const WithUploads: StoryObj = { name: 'With uploads', render: () => <UploadQueue /> }
