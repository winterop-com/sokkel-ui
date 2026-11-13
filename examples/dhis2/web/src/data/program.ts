/**
 * The one program on the simulated server, an event program for inspecting water points, its form's
 * fields with the rule variables that read them, and the engine that runs its program rules on the
 * form as it is filled: hiding fields, assigning values, and showing warnings, errors and text.
 */
import { check } from './check'
import { evaluate, type Value } from './expression'
import { CONSTANTS, TODAY, constant, uid } from './metadata'
import type { Version } from './versions'

export const PROGRAM = { id: uid('pr:WATER_POINT'), name: 'Water point inspection', stage: 'Inspection' }

export type FieldType = 'option' | 'boolean' | 'number' | 'text' | 'date'

export interface ProgramField {
    /** The program rule variable that reads the field, as a rule writes it in `#{}`. */
    variable: string
    label: string
    type: FieldType
    options?: { value: string; label: string }[]
    /** Whether the field takes what a rule assigns rather than what is typed. */
    assigned?: boolean
}

export const FIELDS: ProgramField[] = [
    {
        variable: 'water source',
        label: 'Water source',
        type: 'option',
        options: [
            { value: 'well', label: 'Well' },
            { value: 'tap', label: 'Tap' },
            { value: 'river', label: 'River' },
            { value: 'rain tank', label: 'Rain tank' },
        ],
    },
    { variable: 'treated', label: 'Water treated', type: 'boolean' },
    { variable: 'reason not treated', label: 'Reason not treated', type: 'text' },
    { variable: 'samples taken', label: 'Samples taken', type: 'number' },
    { variable: 'samples failed', label: 'Samples failed', type: 'number' },
    { variable: 'risk score', label: 'Risk score', type: 'number', assigned: true },
    { variable: 'follow-up date', label: 'Follow-up date', type: 'date' },
]

export const VARIABLES = FIELDS.map((field) => field.variable)

/** The `V{}` variables the form gives a rule: the inspection's date and today. */
export const EVALUATED_VARIABLES = ['event_date', 'current_date']

export type ActionType = 'HIDEFIELD' | 'SHOWWARNING' | 'SHOWERROR' | 'ASSIGN' | 'DISPLAYTEXT'

export const ACTIONS: Record<ActionType, { label: string; field: boolean; data: boolean; content: boolean }> = {
    HIDEFIELD: { label: 'Hide field', field: true, data: false, content: false },
    SHOWWARNING: { label: 'Show warning', field: true, data: true, content: true },
    SHOWERROR: { label: 'Show error', field: true, data: true, content: true },
    ASSIGN: { label: 'Assign value', field: true, data: true, content: false },
    DISPLAYTEXT: { label: 'Display text', field: false, data: true, content: true },
}

export interface RuleAction {
    key: string
    type: ActionType
    /** The field the action is about, by its variable. */
    field: string
    content: string
    /** An expression whose value is assigned, or written after the content. */
    data: string
}

export interface ProgramRule {
    id: string
    name: string
    description: string
    priority: number
    condition: string
    actions: RuleAction[]
}

const SAMPLES = CONSTANTS[1]

let made = 0
export function newAction(type: ActionType = 'SHOWWARNING'): RuleAction {
    made += 1
    return { key: `action-${String(made)}-${Date.now().toString(36)}`, type, field: FIELDS[0].variable, content: '', data: '' }
}

const action = (type: ActionType, field: string, content = '', data = ''): RuleAction => ({
    key: uid(`act:${type}:${field}:${content}:${data}`),
    type,
    field,
    content,
    data,
})

export const RULE_SEED = (): ProgramRule[] => [
    {
        id: uid('prr:REASON'),
        name: 'Reason only when untreated',
        description: 'Asks why the water was not treated, once it is known that it was not.',
        priority: 1,
        condition: '!d2:hasValue(#{treated}) || #{treated}',
        actions: [action('HIDEFIELD', 'reason not treated')],
    },
    {
        id: uid('prr:RISK'),
        name: 'Risk score',
        description: 'Scores the water point from its source, its treatment and the samples that failed.',
        priority: 2,
        condition: 'true',
        actions: [
            action(
                'ASSIGN',
                'risk score',
                '',
                "if(#{water source} == 'river', 3, if(#{water source} == 'well', 2, 1))\n  + if(d2:hasValue(#{treated}) && !#{treated}, 2, 0)\n  + d2:zing(#{samples failed})",
            ),
        ],
    },
    {
        id: uid('prr:FAILED'),
        name: 'Failed within taken',
        description: 'No more samples can fail than were taken.',
        priority: 3,
        condition: 'd2:hasValue(#{samples failed}) && #{samples failed} > #{samples taken}',
        actions: [action('SHOWERROR', 'samples failed', 'More samples failed than were taken.')],
    },
    {
        id: uid('prr:RIVER'),
        name: 'Untreated river water',
        description: 'Warns when river water is drunk untreated.',
        priority: 4,
        condition: "#{water source} == 'river'\n  && d2:hasValue(#{treated}) && !#{treated}",
        actions: [action('SHOWWARNING', 'treated', 'River water should be treated before it is drunk.')],
    },
    {
        id: uid('prr:FOLLOW_UP'),
        name: 'Follow-up when at risk',
        description: 'Asks for a follow-up date only for a water point whose risk score is 4 or more.',
        priority: 5,
        condition: '#{risk score} < 4',
        actions: [action('HIDEFIELD', 'follow-up date')],
    },
    {
        id: uid('prr:FOLLOW_UP_SOON'),
        name: 'Follow-up within a month',
        description: 'Warns when the follow-up is set more than 30 days after the inspection.',
        priority: 6,
        condition: 'd2:hasValue(#{follow-up date})\n  && d2:daysBetween(V{event_date}, #{follow-up date}) > 30',
        actions: [
            action(
                'SHOWWARNING',
                'follow-up date',
                'The follow-up is more than 30 days after the inspection: ',
                "d2:concatenate(d2:daysBetween(V{event_date}, #{follow-up date}), ' days')",
            ),
        ],
    },
    {
        id: uid('prr:SAMPLES'),
        name: 'Samples short of target',
        description: 'Says when fewer samples were taken than each site should take.',
        priority: 7,
        condition: `d2:hasValue(#{samples taken}) && #{samples taken} < C{${SAMPLES.id}}`,
        actions: [action('DISPLAYTEXT', '', 'Samples asked of each site: ', `C{${SAMPLES.id}}`)],
    },
]

export interface Effect {
    rule: string
    type: ActionType
    field?: string
    text: string
}

export interface RuleRun {
    hidden: Set<string>
    assigned: Record<string, Value>
    effects: Effect[]
    /** Rules that could not run, with why. */
    broken: { rule: string; message: string }[]
}

/** The form's values as the rules read them, assigned values taking the place of typed ones. */
export function runRules(
    rules: readonly ProgramRule[],
    values: Readonly<Record<string, Value>>,
    eventDate: string,
    version: Version,
): RuleRun {
    const current: Record<string, Value> = { ...values }
    const run: RuleRun = { hidden: new Set(), assigned: {}, effects: [], broken: [] }
    const context = { version, variables: VARIABLES, evaluatedVariables: EVALUATED_VARIABLES }
    const scope = {
        item: (node: { kind: string; body: string }): Value => {
            const body = node.body.trim()
            if (node.kind === '#' || node.kind === 'A') return current[body] ?? null
            if (node.kind === 'C') return constant(body)?.value ?? null
            if (node.kind === 'V') return body === 'event_date' ? eventDate : body === 'current_date' ? TODAY : null
            return null
        },
    }
    const ordered = [...rules].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
    for (const rule of ordered) {
        const condition = check(rule.condition, 'rule', context)
        const broken = condition.findings.find((finding) => finding.tone === 'error')
        if (condition.node === null || broken !== undefined) {
            run.broken.push({ rule: rule.id, message: broken?.message ?? 'The condition cannot be read.' })
            continue
        }
        const value = evaluate(condition.node, scope).value
        if (
            !(
                value === true ||
                (typeof value === 'number' && value !== 0) ||
                (typeof value === 'string' && value !== '' && value !== 'false')
            )
        )
            continue
        for (const one of rule.actions) {
            let data: Value = null
            if (ACTIONS[one.type].data && one.data.trim() !== '') {
                const checked = check(one.data, 'rule', context)
                const wrong = checked.findings.find((finding) => finding.tone === 'error')
                if (checked.node === null || wrong !== undefined) {
                    run.broken.push({ rule: rule.id, message: wrong?.message ?? 'An action’s expression cannot be read.' })
                    continue
                }
                data = evaluate(checked.node, scope).value
            }
            const said = `${one.content}${data === null ? '' : String(typeof data === 'number' ? Math.round(data * 100) / 100 : data)}`
            if (one.type === 'HIDEFIELD') {
                run.hidden.add(one.field)
                run.effects.push({ rule: rule.id, type: one.type, field: one.field, text: 'Hidden' })
            } else if (one.type === 'ASSIGN') {
                current[one.field] = data
                run.assigned[one.field] = data
                run.effects.push({
                    rule: rule.id,
                    type: one.type,
                    field: one.field,
                    text: `Set to ${data === null ? 'nothing' : String(data)}`,
                })
            } else run.effects.push({ rule: rule.id, type: one.type, field: ACTIONS[one.type].field ? one.field : undefined, text: said })
        }
    }
    return run
}
