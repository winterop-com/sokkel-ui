import { ConsequenceList } from '@winterop-com/sokkel-ui/ConsequenceList'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { FileText, HardDrive, MessageSquare } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { go } from 'tidevann-shared/router'

import { log, models as library, prefs as kept } from './data/backend'
import { pathOf } from './data/disk'
import { bytes, counted } from './data/format'
import type { Model } from './data/model'
import { startConversation } from './engine/chat'
import { unloadModel } from './engine/runner'
import { useApp } from './state'

/** Opens a new conversation with a model and goes to it. */
export function chatWith(model: Model): void {
    void startConversation(model).then((made) => go(`/chat/${made.id}`))
}

/** Takes models off the disk: unloads them, removes their files, and moves the default model on if it went. */
export async function deleteModels(gone: readonly Model[], all: readonly Model[], defaultModel: string): Promise<void> {
    for (const model of gone) {
        await unloadModel(model.id, 'as it was deleted')
        await library.remove(model.id)
        log('info', 'library', `deleted ${model.name} ${model.quant}, freeing ${bytes(model.size)}`)
    }
    if (gone.some((model) => model.id === defaultModel)) {
        const next = all.find((model) => !gone.some((one) => one.id === model.id))
        if (next !== undefined) await kept.update('prefs', { defaultModel: next.id })
    }
}

/**
 * Deleting models from anywhere in the app: asks first, saying what goes with them, unless the
 * preferences say not to; returns the call that starts it and the dialog to draw.
 */
export function useDeleteModels(onDeleted?: () => void): { ask: (models: readonly Model[]) => void; dialog: ReactNode } {
    const { models, conversations, prefs } = useApp()
    const [doomed, setDoomed] = useState<readonly Model[]>([])
    const [busy, setBusy] = useState(false)
    const run = (gone: readonly Model[]) => {
        setBusy(true)
        void deleteModels(gone, models, prefs.defaultModel).then(
            () => {
                setBusy(false)
                setDoomed([])
                toast.add({
                    type: 'success',
                    title: gone.length === 1 ? `Deleted ${gone[0].name}` : `Deleted ${counted(gone.length, 'model')}`,
                    description: `${bytes(gone.reduce((sum, model) => sum + model.size, 0))} freed on the disk`,
                })
                onDeleted?.()
            },
            (error: unknown) => {
                setBusy(false)
                toast.add({ type: 'error', title: 'Could not delete', description: String(error) })
            },
        )
    }
    const ask = (gone: readonly Model[]) => {
        if (gone.length === 0) return
        if (prefs.confirmDelete) setDoomed(gone)
        else run(gone)
    }
    const size = doomed.reduce((sum, model) => sum + model.size, 0)
    const files = doomed.reduce((sum, model) => sum + model.files.length, 0)
    const talks = conversations.filter((one) => doomed.some((model) => model.id === one.model)).length
    const dialog = (
        <ConfirmDialog
            open={doomed.length > 0}
            onOpenChange={(open) => !busy && !open && setDoomed([])}
            question={doomed.length === 1 ? `Delete ${doomed[0].name} ${doomed[0].quant}?` : `Delete ${counted(doomed.length, 'model')}?`}
            detail={
                doomed.length === 1
                    ? `Its files are removed from ${pathOf(prefs.root, doomed[0])}. It can be pulled again later.`
                    : 'Their files are removed from the disk. Each can be pulled again later.'
            }
            confirm={{ label: 'Delete', destructive: true, busy, busyLabel: 'Deleting', onConfirm: () => run(doomed) }}
        >
            <ConsequenceList
                tone="critical"
                words={{ heading: 'What this does' }}
                items={[
                    { label: 'Space freed', detail: bytes(size), icon: <HardDrive aria-hidden /> },
                    { label: 'Files removed', count: files, icon: <FileText aria-hidden /> },
                    ...(talks > 0
                        ? [
                              {
                                  label: doomed.length === 1 ? 'Conversations that use it' : 'Conversations that use them',
                                  count: talks,
                                  detail: 'They keep their messages and ask for another model.',
                                  icon: <MessageSquare aria-hidden />,
                              },
                          ]
                        : []),
                ]}
            />
        </ConfirmDialog>
    )
    return { ask, dialog }
}
