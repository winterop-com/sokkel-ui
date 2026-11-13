import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import type { StatusMap } from '@winterop-com/sokkel-ui/lib/status'
import { createContext, useContext, useEffect, type ReactNode } from 'react'

import { conceptText, humanName, quantityText, type Resource } from './data/model'

/** The states resources and versions are in, in the app's words and colors, for every chip. */
export const STATUSES: StatusMap = {
    active: { color: 'good' },
    draft: { color: 'info' },
    retired: { color: 'neutral' },
    final: { color: 'good' },
    amended: { color: 'info' },
    preliminary: { color: 'info' },
    registered: { color: 'neutral' },
    cancelled: { color: 'neutral' },
    'entered-in-error': { color: 'critical' },
    finished: { color: 'good' },
    planned: { color: 'info' },
    'in-progress': { color: 'warning' },
    resolved: { color: 'neutral' },
    remission: { color: 'info' },
    inactive: { color: 'neutral' },
    create: { color: 'good', label: 'created' },
    update: { color: 'info', label: 'updated' },
    delete: { color: 'critical', label: 'deleted' },
}

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const DATE_TIME = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
export const NUMBER = new Intl.NumberFormat('en-US')

/** An ISO instant as a date and time, in the page's zone. */
export function when(iso: string | undefined): string {
    if (iso === undefined || iso === '') return ''
    const date = new Date(iso)
    return Number.isNaN(date.getTime()) ? iso : DATE_TIME.format(date)
}

/** A FHIR date (`2026`, `2026-03` or `2026-03-01`) or the day of a dateTime, as a date. */
export function onDay(text: string | undefined): string {
    if (text === undefined || text === '') return ''
    const [year = 0, month = 1, date = 1] = text.slice(0, 10).split('-').map(Number)
    return DATE.format(new Date(year, month - 1, date))
}

/** The plural of a count's noun. */
export function count(value: number, one: string, many = `${one}s`): string {
    return `${NUMBER.format(value)} ${value === 1 ? one : many}`
}

/** What a resource is called in a list or a title: a person's name, an observation's code and value. */
export function titleOf(resource: Resource): string {
    const fields = resource as Record<string, unknown>
    switch (resource.resourceType) {
        case 'Patient':
        case 'Practitioner':
            return humanName(fields.name) || resource.id
        case 'Organization':
            return typeof fields.name === 'string' && fields.name !== '' ? fields.name : resource.id
        case 'Observation': {
            const value =
                quantityText(fields.valueQuantity) ||
                (typeof fields.valueString === 'string' ? fields.valueString : conceptText(fields.valueCodeableConcept))
            const code = conceptText(fields.code)
            return value === '' ? code || resource.id : `${code} ${value}`
        }
        case 'Condition':
            return conceptText(fields.code) || resource.id
        case 'Encounter': {
            const type = Array.isArray(fields.type) ? conceptText(fields.type[0]) : ''
            const start = (fields.period as { start?: string } | undefined)?.start
            return [type || conceptText(fields.class) || 'Encounter', start === undefined ? '' : onDay(start)].filter(Boolean).join(', ')
        }
        case 'Library':
            return (
                (typeof fields.title === 'string' ? fields.title : undefined) ??
                (typeof fields.name === 'string' ? fields.name : resource.id)
            )
        default:
            return resource.id
    }
}

/** A resource's state for its chip: its status, or a condition's clinical status, or a record's active flag. */
export function stateOf(resource: Resource): string | undefined {
    const fields = resource as Record<string, unknown>
    if (typeof fields.status === 'string') return fields.status
    if (fields.clinicalStatus !== undefined) return conceptText(fields.clinicalStatus) || undefined
    if (typeof fields.active === 'boolean') return fields.active ? 'active' : 'inactive'
    return undefined
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

/** How the editors are set up, as the settings choose. */
export interface Prefs {
    lineNumbers: boolean
    wrap: boolean
    size: 'sm' | 'md'
    /** Evaluate FHIRPath as it is typed, or only on Mod-Enter and Evaluate. */
    live: boolean
    /** How many matches a search page holds when the query gives no `_count`. */
    pageSize: number
}

export const DEFAULT_PREFS: Prefs = { lineNumbers: true, wrap: false, size: 'sm', live: true, pageSize: 20 }

/** The editors' settings, kept in the browser, the same in every part that reads them. */
export function usePrefs(): [Prefs, (next: Partial<Prefs>) => void] {
    const [prefs, setPrefs] = useStored<Prefs>('prefs', DEFAULT_PREFS)
    return [{ ...DEFAULT_PREFS, ...prefs }, (next) => setPrefs((now) => ({ ...DEFAULT_PREFS, ...now, ...next }))]
}
