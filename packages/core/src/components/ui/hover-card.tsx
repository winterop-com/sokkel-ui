'use client'

import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card'
import { cn } from '../../lib/cn'
import { POPUP } from '../../lib/popup'

export type HoverCardProps = PreviewCardPrimitive.Root.Props

function HoverCard({ ...props }: HoverCardProps) {
    return <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />
}

export type HoverCardTriggerProps = PreviewCardPrimitive.Trigger.Props

function HoverCardTrigger({ ...props }: HoverCardTriggerProps) {
    return <PreviewCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
}

export type HoverCardContentProps = PreviewCardPrimitive.Popup.Props &
    Pick<PreviewCardPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>

function HoverCardContent({
    className,
    side = 'bottom',
    sideOffset = 4,
    align = 'center',
    alignOffset = 4,
    ...props
}: HoverCardContentProps) {
    return (
        <PreviewCardPrimitive.Portal data-slot="hover-card-portal">
            <PreviewCardPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                side={side}
                sideOffset={sideOffset}
                className="isolate z-popover"
            >
                <PreviewCardPrimitive.Popup
                    data-slot="hover-card-content"
                    className={cn(
                        POPUP,
                        'z-popover w-64 origin-(--transform-origin) p-2.5 text-sm outline-hidden duration-fast data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                        className,
                    )}
                    {...props}
                />
            </PreviewCardPrimitive.Positioner>
        </PreviewCardPrimitive.Portal>
    )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
