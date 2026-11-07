import { useEffect } from 'react'

import { typing } from '../lib/keys'

/**
 * Calls `onOpen` on `?` outside a field being typed in, to open the keyboard shortcuts. Binds
 * nothing while `onOpen` is undefined, so a `?` hint is drawn only where the key works.
 */
export function useShortcutsKey(onOpen: (() => void) | undefined) {
    useEffect(() => {
        if (onOpen === undefined) return
        const listen = (event: KeyboardEvent) => {
            if (event.key !== '?' || event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return
            event.preventDefault()
            onOpen()
        }
        window.addEventListener('keydown', listen)
        return () => window.removeEventListener('keydown', listen)
    }, [onOpen])
}
