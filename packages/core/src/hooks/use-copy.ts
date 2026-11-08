import { useCallback, useEffect, useState } from 'react'

/**
 * Copies text to the clipboard and says so for a moment: `copied` turns true when a write lands
 * and back after `hold` milliseconds. A refused write leaves it false.
 */
export function useCopy(hold = 1500) {
    const [copied, setCopied] = useState(false)
    useEffect(() => {
        if (!copied) return
        const timer = setTimeout(() => setCopied(false), hold)
        return () => clearTimeout(timer)
    }, [copied, hold])
    const copy = useCallback((text: string) => {
        navigator.clipboard.writeText(text).then(
            () => setCopied(true),
            () => undefined,
        )
    }, [])
    return { copied, copy }
}
