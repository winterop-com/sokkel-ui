'use client'

import * as React from 'react'
import type { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu'
import { cn } from '../../lib/cn'
import { POPUP } from '../../lib/popup'
import { contextMenu as ContextMenuPrimitive } from './deferred-menu'
import { ChevronRightIcon, CheckIcon } from 'lucide-react'

export type ContextMenuProps = BaseContextMenu.Root.Props

/**
 * A menu opened by a right click or a long press on its trigger. Base UI's context menu loads when
 * the first one is drawn, the trigger drawn until then by a stand-in that keeps the browser's menu
 * away, a right click on it opening the menu at its point once it is here.
 */
function ContextMenu({ loopFocus = false, ...props }: ContextMenuProps) {
    return <ContextMenuPrimitive.Root data-slot="context-menu" loopFocus={loopFocus} {...props} />
}

export type ContextMenuPortalProps = BaseContextMenu.Portal.Props

function ContextMenuPortal({ ...props }: ContextMenuPortalProps) {
    return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
}

export type ContextMenuTriggerProps = BaseContextMenu.Trigger.Props

function ContextMenuTrigger({ className, ...props }: ContextMenuTriggerProps) {
    return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" className={cn('select-none', className)} {...props} />
}

export type ContextMenuContentProps = BaseContextMenu.Popup.Props &
    Pick<BaseContextMenu.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>

function ContextMenuContent({
    className,
    align = 'start',
    alignOffset = 4,
    side = 'right',
    sideOffset = 0,
    ...props
}: ContextMenuContentProps) {
    return (
        <ContextMenuPrimitive.Portal>
            <ContextMenuPrimitive.Positioner
                className="isolate z-popover outline-none"
                align={align}
                alignOffset={alignOffset}
                side={side}
                sideOffset={sideOffset}
            >
                <ContextMenuPrimitive.Popup
                    data-slot="context-menu-content"
                    className={cn(
                        POPUP,
                        'z-popover max-h-(--available-height) w-max max-w-[calc(100vw-2rem)] min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto p-1 duration-fast outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                        GUTTER,
                        className,
                    )}
                    {...props}
                />
            </ContextMenuPrimitive.Positioner>
        </ContextMenuPrimitive.Portal>
    )
}

/**
 * A menu holding a check or a radio item keeps their indicators in a gutter at the start, and its
 * plain rows step in past it, so every row's words start at one edge.
 */
const GUTTER = 'has-[[role=menuitemcheckbox],[role=menuitemradio]]:**:data-menu-row:pl-7'

/** Every row a control tall, at the density's height, and a finger tall below `md`. */
const ROW_HEIGHT = 'min-h-(--density-control) max-md:min-h-finger'

export type ContextMenuGroupProps = BaseContextMenu.Group.Props

function ContextMenuGroup({ ...props }: ContextMenuGroupProps) {
    return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
}

export type ContextMenuLabelProps = BaseContextMenu.GroupLabel.Props & {
    inset?: boolean
}

function ContextMenuLabel({ className, inset, ...props }: ContextMenuLabelProps) {
    return (
        <ContextMenuPrimitive.GroupLabel
            data-slot="context-menu-label"
            data-menu-row=""
            data-inset={inset || undefined}
            className={cn('px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7', className)}
            {...props}
        />
    )
}

export type ContextMenuItemProps = BaseContextMenu.Item.Props & {
    inset?: boolean
    variant?: 'default' | 'destructive'
}

function ContextMenuItem({ className, inset, variant = 'default', ...props }: ContextMenuItemProps) {
    return (
        <ContextMenuPrimitive.Item
            data-slot="context-menu-item"
            data-menu-row=""
            data-inset={inset || undefined}
            data-variant={variant}
            className={cn(
                ROW_HEIGHT,
                "group/context-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus:*:[svg]:text-accent-foreground data-[variant=destructive]:*:[svg]:text-destructive",
                className,
            )}
            {...props}
        />
    )
}

export type ContextMenuSubProps = BaseContextMenu.SubmenuRoot.Props

function ContextMenuSub({ loopFocus = false, ...props }: ContextMenuSubProps) {
    return <ContextMenuPrimitive.SubmenuRoot data-slot="context-menu-sub" loopFocus={loopFocus} {...props} />
}

export type ContextMenuSubTriggerProps = BaseContextMenu.SubmenuTrigger.Props & {
    inset?: boolean
}

function ContextMenuSubTrigger({ className, inset, children, ...props }: ContextMenuSubTriggerProps) {
    return (
        <ContextMenuPrimitive.SubmenuTrigger
            data-slot="context-menu-sub-trigger"
            data-menu-row=""
            data-inset={inset || undefined}
            className={cn(
                ROW_HEIGHT,
                "flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        >
            {children}
            <ChevronRightIcon className="ml-auto" />
        </ContextMenuPrimitive.SubmenuTrigger>
    )
}

export type ContextMenuSubContentProps = React.ComponentProps<typeof ContextMenuContent>

function ContextMenuSubContent({ ...props }: ContextMenuSubContentProps) {
    return <ContextMenuContent data-slot="context-menu-sub-content" side="right" {...props} />
}

export type ContextMenuCheckboxItemProps = BaseContextMenu.CheckboxItem.Props & {
    inset?: boolean
}

function ContextMenuCheckboxItem({ className, children, checked, inset, ...props }: ContextMenuCheckboxItemProps) {
    return (
        <ContextMenuPrimitive.CheckboxItem
            data-slot="context-menu-checkbox-item"
            data-inset={inset || undefined}
            className={cn(
                ROW_HEIGHT,
                "relative flex cursor-default items-center gap-1.5 rounded-md py-0.5 pr-1.5 pl-7 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            checked={checked}
            {...props}
        >
            <span className="pointer-events-none absolute left-1.5 flex size-4 items-center justify-center">
                <ContextMenuPrimitive.CheckboxItemIndicator>
                    <CheckIcon />
                </ContextMenuPrimitive.CheckboxItemIndicator>
            </span>
            {children}
        </ContextMenuPrimitive.CheckboxItem>
    )
}

export type ContextMenuRadioGroupProps = BaseContextMenu.RadioGroup.Props

function ContextMenuRadioGroup({ ...props }: ContextMenuRadioGroupProps) {
    return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />
}

export type ContextMenuRadioItemProps = BaseContextMenu.RadioItem.Props & {
    inset?: boolean
}

function ContextMenuRadioItem({ className, children, inset, ...props }: ContextMenuRadioItemProps) {
    return (
        <ContextMenuPrimitive.RadioItem
            data-slot="context-menu-radio-item"
            data-inset={inset || undefined}
            className={cn(
                ROW_HEIGHT,
                "relative flex cursor-default items-center gap-1.5 rounded-md py-0.5 pr-1.5 pl-7 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        >
            <span className="pointer-events-none absolute left-1.5 flex size-4 items-center justify-center">
                <ContextMenuPrimitive.RadioItemIndicator>
                    <CheckIcon />
                </ContextMenuPrimitive.RadioItemIndicator>
            </span>
            {children}
        </ContextMenuPrimitive.RadioItem>
    )
}

export type ContextMenuSeparatorProps = BaseContextMenu.Separator.Props

function ContextMenuSeparator({ className, ...props }: ContextMenuSeparatorProps) {
    return (
        <ContextMenuPrimitive.Separator
            data-slot="context-menu-separator"
            className={cn('-mx-1 my-1 h-px bg-border', className)}
            {...props}
        />
    )
}

export type ContextMenuShortcutProps = React.ComponentProps<'span'>

function ContextMenuShortcut({ className, ...props }: ContextMenuShortcutProps) {
    return (
        <span
            data-slot="context-menu-shortcut"
            className={cn(
                'ml-auto text-xs tracking-widest text-muted-foreground group-focus/context-menu-item:text-accent-foreground',
                className,
            )}
            {...props}
        />
    )
}

export {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuCheckboxItem,
    ContextMenuRadioItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuGroup,
    ContextMenuPortal,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuRadioGroup,
}
