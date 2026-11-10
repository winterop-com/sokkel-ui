import { useCallback, useEffect, useState } from 'react'

/**
 * Writes text to the clipboard and resolves whether it landed. A page with no clipboard (one served
 * over plain http from a host other than localhost has none), a write that throws and a refused
 * write all resolve false.
 */
export async function writeClipboard(text: string): Promise<boolean> {
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard
    if (clipboard?.writeText === undefined) return false
    try {
        await clipboard.writeText(text)
        return true
    } catch {
        return false
    }
}

/**
 * Copies text to the clipboard and says so for a moment: `copied` turns true when a write lands
 * and back after `hold` milliseconds. A refused write, or a page with no clipboard, leaves it false.
 */
export function useCopy(hold = 1500) {
    const [copied, setCopied] = useState(false)
    useEffect(() => {
        if (!copied) return
        const timer = setTimeout(() => setCopied(false), hold)
        return () => clearTimeout(timer)
    }, [copied, hold])
    const copy = useCallback((text: string) => {
        void writeClipboard(text).then((landed) => {
            if (landed) setCopied(true)
        })
    }, [])
    return { copied, copy }
}
