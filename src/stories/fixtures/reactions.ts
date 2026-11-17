import { useState } from 'react'

import { toggleReaction, type ChatReaction } from '@winterop-com/sokkel-ui/ReactionBar'

/** The emoji a story's picker lists as picked lately, newest first. */
export const RECENT_EMOJI: readonly string[] = ['\u{1F680}', '✅', '\u{1F440}', '\u{1F64F}', '\u{1F525}', '\u{1F4AF}']

/**
 * The reactions of every message in a story, by the message's key: `of(key)` hands a message its
 * reactions and the handlers that give or take back one, from a chip or from the reaction bar,
 * and the bar's recent emoji, which follow what is picked from the full list.
 */
export function useReactionState(start: Record<string, ChatReaction[]> = {}) {
    const [all, setAll] = useState(start)
    const [recent, setRecent] = useState<readonly string[]>(RECENT_EMOJI)
    const toggle = (key: string, emoji: string, name?: string) =>
        setAll((current) => ({ ...current, [key]: toggleReaction(current[key] ?? [], emoji, name) }))
    const of = (key: string) => ({
        reactions: all[key] ?? [],
        onReact: (id: string) => toggle(key, id),
        onReaction: (emoji: string, name: string) => toggle(key, emoji, name),
        reactionBar: { picker: { recent, onRecentChange: setRecent } },
    })
    return { of, all, toggle, recent, setRecent }
}
