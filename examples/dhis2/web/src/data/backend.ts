/**
 * The simulated server: its indicators, validation rules and program rules as collections the
 * pages edit, and the analytics that run an expression for an organization unit and a month.
 */
import { collection } from 'tidevann-shared/backend'

import { evaluate, type ItemNode, type Node, type Value } from './expression'
import { CONSTANTS, DATA_SET, DE, AGE_COMBO, constant, daysIn, orgUnit, shiftPeriod, uid } from './metadata'
import { RULE_SEED, type ProgramRule } from './program'
import { dataValue, reports } from './values'

export const SERVER = { name: 'tidevann-metadata', address: 'https://metadata.example.org' }
export const ME = 'ada'

// Indicators

export type IndicatorType = 'percent' | 'perThousand' | 'number'

export const INDICATOR_TYPES: Record<IndicatorType, { label: string; factor: number; unit: string }> = {
    percent: { label: 'Percent', factor: 100, unit: '%' },
    perThousand: { label: 'Per thousand', factor: 1000, unit: '‰' },
    number: { label: 'Number', factor: 1, unit: '' },
}

export interface Indicator {
    id: string
    code: string
    name: string
    description: string
    type: IndicatorType
    numerator: string
    denominator: string
}

const [UNDER5] = AGE_COMBO.combos

const indicator = (
    code: string,
    name: string,
    type: IndicatorType,
    numerator: string,
    denominator: string,
    description: string,
): Indicator => ({
    id: uid(`ind:${code}`),
    code,
    name,
    description,
    type,
    numerator,
    denominator,
})

const INDICATOR_SEED = (): Indicator[] => [
    indicator(
        'IND_VACC_COVERAGE',
        'Vaccination coverage',
        'percent',
        `#{${DE.vaccinated.id}}`,
        `#{${DE.due.id}}`,
        'Children given their last dose, of those it fell due for.',
    ),
    indicator(
        'IND_VACC_TARGET',
        'Coverage against target',
        'percent',
        `/* coverage in percent */\n#{${DE.vaccinated.id}} / #{${DE.due.id}} * 100`,
        `C{${CONSTANTS[0].id}}`,
        'Vaccination coverage as a share of the target the constant holds.',
    ),
    indicator(
        'IND_UNDER5_SHARE',
        'Under-five share of visits',
        'percent',
        `#{${DE.visits.id}.${UNDER5.id}}`,
        `#{${DE.visits.id}}`,
        'Outpatient visits by children under five, of all visits.',
    ),
    indicator(
        'IND_REFERRAL_RATE',
        'Referrals per 1,000 visits',
        'perThousand',
        `#{${DE.referrals.id}}`,
        `#{${DE.visits.id}.*}`,
        'People sent on to another site, per thousand visits.',
    ),
    indicator(
        'IND_VISITS_PER_DAY',
        'Visits per day',
        'number',
        `#{${DE.visits.id}}`,
        '[days]',
        'Outpatient visits over the days in the month.',
    ),
    indicator(
        'IND_WATER_PASS',
        'Water samples passing',
        'percent',
        `#{${DE.samplesTaken.id}} - #{${DE.samplesFailed.id}}`,
        `greatest(#{${DE.samplesTaken.id}}, 1)`,
        'Samples that passed the test, of those taken.',
    ),
    indicator(
        'IND_STOCK_CHANGE',
        'Stock change on last month',
        'number',
        `#{${DE.stockOnHand.id}}\n  - #{${DE.stockOnHand.id}}.periodOffset(-1)`,
        '1',
        'Kits on hand at the end of the month, against the end of the month before.',
    ),
    indicator(
        'IND_REPORTING',
        'Reporting rate',
        'number',
        `R{${DATA_SET.id}.REPORTING_RATE}`,
        '1',
        'Sites that sent the monthly report, in percent of those that should.',
    ),
    indicator(
        'IND_REFERRALS_NONZERO',
        'Referrals, months with any',
        'number',
        `removeZeros(#{${DE.referrals.id}})`,
        '1',
        'Referrals out, leaving out months with none so they count as missing.',
    ),
]

export const indicators = collection<Indicator>('indicators', INDICATOR_SEED)

/** What an item stands for in a unit and a month, `offset` months away. */
function valueOf(node: ItemNode, unit: string, period: string, offset: number): Value {
    const at = offset === 0 ? period : shiftPeriod(period, offset)
    const body = node.body.trim()
    if (node.kind === '#') {
        const [element, combo] = body.split('.')
        return dataValue(element, combo === undefined || combo === '*' ? null : combo, unit, at)
    }
    if (node.kind === 'C') return constant(body)?.value ?? null
    if (node.kind === 'days') return daysIn(at)
    if (node.kind === 'R') {
        const [, metric] = body.split('.')
        const { actual, expected } = reports(unit, at)
        if (expected === 0) return null
        return metric === 'ACTUAL_REPORTS' ? actual : metric === 'EXPECTED_REPORTS' ? expected : (actual / expected) * 100
    }
    return null
}

/** An aggregate expression's value for a unit and a month: null when every item it reads is missing. */
export function aggregate(node: Node, unit: string, period: string): { value: number | null; items: number; missing: number } {
    const result = evaluate(node, { item: (item, offset) => valueOf(item, unit, period, offset) })
    const value = typeof result.value === 'number' ? result.value : typeof result.value === 'boolean' ? Number(result.value) : null
    return { value: result.items > 0 && result.missing === result.items ? null : value, items: result.items, missing: result.missing }
}

/** An indicator's parts and value for a unit and a month: the numerator over the denominator, times its type's factor. */
export function indicatorValue(
    numerator: Node,
    denominator: Node,
    type: IndicatorType,
    unit: string,
    period: string,
): { numerator: number | null; denominator: number | null; value: number | null } {
    const top = aggregate(numerator, unit, period).value
    const bottom = aggregate(denominator, unit, period).value
    const value = top === null || bottom === null || bottom === 0 ? null : (top / bottom) * INDICATOR_TYPES[type].factor
    return { numerator: top, denominator: bottom, value }
}

// Validation rules

export type Operator =
    | 'equal_to'
    | 'not_equal_to'
    | 'greater_than'
    | 'greater_than_or_equal_to'
    | 'less_than'
    | 'less_than_or_equal_to'
    | 'compulsory_pair'
    | 'exclusive_pair'

export const OPERATORS: Record<Operator, { label: string; sign: string }> = {
    equal_to: { label: 'Equal to', sign: '==' },
    not_equal_to: { label: 'Not equal to', sign: '!=' },
    greater_than: { label: 'Greater than', sign: '>' },
    greater_than_or_equal_to: { label: 'Greater than or equal to', sign: '>=' },
    less_than: { label: 'Less than', sign: '<' },
    less_than_or_equal_to: { label: 'Less than or equal to', sign: '<=' },
    compulsory_pair: { label: 'Compulsory pair', sign: 'both or neither' },
    exclusive_pair: { label: 'Exclusive pair', sign: 'not both' },
}

export type MissingValueStrategy = 'SKIP_IF_ANY_VALUE_MISSING' | 'SKIP_IF_ALL_VALUES_MISSING' | 'NEVER_SKIP'

export const STRATEGIES: Record<MissingValueStrategy, { label: string; description: string }> = {
    SKIP_IF_ANY_VALUE_MISSING: {
        label: 'Skip if any value is missing',
        description: 'The side counts only when every item it reads has a value.',
    },
    SKIP_IF_ALL_VALUES_MISSING: {
        label: 'Skip if all values are missing',
        description: 'A missing item counts as zero, unless every one is missing.',
    },
    NEVER_SKIP: { label: 'Never skip', description: 'A missing item counts as zero, and so does a side with none.' },
}

export type Importance = 'high' | 'medium' | 'low'

export interface ValidationRule {
    id: string
    code: string
    name: string
    instruction: string
    importance: Importance
    left: string
    operator: Operator
    right: string
    leftStrategy: MissingValueStrategy
    rightStrategy: MissingValueStrategy
}

const rule = (
    code: string,
    name: string,
    importance: Importance,
    left: string,
    operator: Operator,
    right: string,
    instruction: string,
): ValidationRule => ({
    id: uid(`vr:${code}`),
    code,
    name,
    instruction,
    importance,
    left,
    operator,
    right,
    leftStrategy: 'SKIP_IF_ANY_VALUE_MISSING',
    rightStrategy: 'SKIP_IF_ANY_VALUE_MISSING',
})

const RULES_SEED = (): ValidationRule[] => [
    rule(
        'VR_VACCINATED_DUE',
        'Vaccinated within due',
        'high',
        `#{${DE.vaccinated.id}}`,
        'less_than_or_equal_to',
        `#{${DE.due.id}}`,
        'No more children can be vaccinated than were due.',
    ),
    rule(
        'VR_SAMPLES',
        'Failed samples within taken',
        'medium',
        `#{${DE.samplesFailed.id}}`,
        'less_than_or_equal_to',
        `#{${DE.samplesTaken.id}}`,
        'A sample can only fail if it was taken.',
    ),
    rule(
        'VR_STOCK',
        'Stock used within stock held',
        'high',
        `#{${DE.stockUsed.id}}`,
        'less_than_or_equal_to',
        `#{${DE.stockOnHand.id}}.periodOffset(-1)\n  + #{${DE.stockReceived.id}}`,
        'Kits used cannot be more than those left last month and those received.',
    ),
    rule(
        'VR_REFERRALS',
        'Referrals within visits',
        'low',
        `#{${DE.referrals.id}}`,
        'less_than_or_equal_to',
        `#{${DE.visits.id}} * 0.1`,
        'More than one visit in ten referred on is worth a second look.',
    ),
]

export const validationRules = collection<ValidationRule>('validation-rules', RULES_SEED)

/** A side's value under its missing value strategy, or undefined when the strategy skips it. */
function side(node: Node, strategy: MissingValueStrategy, unit: string, period: string): number | null | undefined {
    const result = aggregate(node, unit, period)
    if (strategy === 'SKIP_IF_ANY_VALUE_MISSING' && result.missing > 0) return undefined
    if (strategy === 'SKIP_IF_ALL_VALUES_MISSING' && result.items > 0 && result.missing === result.items) return undefined
    return result.value ?? (strategy === 'NEVER_SKIP' ? 0 : undefined)
}

/** Whether a rule holds for two sides. */
function holds(operator: Operator, left: number | null, right: number | null): boolean {
    if (operator === 'compulsory_pair') return (left === null) === (right === null)
    if (operator === 'exclusive_pair') return left === null || right === null
    const a = left ?? 0
    const b = right ?? 0
    switch (operator) {
        case 'equal_to':
            return Math.abs(a - b) < 1e-9
        case 'not_equal_to':
            return Math.abs(a - b) >= 1e-9
        case 'greater_than':
            return a > b
        case 'greater_than_or_equal_to':
            return a >= b
        case 'less_than':
            return a < b
        default:
            return a <= b
    }
}

export interface Violation {
    id: string
    rule: string
    unit: string
    period: string
    left: number | null
    right: number | null
}

/** A rule run for each unit and month given: the pairs it does not hold for, and how many it was tried on. */
export function runRule(
    rule: Pick<ValidationRule, 'id' | 'operator' | 'leftStrategy' | 'rightStrategy'>,
    left: Node,
    right: Node,
    units: readonly string[],
    periods: readonly string[],
): { violations: Violation[]; tried: number; skipped: number } {
    const violations: Violation[] = []
    let tried = 0
    let skipped = 0
    for (const unit of units)
        for (const period of periods) {
            const a = side(left, rule.leftStrategy, unit, period)
            const b = side(right, rule.rightStrategy, unit, period)
            const pair = rule.operator === 'compulsory_pair' || rule.operator === 'exclusive_pair'
            if (!pair && (a === undefined || b === undefined)) {
                skipped += 1
                continue
            }
            tried += 1
            if (!holds(rule.operator, a ?? null, b ?? null))
                violations.push({ id: `${rule.id}.${unit}.${period}`, rule: rule.id, unit, period, left: a ?? null, right: b ?? null })
        }
    return { violations, tried, skipped }
}

export function unitName(id: string): string {
    return orgUnit(id)?.name ?? id
}

// Program rules

export const programRules = collection<ProgramRule>('program-rules', RULE_SEED)
