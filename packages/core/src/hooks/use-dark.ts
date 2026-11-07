import { useEffect, useState } from 'react'

/** Whether the document wears its dark scheme, following the `.dark` class on `<html>` as it changes. */
export function useDark(): boolean {
    const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
    useEffect(() => {
        const root = document.documentElement
        const observer = new MutationObserver(() => setDark(root.classList.contains('dark')))
        observer.observe(root, { attributes: true, attributeFilter: ['class'] })
        return () => observer.disconnect()
    }, [])
    return dark
}
