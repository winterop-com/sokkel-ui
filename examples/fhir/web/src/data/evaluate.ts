/**
 * FHIRPath evaluated in the page by the `fhirpath` engine against the R4 model, and the words the
 * editor offers while an expression is typed.
 */
import type { CodeCompletion } from '@winterop-com/sokkel-ui/CodeEditor'
import fhirpath from 'fhirpath'
import r4 from 'fhirpath/fhir-context/r4'

import type { Resource } from './model'

export type Evaluation =
    | { state: 'empty' }
    | { state: 'done'; value: unknown[]; ms: number }
    | { state: 'failed'; message: string; line?: number; column?: number }

/** Evaluates an expression against a resource or a Bundle, `%resource` and `%context` bound to it, `%loinc` and `%sct` to their systems. */
export function evaluate(expression: string, subject: Resource | undefined): Evaluation {
    const code = expression.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, '')
    if (code.trim() === '' || subject === undefined) return { state: 'empty' }
    const start = performance.now()
    try {
        const value = fhirpath.evaluate(
            subject,
            expression,
            { resource: subject, loinc: 'http://loinc.org', sct: 'http://snomed.info/sct' },
            r4,
        ) as unknown[]
        return { state: 'done', value, ms: performance.now() - start }
    } catch (error) {
        const text = error instanceof Error ? error.message : String(error)
        const at = /line:\s*(\d+);\s*column:\s*(\d+);\s*message:\s*([\s\S]*)/.exec(text)
        if (at !== null) return { state: 'failed', line: Number(at[1]), column: Number(at[2]), message: (at[3] ?? text).trim() }
        return { state: 'failed', message: text }
    }
}

const fn = (label: string, detail: string, docs: string): CodeCompletion => ({ label, detail, docs, kind: 'function' })

/** The FHIRPath functions the editor offers, each with its signature and what it does. */
export const FUNCTIONS: readonly CodeCompletion[] = [
    fn('where', 'where(criteria)', 'The items for which the criteria are true.'),
    fn('select', 'select(projection)', 'The projection evaluated on each item, flattened.'),
    fn('exists', 'exists([criteria])', 'True when the collection, or the items matching the criteria, are not empty.'),
    fn('empty', 'empty()', 'True when the collection is empty.'),
    fn('all', 'all(criteria)', 'True when the criteria hold for every item.'),
    fn('count', 'count()', 'The number of items.'),
    fn('first', 'first()', 'The first item.'),
    fn('last', 'last()', 'The last item.'),
    fn('tail', 'tail()', 'Every item but the first.'),
    fn('skip', 'skip(num)', 'Every item after the first num.'),
    fn('take', 'take(num)', 'The first num items.'),
    fn('distinct', 'distinct()', 'The items with duplicates removed.'),
    fn('ofType', 'ofType(type)', 'The items of the given type, such as ofType(Quantity).'),
    fn('is', 'is(type)', 'True when the single item is of the type.'),
    fn('as', 'as(type)', 'The single item if it is of the type, else empty.'),
    fn('iif', 'iif(criterion, true-result [, otherwise-result])', 'One result or the other by the criterion.'),
    fn('not', 'not()', 'The negation of a single Boolean.'),
    fn('contains', 'contains(substring)', 'True when the string holds the substring.'),
    fn('startsWith', 'startsWith(prefix)', 'True when the string starts with the prefix.'),
    fn('endsWith', 'endsWith(suffix)', 'True when the string ends with the suffix.'),
    fn('matches', 'matches(regex)', 'True when the string matches the regular expression.'),
    fn('replace', 'replace(pattern, substitution)', 'The string with each pattern replaced.'),
    fn('substring', 'substring(start [, length])', 'Part of the string.'),
    fn('upper', 'upper()', 'The string in upper case.'),
    fn('lower', 'lower()', 'The string in lower case.'),
    fn('length', 'length()', 'The number of characters in the string.'),
    fn('join', 'join([separator])', 'The strings joined into one.'),
    fn('split', 'split(separator)', 'The string split at each separator.'),
    fn('toString', 'toString()', 'The single item as a string.'),
    fn('toInteger', 'toInteger()', 'The single item as an integer.'),
    fn('toDecimal', 'toDecimal()', 'The single item as a decimal.'),
    fn('toDate', 'toDate()', 'The single item as a date.'),
    fn('sum', 'sum()', 'The sum of the numbers.'),
    fn('min', 'min()', 'The least of the items.'),
    fn('max', 'max()', 'The greatest of the items.'),
    fn('avg', 'avg()', 'The mean of the numbers.'),
    fn('round', 'round([precision])', 'The number rounded.'),
    fn('abs', 'abs()', 'The absolute value.'),
    fn('today', 'today()', 'The current date.'),
    fn('now', 'now()', 'The current date and time.'),
    fn('children', 'children()', 'Every child element of each item.'),
    fn('descendants', 'descendants()', 'Every element under each item.'),
    fn('repeat', 'repeat(projection)', 'The projection applied again and again, every result kept.'),
    fn('aggregate', 'aggregate(aggregator [, init])', 'A value built over the items, with $this and $total.'),
    fn('union', 'union(other)', 'The items of both collections, without duplicates.'),
    fn('combine', 'combine(other)', 'The items of both collections, duplicates kept.'),
    fn('intersect', 'intersect(other)', 'The items in both collections.'),
    fn('exclude', 'exclude(other)', 'The items not in the other collection.'),
    fn('hasValue', 'hasValue()', 'True when the single item is a primitive with a value.'),
    fn('extension', 'extension(url)', 'The extensions with the given address.'),
    fn('trace', 'trace(name)', 'The collection unchanged, logged under the name.'),
]

/** The variables an expression can name. */
export const VARIABLES: readonly CodeCompletion[] = [
    { label: '%resource', detail: 'the subject', docs: 'The resource or Bundle the expression is evaluated against.', kind: 'variable' },
    { label: '%context', detail: 'the subject', docs: 'Where evaluation started: the same subject.', kind: 'variable' },
    { label: '%ucum', detail: "'http://unitsofmeasure.org'", docs: 'The address of the units of measure.', kind: 'constant' },
    { label: '%sct', detail: "'http://snomed.info/sct'", docs: 'The address of SNOMED CT.', kind: 'constant' },
    { label: '%loinc', detail: "'http://loinc.org'", docs: 'The address of LOINC.', kind: 'constant' },
]

/** Every element name in a resource, at any depth, offered as a property after a dot. */
export function elementNames(subject: unknown): CodeCompletion[] {
    const names = new Set<string>()
    const walk = (value: unknown, depth: number) => {
        if (depth > 6 || typeof value !== 'object' || value === null) return
        if (Array.isArray(value)) {
            for (const item of value.slice(0, 20)) walk(item, depth + 1)
            return
        }
        for (const [name, child] of Object.entries(value)) {
            names.add(
                name.replace(/(DateTime|Quantity|String|CodeableConcept|Boolean|Period)$/, (suffix) => (name === suffix ? suffix : '')),
            )
            walk(child, depth + 1)
        }
    }
    walk(subject, 0)
    return [...names]
        .filter((name) => name !== '')
        .sort()
        .map((name) => ({ label: name, kind: 'property' as const }))
}

/** What a word in an expression is, for the editor's hover. */
export function describeWord(word: string): string | null {
    const found = [...FUNCTIONS, ...VARIABLES].find((one) => one.label === word || one.label === `%${word}`)
    return found === undefined ? null : `${found.detail ?? found.label}: ${found.docs ?? ''}`
}
