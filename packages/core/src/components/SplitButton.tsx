import { ChevronDown } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Button } from './ui/button'
import { ButtonGroup, ButtonGroupSeparator } from './ui/button-group'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'

/** One other way to do the action, in the split button's menu. */
export interface SplitButtonItem {
    label: ReactNode
    /** A line under the label saying how this way differs. */
    description?: ReactNode
    icon?: ReactNode
    onSelect: () => void
    disabled?: boolean
    destructive?: boolean
}

export interface SplitButtonWords {
    /** The name of the button that opens the menu. */
    more: string
}

const WORDS: SplitButtonWords = { more: 'More ways' }

/** The icon button's size beside each text size, so both halves stand the same height. */
/** The line between the halves of a filled button, its own ground mixed with its ink. */
const SEPARATOR: Partial<Record<string, string>> = {
    default: 'bg-[color-mix(in_oklch,var(--primary),var(--primary-foreground)_30%)]',
    secondary: 'bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_15%)]',
    destructive: 'bg-destructive/25',
}

const ICON_SIZE = { xs: 'icon-xs', sm: 'icon-sm', default: 'icon', lg: 'icon-lg' } as const

export interface SplitButtonProps {
    /** The main action's label, with an icon before it if wanted. */
    children: ReactNode
    onClick?: () => void
    items: readonly SplitButtonItem[]
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
    size?: 'xs' | 'sm' | 'default' | 'lg'
    disabled?: boolean
    reason?: ReactNode
    /** The menu open, held by the app; leave it out and the control holds it. */
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    className?: string
    words?: Partial<SplitButtonWords>
}

/**
 * The main action and a menu of other ways to do it, joined as one control: Run now beside Run
 * with options and Run from a step. Pressing the main half does the action; the chevron opens the
 * menu under the whole control. Variants and sizes are Button's; `reason` disables both halves and
 * says why on hover and focus, and `disabled` without a reason disables them quietly.
 */
export function SplitButton({
    children,
    onClick,
    items,
    variant = 'default',
    size = 'default',
    disabled = false,
    reason,
    open,
    defaultOpen,
    onOpenChange,
    className,
    words: given,
}: SplitButtonProps) {
    const words = { ...WORDS, ...given }
    const group = useRef<HTMLDivElement>(null)
    const off = disabled || (reason !== undefined && reason !== null && reason !== false)
    const separator = SEPARATOR[variant]
    return (
        <ButtonGroup ref={group} data-slot="split-button" className={className}>
            <Button variant={variant} size={size} onClick={onClick} disabled={disabled} reason={reason}>
                {children}
            </Button>
            {separator !== undefined && <ButtonGroupSeparator className={cn('data-vertical:my-0', separator)} />}
            <DropdownMenu open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
                <DropdownMenuTrigger render={<Button variant={variant} size={ICON_SIZE[size]} aria-label={words.more} disabled={off} />}>
                    <ChevronDown aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent anchor={group} align="end" className="w-auto min-w-(--anchor-width)">
                    {items.map((item, index) => (
                        <DropdownMenuItem
                            key={index}
                            disabled={item.disabled}
                            variant={item.destructive === true ? 'destructive' : 'default'}
                            onClick={item.onSelect}
                            className={cn(item.description !== undefined && 'items-start')}
                        >
                            {item.icon}
                            <span className="flex min-w-0 flex-col">
                                <span>{item.label}</span>
                                {item.description !== undefined && (
                                    <span className="text-help text-muted-foreground">{item.description}</span>
                                )}
                            </span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </ButtonGroup>
    )
}
