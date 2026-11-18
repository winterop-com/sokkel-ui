/**
 * The words a part says, as the app's `LocaleProvider` gives them: each part's English words under
 * its own id, translated from the provider's catalog, with the words an instance is given on top.
 * This module holds only what every part needs to ask; the catalog's reading and formatting load with
 * `LocaleProvider`, so an app without one pays for neither.
 */
import { createContext, useContext } from 'react'

/** The keys of a part's words that are phrases taking arguments. */
export type PhraseKeys<W> = { [K in keyof W]-?: NonNullable<W[K]> extends (...args: never[]) => unknown ? K : never }[keyof W]

/**
 * The words of one part as a catalog knows them. Each word's message id is the part's `id` and the
 * word's key (`dataTable.rows`), a nested word's the path to it (`emojiPicker.groups.recent`, and
 * `calendar.dayNames.0` for a list).
 */
export interface WordsPart<W extends object> {
    /** The part's id: its words' constant named in camel case (`DATA_TABLE_WORDS` is `dataTable`). */
    id: string
    /** The English words. */
    words: W
    /** Each phrase's argument names, in the order the phrase takes them, apart by spaces: `rowMoved: 'row place count'`. */
    args?: { [K in PhraseKeys<W>]?: string }
    /** The parts these words take words from, which a catalog holds under those parts' ids. */
    from?: readonly WordsPart<object>[]
}

/**
 * Each phrase of a part as an ICU message in English (`'{count, plural, one {# row} other {# rows}}'`),
 * from which `bun run messages` writes the catalog, or null for a word that formats rather than says,
 * which only a part's `words` change.
 */
export type WordMessages<W> = { [K in PhraseKeys<W> as undefined extends W[K] ? never : K]: string | null } & {
    [K in PhraseKeys<W> as undefined extends W[K] ? K : never]?: string | null
}

/** What a `LocaleProvider` hands the parts under it. */
export interface LocaleState {
    /** The locale, a BCP 47 tag. */
    locale: string
    /** The provider's catalog, by message id. */
    messages: Readonly<Record<string, string>> | undefined
    /** A part's words, translated from the catalog. */
    words: <W extends object>(part: WordsPart<W>) => W
}

export const LocaleContext = createContext<LocaleState | null>(null)

/** The locale numbers, dates, lists and sorting follow: the `LocaleProvider`'s, or `en-US` without one. */
export function useLocale(): string {
    return useContext(LocaleContext)?.locale ?? 'en-US'
}

/**
 * A part's words: those it is given over the provider's translation over its English words. A part
 * merging a nested set of words (`groups`) merges it over the result itself.
 */
export function useWords<W extends object>(part: WordsPart<W>, given?: Partial<W>): W {
    const context = useContext(LocaleContext)
    const words = context ? context.words(part) : part.words
    return given ? { ...words, ...given } : words
}
