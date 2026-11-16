/**
 * How `CodeEditor` tells a prop given afresh from one that changed, so a parent that builds its
 * marks, words or language spec in each render does not make the editor check or parse again.
 */
import { Annotation, type Transaction } from '@codemirror/state'
import { useState } from 'react'

/** Whether two lists of marks mark the same: the same places, tones and messages. */
export function sameMarks(a: readonly unknown[], b: readonly unknown[]): boolean {
    return a === b || JSON.stringify(a) === JSON.stringify(b)
}

/** Whether two sets of words say the same: the same keys, each with the same string or function. */
export function sameWords(a: object | undefined, b: object | undefined): boolean {
    if (a === b) return true
    if (a === undefined || b === undefined) return false
    const keys = Object.keys(a)
    return (
        keys.length === Object.keys(b).length &&
        keys.every((key) => Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
    )
}

/**
 * Whether two languages are the same: one name, one `LanguageSupport`, or two stream parsers of one
 * name, since a parser written inline is a new object in every render.
 */
export function sameLanguage(a: unknown, b: unknown): boolean {
    if (a === b) return true
    const named = (language: unknown) =>
        typeof language === 'object' && language !== null && 'token' in language && 'name' in language ? String(language.name) : undefined
    const name = named(a)
    return name !== undefined && name === named(b)
}

/** The value as given, or the one kept from before while `same` says nothing changed. */
export function useSteady<T>(value: T, same: (kept: T, given: T) => boolean): T {
    const [kept, setKept] = useState(value)
    if (kept === value || same(kept, value)) return kept
    setKept(value)
    return value
}

/** Marks the transaction that puts a new `value` in, so it is not reported back through `onChange`. */
export const fromValue = Annotation.define<boolean>()

/** Whether an update's transactions include an edit made in the editor, rather than one putting a new `value` in. */
export function editedHere(transactions: readonly Transaction[]): boolean {
    return transactions.some((transaction) => transaction.docChanged && transaction.annotation(fromValue) !== true)
}
