import { useEffect, useState } from 'react'

/** The route in the location's hash as its parts: `#/tasks/today` is `['tasks', 'today']`, `#/` is none. */
function read(): string[] {
    return window.location.hash
        .replace(/^#\/?/, '')
        .split('/')
        .filter((part) => part !== '')
}

/** The hash route, followed as it changes. */
export function useRoute(): string[] {
    const [route, setRoute] = useState(read)
    useEffect(() => {
        const change = () => setRoute(read())
        window.addEventListener('hashchange', change)
        return () => window.removeEventListener('hashchange', change)
    }, [])
    return route
}

/** Goes to a route such as `/tasks/today`. */
export function go(path: string): void {
    window.location.hash = path
}
