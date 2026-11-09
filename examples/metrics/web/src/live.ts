import { createStore } from '@winterop-com/sokkel-ui/lib/stored'
import { useEffect, useRef, useState } from 'react'

const second = () => Math.floor(Date.now() / 1000)

/** The newest second the source has scraped, moving on every second. */
export const scraped = createStore(second())

/** Keeps the source scraping while the app is open: every second a new point lands. Called once, at the app's root. */
export function useScrapeClock(): void {
    useEffect(() => {
        const id = window.setInterval(() => scraped.set(second()), 1000)
        return () => window.clearInterval(id)
    }, [])
}

/**
 * The second a dashboard is drawn up to, and how it moves: by itself every `interval` seconds
 * unless paused, at once on a refresh (after a short spin, as a query takes), and whenever `key`
 * changes, as a new range or variable reads the source afresh.
 */
export function useDashboardTime(interval: number, paused: boolean, key: string) {
    const [at, setAt] = useState(() => scraped.get())
    const [refreshing, setRefreshing] = useState(false)
    const timer = useRef<number | undefined>(undefined)
    useEffect(() => {
        setAt(scraped.get())
    }, [key])
    useEffect(() => {
        if (interval === 0 || paused) return
        const id = window.setInterval(() => setAt(scraped.get()), interval * 1000)
        return () => window.clearInterval(id)
    }, [interval, paused])
    useEffect(() => () => window.clearTimeout(timer.current), [])
    const refresh = () => {
        setRefreshing(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
            setAt(scraped.get())
            setRefreshing(false)
        }, 400)
    }
    return { at, refreshing, refresh }
}
