'use client'

import { useContext, useMemo, type ReactNode } from 'react'

import { translateWords } from '../lib/catalog'
import { LocaleContext, type LocaleState, type WordsPart } from '../lib/words'

export { useLocale, useWords, type WordsPart } from '../lib/words'

export interface LocaleProviderProps {
    /** The locale numbers, dates, lists, sorting and plurals follow, as a BCP 47 tag; the outer provider's, or `en-US`. */
    locale?: string
    /**
     * The catalog: ICU MessageFormat strings by message id (`dataTable.rows`), such as a translation of
     * `@winterop-com/sokkel-ui/messages/en.json`; the outer provider's when not given. A word it does not
     * hold stays English.
     */
    messages?: Readonly<Record<string, string>>
    children?: ReactNode
}

/**
 * Gives every part under it a locale and a catalog of words. Wrap the app once; a part's own `words`
 * still win over the catalog, word by word.
 */
export function LocaleProvider({ locale, messages, children }: LocaleProviderProps) {
    const outer = useContext(LocaleContext)
    const tag = locale ?? outer?.locale ?? 'en-US'
    const catalog = messages ?? outer?.messages
    const value = useMemo<LocaleState>(() => {
        const done = new WeakMap<object, object>()
        return {
            locale: tag,
            messages: catalog,
            words: <W extends object>(part: WordsPart<W>): W => {
                if (catalog === undefined) return part.words
                let found = done.get(part) as W | undefined
                if (found === undefined) {
                    found = translateWords(part, catalog, tag)
                    done.set(part, found)
                }
                return found
            },
        }
    }, [tag, catalog])
    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
