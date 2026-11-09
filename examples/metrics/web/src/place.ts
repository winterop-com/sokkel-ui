import type { TimeRangeValue } from '@winterop-com/sokkel-ui/dashboard/TimeRange'
import { useEffect, useState } from 'react'

import { PRESETS } from './query'
import { ALL, type Variables } from './source'

/**
 * Where the app is, from the hash: the path (`#/d/services` is `['d', 'services']`) and the query
 * after it, which holds a dashboard's range, refresh, variables and the panel in view, so a link
 * opens the same view.
 */
export interface Place {
    path: string[]
    params: URLSearchParams
}

/** The place a hash names, with or without its leading `#/`: `d/services?range=15m`. */
export function placeOf(hash: string): Place {
    const [path = '', query = ''] = hash.replace(/^#?\/?/, '').split('?')
    return { path: path.split('/').filter((part) => part !== ''), params: new URLSearchParams(query) }
}

function read(): Place {
    return placeOf(window.location.hash)
}

/** The place in the hash, followed as it changes. */
export function usePlace(): Place {
    const [place, setPlace] = useState(read)
    useEffect(() => {
        const change = () => setPlace(read())
        window.addEventListener('hashchange', change)
        return () => window.removeEventListener('hashchange', change)
    }, [])
    return place
}

/** The hash for a path and its query: `#/d/services?range=15m`. */
export function hashOf(path: string, params?: URLSearchParams): string {
    const query = params === undefined ? '' : params.toString()
    return `#${path}${query === '' ? '' : `?${query}`}`
}

/** Goes to a path, keeping the query when asked, as moving between dashboards keeps the range and variables. */
export function go(path: string, params?: URLSearchParams): void {
    window.location.hash = hashOf(path, params)
}

/** Changes the query in place, with no new entry in the history, as picking a variable does. */
export function patchParams(patch: Record<string, string | null>): void {
    const { path, params } = read()
    for (const [key, value] of Object.entries(patch)) {
        if (value === null) params.delete(key)
        else params.set(key, value)
    }
    const next = hashOf(`/${path.join('/')}`, params)
    if (next === window.location.hash) return
    window.history.replaceState(null, '', next)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/** The query a dashboard view keeps: the range, the refresh and the variables, without the panel in view. */
export function viewParams(params: URLSearchParams): URLSearchParams {
    const kept = new URLSearchParams()
    for (const key of ['range', 'from', 'to', 'refresh', 'service', 'host', 'project']) {
        const value = params.get(key)
        if (value !== null) kept.set(key, value)
    }
    return kept
}

/** The range a query names, or the default. */
export function rangeOf(params: URLSearchParams, fallback: string): TimeRangeValue {
    const from = Number(params.get('from'))
    const to = Number(params.get('to'))
    if (from > 0 && to > from) return { from: new Date(from), to: new Date(to) }
    const preset = params.get('range') ?? fallback
    return { preset: PRESETS.some((one) => one.id === preset) ? preset : '15m' }
}

/** A range as query fields. */
export function rangeParams(range: TimeRangeValue): Record<string, string | null> {
    if ('preset' in range) return { range: range.preset, from: null, to: null }
    return { range: null, from: String(range.from.getTime()), to: String(range.to.getTime()) }
}

/** The variables a query names, `all` for each it leaves out. */
export function variablesOf(params: URLSearchParams): Variables {
    return {
        service: params.get('service') ?? ALL,
        host: params.get('host') ?? ALL,
        project: params.get('project') ?? ALL,
    }
}
