import { DownloadButton } from '@winterop-com/sokkel-ui/DownloadButton'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'

import { go } from 'tidevann-shared/router'
import { modelId, type CatalogEntry, type Variant } from '../data/catalog'
import { bytes } from '../data/format'
import type { Download } from '../data/model'
import { cancelPull, pausePull, pull, resumePull, retryPull } from '../engine/downloads'
import { useApp } from '../state'

/** The pull of an entry's variant now: under way, waiting or paused, else the last one that failed. */
export function pullOf(downloads: readonly Download[], entry: string, quant: string): Download | undefined {
    const mine = downloads.filter((one) => one.entry === entry && one.quant === quant)
    return (
        mine.find((one) => one.state === 'running' || one.state === 'queued' || one.state === 'paused') ??
        mine.find((one) => one.state === 'failed')
    )
}

/** The variant a row offers to pull at once: four-bit if there is one, else the first. */
export function usualVariant(entry: CatalogEntry): Variant {
    return entry.variants.find((variant) => variant.quant === 'Q4_K_M' || variant.quant === '4bit') ?? entry.variants[0]
}

/** One variant's download button, through every state its pull passes: pull, its share with pause and cancel, paused, kept. */
export function PullButton({
    entry,
    variant,
    size = 'sm',
    compact,
}: {
    entry: CatalogEntry
    variant: Variant
    size?: 'sm' | 'default'
    compact?: boolean | 'narrow'
}) {
    const { models, downloads } = useApp()
    const id = modelId(entry.name, variant.quant)
    const kept = models.find((model) => model.id === id)
    const now = pullOf(downloads, entry.id, variant.quant)
    const start = () =>
        void (now?.state === 'failed' ? retryPull(now.id) : pull(entry, variant)).catch((error: unknown) =>
            toast.add({
                type: 'error',
                title: `Could not pull ${entry.name}`,
                description: error instanceof Error ? error.message : String(error),
            }),
        )
    if (kept !== undefined)
        return (
            <DownloadButton
                state="kept"
                size={size}
                compact={compact}
                keptDetail={`In the library, ${bytes(kept.size)}`}
                onOpen={() => go(`/library/${kept.id}`)}
                words={{ kept: 'In library' }}
            />
        )
    if (now === undefined || now.state === 'failed')
        return (
            <DownloadButton
                state="idle"
                size={size}
                compact={compact}
                error={now?.error ?? undefined}
                onDownload={start}
                words={{ download: now?.state === 'failed' ? 'Try again' : `Pull ${variant.quant}` }}
            />
        )
    return (
        <DownloadButton
            state={now.state === 'paused' ? 'paused' : 'running'}
            size={size}
            compact={compact}
            value={now.done / now.size}
            onPause={() => void pausePull(now.id)}
            onResume={() => void resumePull(now.id)}
            onCancel={() => void cancelPull(now.id)}
            words={now.state === 'queued' ? { share: () => 'Queued' } : undefined}
        />
    )
}
