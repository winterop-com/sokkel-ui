import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Composer, type ComposerAttachment } from '@winterop-com/sokkel-ui/Composer'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { ModelPicker } from '../fixtures/models'

/** The message composer: empty, with a draft and attachments, while an answer streams, and shut. */
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
}: {
    initial: string
    files?: ComposerAttachment[]
    busy?: boolean
    disabled?: boolean
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
            tools={<ModelPicker />}
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
