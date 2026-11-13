import * as React from 'react'
import { cn } from '../../lib/cn'
import { INVALID_EDGE } from '../../lib/issue-edge'
import { ChevronDownIcon } from 'lucide-react'

export type NativeSelectProps = Omit<React.ComponentProps<'select'>, 'size'> & {
    size?: 'sm' | 'default'
}

function NativeSelect({ className, size = 'default', ...props }: NativeSelectProps) {
    return (
        <div
            className={cn('group/native-select relative w-fit has-[select:disabled]:opacity-50', className)}
            data-slot="native-select-wrapper"
            data-size={size}
        >
            <select
                data-slot="native-select"
                data-size={size}
                className={cn(
                    'h-(--density-control) w-full min-w-0 appearance-none rounded-control border border-input bg-field py-1 pr-8 pl-2.5 text-sm transition-colors outline-none select-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-(--density-control-sm) data-[size=sm]:rounded-[min(var(--control-radius),10px)] data-[size=sm]:py-0.5 max-md:min-h-finger dark:hover:bg-input/50',
                    INVALID_EDGE,
                )}
                {...props}
            />
            <ChevronDownIcon
                className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground select-none"
                aria-hidden="true"
                data-slot="native-select-icon"
            />
        </div>
    )
}

export type NativeSelectOptionProps = React.ComponentProps<'option'>

function NativeSelectOption({ className, ...props }: NativeSelectOptionProps) {
    return <option data-slot="native-select-option" className={cn('bg-[Canvas] text-[CanvasText]', className)} {...props} />
}

export type NativeSelectOptGroupProps = React.ComponentProps<'optgroup'>

function NativeSelectOptGroup({ className, ...props }: NativeSelectOptGroupProps) {
    return <optgroup data-slot="native-select-optgroup" className={cn('bg-[Canvas] text-[CanvasText]', className)} {...props} />
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
