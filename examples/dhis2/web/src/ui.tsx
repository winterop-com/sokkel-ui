import { CodeEditor, type CodeCompletion, type CodeMark } from '@winterop-com/sokkel-ui/CodeEditor'
import { Field } from '@winterop-com/sokkel-ui/Field'
import type { Issue } from '@winterop-com/sokkel-ui/IssueMark'
import type { StatusMap } from '@winterop-com/sokkel-ui/lib/status'
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'

import { check, itemName, type CheckContext, type Checked } from './data/check'
import { describe as describeExpression, EVALUATED, type Language } from './data/expression'
import { CONSTANTS, DATA_ELEMENTS, DATA_SET, dataElement, optionCombo, REPORTING_METRICS } from './data/metadata'
import { LATEST, namesOf, type Version } from './data/versions'

/** The version the simulated server runs, which every check and every editor reads. */
export const VersionContext = createContext<Version>(LATEST)

export function useVersion(): Version {
    return useContext(VersionContext)
}

export const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

/** A value as the pages write it, a dash for none. */
export function figure(value: number | null | undefined, unit = ''): string {
    return value === null || value === undefined ? '–' : `${NUMBER.format(value)}${unit}`
}

/** The plural of a count's noun. */
export function count(value: number, one: string, many = `${one}s`): string {
    return `${NUMBER.format(value)} ${value === 1 ? one : many}`
}

/** What the shell's foot says for the page: a note at its start and facts at its end. */
export interface Foot {
    note?: ReactNode
    items?: ReactNode
}

export const FootContext = createContext<(foot: Foot) => void>(() => undefined)

/** Says what the shell's foot holds while a page is shown. */
export function useFoot(note: ReactNode, items?: ReactNode, deps: readonly unknown[] = [note]): void {
    const set = useContext(FootContext)
    useEffect(() => {
        set({ note, items })
        // The foot follows the words the page passes, not the nodes made anew each draw.
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- the deps say when the foot's words change
    }, [set, ...deps])
}

/** An expression checked against the server as it is typed. */
export function useChecked(source: string, language: Language, context: Omit<CheckContext, 'version'> = {}): Checked {
    const version = useVersion()
    const { variables, evaluatedVariables, indicators } = context
    return useMemo(
        () => check(source, language, { version, variables, evaluatedVariables, indicators }),
        [source, language, version, variables, evaluatedVariables, indicators],
    )
}

/** Where a finding's offset falls, as a line and column counted from 1. */
function lineOf(source: string, offset: number): number {
    return source.slice(0, offset).split('\n').length
}

/** A finding as the field's issue mark lists it, with the line it is on. */
export function issuesOf(source: string, checked: Checked): Issue[] {
    return checked.findings.map((finding) => ({
        tone: finding.tone === 'error' ? 'critical' : 'warning',
        text: source.includes('\n') ? `Line ${String(lineOf(source, finding.from))}: ${finding.message}` : finding.message,
    }))
}

/** The words a function is offered with: its name and whether the workbench runs it. */
function functionWord(name: string): CodeCompletion {
    const label = name.startsWith('.') ? name.slice(1) : name
    return {
        label: label.startsWith('d2:') ? label.slice(3) : label,
        detail: EVALUATED[name] === undefined ? 'function, not evaluated here' : 'function',
        kind: 'function',
        apply: `${label.startsWith('d2:') ? label.slice(3) : label}(`,
    }
}

/**
 * The words offered as an expression is typed: inside `#{` the data elements by name (inserting
 * their uid) or, after a data element and a dot, its category option combos; inside `C{` and `R{`
 * the constants and the data set; inside a rule's `#{` the program's variables; elsewhere the
 * functions the server's version knows.
 */
function completer(language: Language, version: Version, variables: readonly string[]) {
    const names = namesOf(version)
    return (_word: string, { before }: { before: string }): CodeCompletion[] => {
        const open = /([#ACRV]|OUG)\{([^}]*)$/.exec(before)
        if (open !== null) {
            const [, kind, inside] = open
            if (language === 'rule' && (kind === '#' || kind === 'A'))
                return variables.map((variable) => ({ label: variable, detail: 'rule variable', kind: 'variable', apply: `${variable}}` }))
            if (language === 'rule' && kind === 'V')
                return names.variables.map((variable) => ({
                    label: variable,
                    detail: 'program variable',
                    kind: 'variable',
                    apply: `${variable}}`,
                }))
            if (kind === 'C') return CONSTANTS.map((one) => ({ label: one.name, detail: one.id, kind: 'constant', apply: `${one.id}}` }))
            if (kind === 'R')
                return inside.includes('.')
                    ? REPORTING_METRICS.map((metric) => ({ label: metric, kind: 'enum', apply: `${metric}}` }))
                    : [{ label: DATA_SET.name, detail: DATA_SET.id, kind: 'type', apply: `${DATA_SET.id}.` }]
            if (kind === '#') {
                const element = dataElement(inside.split('.')[0])
                if (inside.includes('.') && element !== undefined)
                    return element.categoryCombo.combos.map((combo) => ({
                        label: combo.name,
                        detail: combo.id,
                        kind: 'enum',
                        apply: `${combo.id}}`,
                    }))
                return DATA_ELEMENTS.map((one) => ({ label: one.name, detail: one.id, kind: 'variable', apply: one.id }))
            }
            return []
        }
        const afterDot = /\)\s*\.$|\}\s*\.$/.test(before)
        if (afterDot) return names.functions.filter((name) => name.startsWith('.')).map(functionWord)
        if (before.endsWith('d2:')) return names.functions.filter((name) => name.startsWith('d2:')).map(functionWord)
        return names.functions
            .filter((name) => !name.startsWith('.') && !name.startsWith('d2:'))
            .map(functionWord)
            .concat(language === 'rule' ? [{ label: 'd2:', detail: 'program functions', kind: 'keyword' as const, apply: 'd2:' }] : [])
    }
}

/** What a uid under the pointer stands for, by its kind of metadata. */
function hoverWord(word: string): ReactNode {
    const element = dataElement(word)
    if (element !== undefined) return `${element.name}: data element, by ${element.categoryCombo.name}`
    const combo = optionCombo(word)
    if (combo !== undefined) return `${combo.name}: category option combo`
    const found = CONSTANTS.find((one) => one.id === word)
    if (found !== undefined) return `${found.name}: constant, ${String(found.value)}`
    if (word === DATA_SET.id) return `${DATA_SET.name}: data set`
    return null
}

export interface ExpressionFieldProps {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    language: Language
    checked: Checked
    context?: Omit<CheckContext, 'version'>
    description?: ReactNode
    readOnly?: boolean
}

/**
 * An expression in its field: the dhis2 language's colors, the server's findings underlined and
 * listed on the field's issue mark, words offered as typed, uids named on hover, and the expression
 * read back with the names it stands for.
 */
export function ExpressionField({
    id,
    label,
    value,
    onChange,
    language,
    checked,
    context = {},
    description,
    readOnly,
}: ExpressionFieldProps) {
    const version = useVersion()
    const variables = context.variables
    const completions = useMemo(() => completer(language, version, variables ?? []), [language, version, variables])
    const marks: CodeMark[] = useMemo(
        () =>
            checked.findings.map((finding) => ({
                from: finding.from,
                to: Math.max(finding.to, finding.from + 1),
                tone: finding.tone,
                message: finding.message,
            })),
        [checked],
    )
    const said = useMemo(
        () =>
            language === 'expression'
                ? describeItems(value)
                : value
                      .replace(/\/\*[\s\S]*?\*\//g, '')
                      .replace(/\s+/g, ' ')
                      .trim(),
        [language, value],
    )
    return (
        <Field
            id={id}
            label={label}
            description={description}
            issues={issuesOf(value, checked)}
            help={said === '' || language === 'rule' ? undefined : `Reads as: ${said}`}
        >
            <CodeEditor
                id={id}
                label={label}
                language={language === 'expression' ? 'dhis2-expression' : 'dhis2-rule'}
                value={value}
                onChange={onChange}
                marks={marks}
                completions={completions}
                hover={hoverWord}
                lineNumbers={false}
                size="sm"
                wrap
                readOnly={readOnly}
                invalid={checked.findings.some((finding) => finding.tone === 'error')}
            />
        </Field>
    )
}

/** The states the pages draw as chips: an expression's verdict and a rule's importance. */
export const STATUSES: StatusMap = {
    valid: { color: 'good' },
    warnings: { color: 'warning' },
    invalid: { color: 'critical' },
    high: { color: 'critical' },
    medium: { color: 'warning' },
    low: { color: 'neutral' },
}

/** How a set of checks went, as one state. */
export function verdict(...checks: Checked[]): 'valid' | 'warnings' | 'invalid' {
    const findings = checks.flatMap((one) => one.findings)
    return findings.some((one) => one.tone === 'error') ? 'invalid' : findings.length > 0 ? 'warnings' : 'valid'
}

/** An aggregate expression with its items written as the names they stand for. */
export function describeItems(source: string): string {
    return describeExpression(source, (kind, body) => {
        const name = itemName(kind, body.trim())
        return name === undefined ? undefined : `{${name}}`
    })
}
