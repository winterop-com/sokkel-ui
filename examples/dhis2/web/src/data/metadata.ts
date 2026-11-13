/**
 * The simulated server's metadata: organization units by plain geography, category option combos,
 * data elements, a data set, constants and the months data is held for. Every uid is made here from
 * the thing's code, so it is the same on every load and names nothing outside the example.
 */
import type { TreeNode } from '@winterop-com/sokkel-ui/Tree'

const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ALPHANUMERIC = `${LETTERS}0123456789`

/** A number from 0 to 1 that is always the same for the same text. */
export function hashed(text: string): number {
    let hash = 2166136261
    for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619) >>> 0
    // Mixed once more, so texts that differ only at their end land far apart.
    hash ^= hash >>> 16
    hash = Math.imul(hash, 0x85ebca6b) >>> 0
    hash ^= hash >>> 13
    hash = Math.imul(hash, 0xc2b2ae35) >>> 0
    hash ^= hash >>> 16
    return (hash >>> 0) / 0xffffffff
}

/** An eleven-character uid in the server's shape, a letter first, made from a code. */
export function uid(code: string): string {
    let out = LETTERS[Math.floor(hashed(`${code}:0`) * LETTERS.length) % LETTERS.length]
    for (let index = 1; index < 11; index += 1)
        out += ALPHANUMERIC[Math.floor(hashed(`${code}:${String(index)}`) * ALPHANUMERIC.length) % ALPHANUMERIC.length]
    return out
}

// Organization units

export type Level = 1 | 2 | 3 | 4

export const LEVELS: Record<Level, string> = { 1: 'Country', 2: 'Region', 3: 'District', 4: 'Site' }

export interface OrgUnit {
    id: string
    code: string
    name: string
    level: Level
    parent: string | null
}

const HIERARCHY: [string, [string, string[]][]][] = [
    [
        'Vestland',
        [
            ['Bergen', ['Sandviken', 'Fana', 'Laksevåg']],
            ['Voss', ['Voss town', 'Vossestrand']],
        ],
    ],
    [
        'Nordland',
        [
            ['Bodø', ['Bodø center', 'Saltstraumen']],
            ['Lofoten', ['Svolvær', 'Leknes']],
        ],
    ],
    [
        'Innlandet',
        [
            ['Hamar', ['Hamar town', 'Stange']],
            ['Lillehammer', ['Lillehammer town', 'Fåberg']],
        ],
    ],
]

const codeOf = (name: string) =>
    name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[øØ]/g, 'o')
        .replace(/[åÅ]/g, 'a')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')

const COUNTRY_CODE = 'NO'

function unit(code: string, name: string, level: Level, parent: string | null): OrgUnit {
    return { id: uid(`ou:${code}`), code, name, level, parent }
}

const country = unit(COUNTRY_CODE, 'Norway', 1, null)

export const ORG_UNITS: OrgUnit[] = [
    country,
    ...HIERARCHY.flatMap(([region, districts]) => {
        const regionUnit = unit(`${COUNTRY_CODE}_${codeOf(region)}`, region, 2, country.id)
        return [
            regionUnit,
            ...districts.flatMap(([district, sites]) => {
                const districtUnit = unit(`${regionUnit.code}_${codeOf(district)}`, district, 3, regionUnit.id)
                return [districtUnit, ...sites.map((site) => unit(`${districtUnit.code}_${codeOf(site)}`, site, 4, districtUnit.id))]
            }),
        ]
    }),
]

export const ROOT = country.id

const UNIT_BY_ID = new Map(ORG_UNITS.map((one) => [one.id, one]))

export function orgUnit(id: string | null | undefined): OrgUnit | undefined {
    return id === null || id === undefined ? undefined : UNIT_BY_ID.get(id)
}

export function childrenOf(id: string): OrgUnit[] {
    return ORG_UNITS.filter((one) => one.parent === id)
}

/** The units from the country down to this one. */
export function pathOf(id: string): OrgUnit[] {
    const path: OrgUnit[] = []
    let at = orgUnit(id)
    while (at !== undefined) {
        path.unshift(at)
        at = orgUnit(at.parent)
    }
    return path
}

/** The sites at or under a unit, where data is entered. */
export function sitesUnder(id: string): OrgUnit[] {
    const here = orgUnit(id)
    if (here === undefined) return []
    if (here.level === 4) return [here]
    return childrenOf(id).flatMap((child) => sitesUnder(child.id))
}

function treeOf(one: OrgUnit): TreeNode {
    const children = childrenOf(one.id)
    return {
        id: one.id,
        label: one.name,
        meta: LEVELS[one.level],
        ...(children.length > 0 ? { children: children.map(treeOf) } : {}),
    }
}

/** The hierarchy as tree nodes, each with its level beside its name. */
export const ORG_UNIT_TREE: TreeNode[] = [treeOf(country)]

// Categories

export interface CategoryOptionCombo {
    id: string
    name: string
}

export interface CategoryCombo {
    id: string
    name: string
    combos: CategoryOptionCombo[]
}

const coc = (code: string, name: string): CategoryOptionCombo => ({ id: uid(`coc:${code}`), name })

export const DEFAULT_COMBO: CategoryCombo = { id: uid('cc:default'), name: 'default', combos: [coc('default', 'default')] }
export const AGE_COMBO: CategoryCombo = {
    id: uid('cc:age'),
    name: 'Age',
    combos: [coc('under5', 'Under 5'), coc('over5', '5 and over')],
}
export const CATEGORY_COMBOS = [DEFAULT_COMBO, AGE_COMBO]

export const COMBOS: CategoryOptionCombo[] = CATEGORY_COMBOS.flatMap((combo) => combo.combos)
const COMBO_BY_ID = new Map(COMBOS.map((one) => [one.id, one]))

export function optionCombo(id: string): CategoryOptionCombo | undefined {
    return COMBO_BY_ID.get(id)
}

// Data elements

export type ValueType = 'NUMBER' | 'INTEGER_ZERO_OR_POSITIVE'

export interface DataElement {
    id: string
    code: string
    name: string
    shortName: string
    valueType: ValueType
    aggregationType: 'SUM'
    categoryCombo: CategoryCombo
    description: string
}

function element(code: string, name: string, shortName: string, combo: CategoryCombo, description: string): DataElement {
    return {
        id: uid(`de:${code}`),
        code,
        name,
        shortName,
        valueType: 'INTEGER_ZERO_OR_POSITIVE',
        aggregationType: 'SUM',
        categoryCombo: combo,
        description,
    }
}

export const DE = {
    visits: element('DE_VISITS', 'Outpatient visits', 'Visits', AGE_COMBO, 'Visits seen at the site in the month, by age.'),
    referrals: element('DE_REFERRALS', 'Referrals out', 'Referrals', DEFAULT_COMBO, 'People sent on to another site.'),
    vaccinated: element('DE_VACCINATED', 'Children vaccinated', 'Vaccinated', DEFAULT_COMBO, 'Children given their last dose.'),
    due: element('DE_DUE', 'Children due for vaccination', 'Due', DEFAULT_COMBO, 'Children whose last dose fell due.'),
    samplesTaken: element('DE_SAMPLES_TAKEN', 'Water samples taken', 'Samples taken', DEFAULT_COMBO, 'Samples taken at the site.'),
    samplesFailed: element('DE_SAMPLES_FAILED', 'Water samples failed', 'Samples failed', DEFAULT_COMBO, 'Samples that failed the test.'),
    stockReceived: element('DE_STOCK_RECEIVED', 'Stock received', 'Received', DEFAULT_COMBO, 'Kits delivered in the month.'),
    stockUsed: element('DE_STOCK_USED', 'Stock used', 'Used', DEFAULT_COMBO, 'Kits handed out in the month.'),
    stockOnHand: element('DE_STOCK_ON_HAND', 'Stock on hand', 'On hand', DEFAULT_COMBO, 'Kits counted at the end of the month.'),
}

export const DATA_ELEMENTS: DataElement[] = Object.values(DE)
const ELEMENT_BY_ID = new Map(DATA_ELEMENTS.map((one) => [one.id, one]))

export function dataElement(id: string): DataElement | undefined {
    return ELEMENT_BY_ID.get(id)
}

// Data sets, constants

export interface DataSet {
    id: string
    code: string
    name: string
    periodType: 'Monthly'
    elements: string[]
}

export const DATA_SET: DataSet = {
    id: uid('ds:MONTHLY'),
    code: 'DS_MONTHLY',
    name: 'Monthly site report',
    periodType: 'Monthly',
    elements: DATA_ELEMENTS.map((one) => one.id),
}

export const DATA_SETS = [DATA_SET]

/** What a reporting rate item may ask for after its data set. */
export const REPORTING_METRICS = ['REPORTING_RATE', 'ACTUAL_REPORTS', 'EXPECTED_REPORTS'] as const

export interface Constant {
    id: string
    code: string
    name: string
    value: number
}

export const CONSTANTS: Constant[] = [
    { id: uid('c:TARGET'), code: 'VACCINATION_TARGET', name: 'Vaccination target', value: 90 },
    { id: uid('c:SAMPLES'), code: 'SAMPLES_PER_SITE', name: 'Samples per site', value: 4 },
]

export function constant(id: string): Constant | undefined {
    return CONSTANTS.find((one) => one.id === id)
}

// Periods

/** The months the server holds data for, oldest first: November 2025 to October 2026. */
export const PERIODS: string[] = Array.from({ length: 12 }, (_, index) => {
    const month = 11 + index
    const year = 2025 + Math.floor((month - 1) / 12)
    return `${String(year)}${String(((month - 1) % 12) + 1).padStart(2, '0')}`
})

/** The day the example takes as today, so every load reads the same. */
export const TODAY = '2026-11-05'

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export function periodLabel(id: string): string {
    return MONTH.format(new Date(Date.UTC(Number(id.slice(0, 4)), Number(id.slice(4, 6)) - 1, 1)))
}

/** The period `by` months from a monthly period. */
export function shiftPeriod(id: string, by: number): string {
    const index = Number(id.slice(0, 4)) * 12 + Number(id.slice(4, 6)) - 1 + by
    return `${String(Math.floor(index / 12))}${String((index % 12) + 1).padStart(2, '0')}`
}

/** The days in a monthly period. */
export function daysIn(id: string): number {
    return new Date(Date.UTC(Number(id.slice(0, 4)), Number(id.slice(4, 6)), 0)).getUTCDate()
}
