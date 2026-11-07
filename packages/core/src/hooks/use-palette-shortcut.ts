import { useEffect } from 'react'

/** Opens the palette on ⌘K or Ctrl+K, wherever focus is. */
export function usePaletteShortcut(onOpen: () => void, key = 'k') {
    useEffect(() => {
        const listen = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === key && (event.metaKey || event.ctrlKey) && !event.altKey) {
                event.preventDefault()
                onOpen()
            }
        }
        window.addEventListener('keydown', listen)
        return () => window.removeEventListener('keydown', listen)
    }, [onOpen, key])
}
