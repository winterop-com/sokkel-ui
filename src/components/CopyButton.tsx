import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '../lib/cn'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

/**
 * An icon button that copies a value. Its name and its tooltip turn to the copied word for a
 * moment after a press, so the announcement matches what is drawn.
 */
export function CopyButton({
    value,
    size = 'icon-sm',
    className,
    words = { copy: 'Copy', copied: 'Copied' },
}: {
    value: string
    size?: 'icon-xs' | 'icon-sm' | 'icon'
    className?: string
    words?: { copy: string; copied: string }
}) {
    const [copied, setCopied] = useState(false)
    useEffect(() => {
        if (!copied) return
        const timer = setTimeout(() => setCopied(false), 1500)
        return () => clearTimeout(timer)
    }, [copied])
    const word = copied ? words.copied : words.copy
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Button
                        variant="ghost"
                        size={size}
                        aria-label={word}
                        className={cn('text-muted-foreground', className)}
                        onClick={() => {
                            navigator.clipboard.writeText(value).then(
                                () => setCopied(true),
                                () => undefined,
                            )
                        }}
                    />
                }
            >
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            </TooltipTrigger>
            <TooltipContent>{word}</TooltipContent>
        </Tooltip>
    )
}
