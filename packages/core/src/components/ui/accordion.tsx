import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { cn } from '../../lib/cn'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

export type AccordionProps = AccordionPrimitive.Root.Props

function Accordion({ className, ...props }: AccordionProps) {
    return <AccordionPrimitive.Root data-slot="accordion" className={cn('flex w-full flex-col', className)} {...props} />
}

export type AccordionItemProps = AccordionPrimitive.Item.Props

function AccordionItem({ className, ...props }: AccordionItemProps) {
    return <AccordionPrimitive.Item data-slot="accordion-item" className={cn('not-last:border-b', className)} {...props} />
}

export type AccordionTriggerProps = AccordionPrimitive.Trigger.Props

function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
    return (
        <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger
                data-slot="accordion-trigger"
                className={cn(
                    'group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground',
                    className,
                )}
                {...props}
            >
                {children}
                <ChevronDownIcon
                    data-slot="accordion-trigger-icon"
                    className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
                />
                <ChevronUpIcon
                    data-slot="accordion-trigger-icon"
                    className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
                />
            </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
    )
}

export type AccordionContentProps = AccordionPrimitive.Panel.Props

function AccordionContent({ className, children, ...props }: AccordionContentProps) {
    return (
        <AccordionPrimitive.Panel
            data-slot="accordion-content"
            className="overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up"
            {...props}
        >
            <div
                className={cn(
                    'h-(--accordion-panel-height) pt-0 pb-2.5 data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4',
                    className,
                )}
            >
                {children}
            </div>
        </AccordionPrimitive.Panel>
    )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
