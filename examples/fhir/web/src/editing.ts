/**
 * What is being edited: each resource's unsaved text and the version it was read at, kept in the
 * browser so an edit survives a reload, and the server's last word on each. The resource's page and
 * its side panel read the same.
 */
import type { CodeRange } from '@winterop-com/sokkel-ui/CodeEditor'
import { useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { createStore } from '@winterop-com/sokkel-ui/lib/stored'

import type { Issue } from './data/model'

export interface Draft {
    text: string
    /** The version the edit started from, sent as If-Match. */
    readAt: number
}

export const drafts = createStore<Record<string, Draft>>({}, { key: 'drafts' })

/** What the server said the last time a resource was saved, by its key. */
export const answers = createStore<Record<string, readonly Issue[]>>({})

/** Where the editor is asked to go, such as the value a finding is about. */
export const reveals = createStore<CodeRange | null>(null)

export function useDraft(key: string): Draft | undefined {
    return useStore(drafts)[key]
}

export function setDraft(key: string, draft: Draft | undefined): void {
    drafts.update((all) => {
        const next = { ...all }
        if (draft === undefined) delete next[key]
        else next[key] = draft
        return next
    })
}

export function useAnswer(key: string): readonly Issue[] {
    return useStore(answers)[key] ?? NONE
}

const NONE: readonly Issue[] = []

export function setAnswer(key: string, issues: readonly Issue[]): void {
    answers.update((all) => ({ ...all, [key]: issues }))
}
