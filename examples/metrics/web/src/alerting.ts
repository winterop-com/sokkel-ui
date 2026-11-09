import { createStore } from '@winterop-com/sokkel-ui/lib/stored'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { type AlertEvent, type AlertRule, crosses, events, type Preferences } from './data'
import { scraped } from './live'
import { readNow } from './query'
import { metricOf } from './source'

/** Where a rule stands now: firing, crossing its threshold but not yet for long enough, normal, or turned off. */
export type RuleState = 'firing' | 'pending' | 'normal' | 'paused'

export interface RuleReading {
    state: RuleState
    value: number | null
}

/** Each rule's reading at the newest second, by its id. */
export const readings = createStore<Readonly<Record<string, RuleReading>>>({})

/** A rule's value written with its metric's unit. */
export function written(rule: Pick<AlertRule, 'metric'>, value: number | null): string {
    if (value === null) return 'No data'
    const metric = metricOf(rule.metric)
    return `${value.toLocaleString('en-US', { maximumFractionDigits: metric.decimals })}${metric.unit}`
}

/** A rule's condition in words: `Latency p95 of api above 220 ms for 15s`. */
export function conditionOf(rule: AlertRule): string {
    const metric = metricOf(rule.metric)
    const scope = Object.values(rule.filter).filter((value) => value !== undefined && value !== '' && value !== 'all')
    const of = scope.length === 0 ? '' : ` of ${scope.join(', ')}`
    const held =
        rule.forSeconds === 0 ? '' : ` for ${rule.forSeconds < 60 ? `${String(rule.forSeconds)}s` : `${String(rule.forSeconds / 60)}m`}`
    return `${metric.label} (${rule.aggregation})${of} ${rule.condition} ${written(rule, rule.threshold)}${held}`
}

/**
 * Evaluates the rules every second against the newest scrape: a rule whose value crosses its
 * threshold for its `forSeconds` fires, kept as an event in the backend and said in a toast when the
 * preferences ask; once the value is back, its event resolves. Fired alerts older than the
 * preferences keep are let go.
 */
export function useAlerting(rules: readonly AlertRule[] | undefined, fired: readonly AlertEvent[] | undefined, prefs: Preferences) {
    const latest = useRef({ rules, fired, prefs })
    const since = useRef(new Map<string, number>())
    const opening = useRef(new Set<string>())
    useEffect(() => {
        latest.current = { rules, fired, prefs }
    })
    useEffect(() => {
        const evaluate = () => {
            const { rules: all, fired: known, prefs: settings } = latest.current
            if (all === undefined || known === undefined) return
            const second = scraped.get()
            const next: Record<string, RuleReading> = {}
            for (const rule of all) {
                const value = readNow({ ...rule, filters: [rule.filter] }, second)
                const open = known.find((event) => event.rule === rule.id && event.resolvedAt === null)
                if (!rule.enabled || !settings.evaluate) {
                    since.current.delete(rule.id)
                    if (open !== undefined) void events.update(open.id, { resolvedAt: second })
                    next[rule.id] = { state: 'paused', value }
                    continue
                }
                if (crosses(rule, value)) {
                    const from = since.current.get(rule.id) ?? second
                    since.current.set(rule.id, from)
                    const due = second - from >= rule.forSeconds
                    if (due && open === undefined && !opening.current.has(rule.id)) {
                        opening.current.add(rule.id)
                        void events
                            .create({
                                rule: rule.id,
                                name: rule.name,
                                severity: rule.severity,
                                metric: rule.metric,
                                value: value ?? 0,
                                firedAt: second,
                                resolvedAt: null,
                            })
                            .finally(() => opening.current.delete(rule.id))
                        if (settings.notify) {
                            const say = rule.severity === 'critical' ? toast.error : toast.warning
                            say(`${rule.name} is firing`, { description: `${written(rule, value)}: ${conditionOf(rule)}` })
                        }
                    }
                    next[rule.id] = { state: due || open !== undefined ? 'firing' : 'pending', value }
                } else {
                    since.current.delete(rule.id)
                    if (open !== undefined) {
                        void events.update(open.id, { resolvedAt: second })
                        if (settings.notify) toast.success(`${rule.name} resolved`, { description: written(rule, value) })
                    }
                    next[rule.id] = { state: 'normal', value }
                }
            }
            // A rule removed while firing leaves its event open; it resolves with the rule.
            for (const event of known) {
                if (event.resolvedAt === null && !all.some((rule) => rule.id === event.rule))
                    void events.update(event.id, { resolvedAt: second })
            }
            for (const event of known) {
                if (event.resolvedAt !== null && event.resolvedAt < second - settings.keep) void events.remove(event.id)
            }
            readings.set(next)
        }
        evaluate()
        return scraped.subscribe(evaluate)
    }, [])
}
