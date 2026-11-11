/**
 * `SchemaForm`'s words for each issue the checker finds, loaded with the checker, since no issue
 * but these is known before it.
 */
import type { SchemaIssue } from './issues'
import { literal, type JsonSchema } from './read'

const FORMAT: Record<string, { text: string; detail?: string }> = {
    email: { text: 'Enter an email address', detail: 'As in ada@example.org.' },
    uri: { text: 'Enter a full address', detail: 'Starting with https://.' },
    url: { text: 'Enter a full address', detail: 'Starting with https://.' },
    date: { text: 'Enter a date', detail: 'As in 2026-11-05.' },
    'date-time': { text: 'Enter a date and time', detail: 'As in 2026-11-05T09:30:00Z.' },
    time: { text: 'Enter a time', detail: 'As in 09:30:00.' },
    uuid: { text: 'Enter a UUID', detail: 'As in 0b6f4c1e-2f6a-4c9e-9d3b-6f1d2e8a7c55.' },
    hostname: { text: 'Enter a host name', detail: 'As in hooks.example.org.' },
    ipv4: { text: 'Enter an IPv4 address', detail: 'As in 192.0.2.10.' },
}

/** An issue in plain English: `SchemaForm`'s words for what the checker finds. */
export function sayIssue(issue: SchemaIssue, schema: JsonSchema): { text: string; detail?: string } {
    const plural = (count: number, unit: string) => `${String(count)} ${count === 1 ? unit : `${unit}s`}`
    switch (issue.kind) {
        case 'required':
            return { text: schema.enum !== undefined ? 'Choose a value' : 'Enter a value' }
        case 'type':
            return {
                text:
                    issue.expected === 'integer'
                        ? 'Enter a whole number'
                        : issue.expected === 'number'
                          ? 'Enter a number'
                          : `Enter a value of type ${issue.expected}`,
            }
        case 'enum':
            return { text: 'Choose one of the values', detail: issue.values.map(literal).join(', ') }
        case 'const':
            return { text: `Must be ${literal(issue.value)}` }
        case 'minimum':
            return { text: issue.exclusive ? `Must be more than ${String(issue.limit)}` : `Must be at least ${String(issue.limit)}` }
        case 'maximum':
            return { text: issue.exclusive ? `Must be less than ${String(issue.limit)}` : `Must be at most ${String(issue.limit)}` }
        case 'minLength':
            return { text: `Use at least ${plural(issue.limit, 'character')}` }
        case 'maxLength':
            return { text: `Use at most ${plural(issue.limit, 'character')}` }
        case 'pattern':
            return { text: 'Not in the expected form', detail: schema.description ?? `It must match ${issue.pattern}.` }
        case 'format':
            return issue.phrase !== undefined
                ? { text: issue.phrase }
                : (FORMAT[issue.format] ?? { text: `Enter a value in the ${issue.format} format` })
        case 'minItems':
            return { text: `Add at least ${plural(issue.limit, 'item')}` }
        case 'maxItems':
            return { text: `Keep at most ${plural(issue.limit, 'item')}` }
        case 'uniqueItems':
            return { text: 'Each value only once' }
        case 'deprecated':
            return { text: 'Deprecated', detail: 'Still accepted, and may be removed in a later version.' }
        case 'additional':
            return { text: `No field ${issue.property} is allowed here` }
        case 'unchecked':
            return { text: 'The values cannot be checked, so the form cannot be sent', detail: issue.reason }
        case 'other':
            return { text: issue.message.charAt(0).toUpperCase() + issue.message.slice(1) }
    }
}
