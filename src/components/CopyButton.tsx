import { Check, Copy } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

/**
 * A button that copies a value. Its name and its tooltip turn to the copied word for a moment after
 * a press, so the announcement matches what is drawn. `showLabel` draws the word beside the icon
 * and drops the tooltip, for a footer where the action wants saying; `icon` replaces the copy glyph,
 * such as a link for copying an address.
 */
export function CopyButton({
    value,
    size = 'icon-sm',
    className,
    words = { copy: 'Copy', copied: 'Copied' },
    showLabel = false,
    icon,
}: {
    value: string
    size?: 'icon-xs' | 'icon-sm' | 'icon'
    className?: string
    words?: { copy: string; copied: string }
    showLabel?: boolean
    icon?: ReactNode
}) {
    const [copied, setCopied] = useState(false)
    useEffect(() => {
        if (!copied) return
        const timer = setTimeout(() => setCopied(false), 1500)
        return () => clearTimeout(timer)
    }, [copied])
    const word = copied ? words.copied : words.copy
    const copy = () => {
        navigator.clipboard.writeText(value).then(
            () => setCopied(true),
            () => undefined,
        )
    }
    if (showLabel)
        return (
            <Button variant="ghost" size="sm" className={className} onClick={copy}>
                {copied ? <Check aria-hidden /> : (icon ?? <Copy aria-hidden />)}
                {word}
            </Button>
        )
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Button
                        variant="ghost"
                        size={size}
                        aria-label={word}
                        className={cn('text-muted-foreground', className)}
                        onClick={copy}
                    />
                }
            >
                {copied ? <Check aria-hidden /> : (icon ?? <Copy aria-hidden />)}
            </TooltipTrigger>
            <TooltipContent>{word}</TooltipContent>
        </Tooltip>
    )
}
