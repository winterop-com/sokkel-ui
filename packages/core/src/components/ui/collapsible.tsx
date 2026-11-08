import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'

export type CollapsibleProps = CollapsiblePrimitive.Root.Props

function Collapsible({ ...props }: CollapsibleProps) {
    return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

export type CollapsibleTriggerProps = CollapsiblePrimitive.Trigger.Props

function CollapsibleTrigger({ ...props }: CollapsibleTriggerProps) {
    return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
}

export type CollapsibleContentProps = CollapsiblePrimitive.Panel.Props

function CollapsibleContent({ ...props }: CollapsibleContentProps) {
    return <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
