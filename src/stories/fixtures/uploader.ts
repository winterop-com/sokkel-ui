/** A pretend uploader for the stories: each request waits until a button moves it on, so no timer runs. */

import { useRef } from 'react'

import type { UploadContext } from '@winterop-com/sokkel-ui/hooks/use-uploads'

interface Pending {
    context: UploadContext
    share: number
    finish: () => void
    fail: (error: Error) => void
}

/** The uploader to give `useUploads`, and the buttons' actions: move every upload on a quarter, or fail the first. */
export function useFakeUploader() {
    const pending = useRef(new Map<string, Pending>())
    return {
        upload: (file: File, context: UploadContext) =>
            new Promise<void>((finish, fail) => {
                pending.current.set(file.name, { context, share: 0, finish, fail })
                context.signal.addEventListener('abort', () => pending.current.delete(file.name))
            }),
        step: () => {
            for (const [name, request] of pending.current) {
                request.share = Math.min(1, request.share + 0.25)
                request.context.onProgress(request.share)
                if (request.share >= 1) {
                    pending.current.delete(name)
                    request.finish()
                }
            }
        },
        failOne: () => {
            const first = [...pending.current][0]
            if (first === undefined) return
            pending.current.delete(first[0])
            first[1].fail(new Error('The server refused the file'))
        },
    }
}

/** Files to add in a story: two taken, one of a type not taken, one too large for a 5 KB limit (`PICKED_LIMIT`). */
export const PICKED_FILES: readonly File[] = [
    new File([new Uint8Array(2_100)], 'orders-2026-10.csv', { type: 'text/csv' }),
    new File([new Uint8Array(600)], 'nightly-export.yaml', { type: 'application/yaml' }),
    new File([new Uint8Array(40)], 'installer.exe', { type: 'application/octet-stream' }),
    new File([new Uint8Array(9_000)], 'inventory-full.csv', { type: 'text/csv' }),
]

/** The size limit the picked files are held to, in bytes. */
export const PICKED_LIMIT = 5_000
