import { useEffect, useState } from 'react'

/** The theme `<html>` names in `data-theme`, or `tidevann`, the base theme, without one. */
function read(): string {
    if (typeof document === 'undefined') return 'tidevann'
    return document.documentElement.getAttribute('data-theme') ?? 'tidevann'
}

/**
 * The theme the document wears, by the name its `data-theme-scope` answers to, followed as it
 * changes. An element given `data-theme-scope` with it, inside an element with the `.dark` class,
 * wears the same theme in its dark scheme whatever the page wears.
 */
export function useThemeName(): string {
    const [name, setName] = useState(read)
    useEffect(() => {
        const observer = new MutationObserver(() => setName(read()))
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
        setName(read())
        return () => observer.disconnect()
    }, [])
    return name
}
