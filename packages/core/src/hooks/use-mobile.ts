import { useEffect, useState } from 'react'

/**
 * Whether the window matches a media query, followed as it is resized; `initial` before the window
 * is read (on a server, the query's own answer in a browser otherwise).
 */
export function useMedia(media: string, initial?: boolean): boolean {
    const [matches, setMatches] = useState(() => initial ?? (typeof window === 'undefined' || window.matchMedia(media).matches))
    useEffect(() => {
        const query = window.matchMedia(media)
        const change = () => setMatches(query.matches)
        change()
        query.addEventListener('change', change)
        return () => query.removeEventListener('change', change)
    }, [media])
    return matches
}

/** Whether the window is phone-sized, under 768px wide; false until the window is read. */
export const useIsMobile = () => useMedia('(max-width: 767px)', false)
