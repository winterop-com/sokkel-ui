'use client'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { cn } from '../../lib/cn'
import { CHECKBOX, CHECKBOX_INDICATOR, CheckboxMarks } from './checkbox-look'

export type CheckboxProps = CheckboxPrimitive.Root.Props

function Checkbox({ className, ...props }: CheckboxProps) {
    return (
        <CheckboxPrimitive.Root data-slot="checkbox" className={cn(CHECKBOX, className)} {...props}>
            <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className={CHECKBOX_INDICATOR}>
                <CheckboxMarks />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    )
}

export { Checkbox }
