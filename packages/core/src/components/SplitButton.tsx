import { ChevronDown } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Button } from './ui/button'
import { ButtonGroup, ButtonGroupSeparator } from './ui/button-group'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

/** One other way to do the action, in the split button's menu. */
export interface SplitButtonItem {
    label: ReactNode
    /** A line under the label saying how this way differs. */
    description?: ReactNode
    icon?: ReactNode
    onSelect: () => void
    disabled?: boolean
    destructive?: boolean
    /**
     * Whether this way is the one chosen. Given on any item, the menu's items are one set of
     * choices, read out as such, with a check by the chosen one: a cadence, a mode.
     */
    checked?: boolean
}

export interface SplitButtonWords {
    /** The name of the button that opens the menu. */
    more: string
    /** What the chevron's tooltip says on hover and focus: how its menu's choices differ. */
    moreHint?: string
}

const WORDS: SplitButtonWords = { more: 'More ways' }

/** The icon button's size beside each text size, so both halves stand the same height. */
/** The line between the halves of a filled button, its own ground mixed with its ink. */
const SEPARATOR: Partial<Record<string, string>> = {
    default: 'bg-[color-mix(in_oklab,var(--primary),var(--primary-foreground)_30%)]',
    secondary: 'bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_15%)]',
    destructive: 'bg-destructive/25',
}

const ICON_SIZE = { xs: 'icon-xs', sm: 'icon-sm', default: 'icon', lg: 'icon-lg' } as const

export interface SplitButtonProps {
    /** The main action's label, with an icon before it if wanted. */
    children: ReactNode
    /** The main half's accessible name, where its face is shorter: "New" on the face, "New pipeline" here. */
    label?: string
    /** The main half's title, shown on hover by the browser. */
    title?: string
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
 * says why on hover and focus, and `disabled` without a reason disables them quietly. `label` and
 * `title` name the main half apart from its face, for a face that leans on the page around it.
 * Items that say `checked` are one set of choices, the chosen one checked.
 */
export function SplitButton({
    children,
    label,
    title,
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
    const held = reason !== undefined && reason !== null && reason !== false
    const separator = SEPARATOR[variant]
    const choices = items.some((item) => item.checked !== undefined)
    const chevron = <Button variant={variant} size={ICON_SIZE[size]} aria-label={words.more} disabled={disabled} />
    const body = (item: SplitButtonItem) => (
        <>
            {item.icon}
            <span className="flex min-w-0 flex-col">
                <span>{item.label}</span>
                {item.description !== undefined && <span className="text-help text-muted-foreground">{item.description}</span>}
            </span>
        </>
    )
    return (
        <ButtonGroup ref={group} data-slot="split-button" className={className}>
            <Button variant={variant} size={size} onClick={onClick} disabled={disabled} reason={reason} aria-label={label} title={title}>
                {children}
            </Button>
            {separator !== undefined && <ButtonGroupSeparator className={cn('data-vertical:my-0', separator)} />}
            {held ? (
                // Shut as the face is: reachable, saying why, with no menu to open.
                <Button variant={variant} size={ICON_SIZE[size]} aria-label={words.more} reason={reason}>
                    <ChevronDown aria-hidden />
                </Button>
            ) : (
                <DropdownMenu open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
                    {words.moreHint === undefined ? (
                        <DropdownMenuTrigger render={chevron}>
                            <ChevronDown aria-hidden />
                        </DropdownMenuTrigger>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger render={<DropdownMenuTrigger render={chevron} />}>
                                <ChevronDown aria-hidden />
                            </TooltipTrigger>
                            <TooltipContent>{words.moreHint}</TooltipContent>
                        </Tooltip>
                    )}
                    <DropdownMenuContent anchor={group} align="end" className="w-auto min-w-(--anchor-width)">
                        {choices ? (
                            <DropdownMenuRadioGroup value={String(items.findIndex((item) => item.checked === true))}>
                                {items.map((item, index) => (
                                    <DropdownMenuRadioItem
                                        key={index}
                                        value={String(index)}
                                        disabled={item.disabled}
                                        onClick={item.onSelect}
                                        className={cn(item.description !== undefined && 'items-start')}
                                    >
                                        {body(item)}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        ) : (
                            items.map((item, index) => (
                                <DropdownMenuItem
                                    key={index}
                                    disabled={item.disabled}
                                    variant={item.destructive === true ? 'destructive' : 'default'}
                                    onClick={item.onSelect}
                                    className={cn(item.description !== undefined && 'items-start')}
                                >
                                    {body(item)}
                                </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </ButtonGroup>
    )
}
