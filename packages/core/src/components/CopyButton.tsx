import { Check, Copy } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { useCopy } from '../hooks/use-copy'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

/** The words a copy button says: its name, and its name for a moment after a press. */
export interface CopyButtonWords {
    copy: string
    copied: string
}

const WORDS: CopyButtonWords = { copy: 'Copy', copied: 'Copied' }

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
    words: given,
    showLabel = false,
    icon,
}: {
    value: string
    size?: 'icon-xs' | 'icon-sm' | 'icon'
    className?: string
    words?: Partial<CopyButtonWords>
    showLabel?: boolean
    icon?: ReactNode
}) {
    const words = { ...WORDS, ...given }
    const { copied, copy: write } = useCopy()
    const word = copied ? words.copied : words.copy
    const copy = () => write(value)
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
