import { Tooltip } from '@base-ui/react/tooltip'
import { CircleHelp } from 'lucide-react'

import { Switch } from './ui/switch'

/**
 * An on/off setting: its label and the switch at the row's right edge. What it does, where the
 * label alone does not say, is a tooltip on a help mark beside the label rather than a line under
 * it.
 */
export function SwitchField({
    id,
    label,
    explain,
    checked,
    defaultChecked,
    onCheckedChange,
    disabled,
}: {
    id: string
    label: string
    /** What turning it on does, shown on hover or focus of the help mark. */
    explain?: string
    checked?: boolean
    defaultChecked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
}) {
    return (
        <div className="flex min-h-(--density-control) items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-1.5">
                <label htmlFor={id}>{label}</label>
                {explain !== undefined && (
                    <Tooltip.Root>
                        <Tooltip.Trigger
                            render={(props) => (
                                <button
                                    {...props}
                                    type="button"
                                    aria-label={explain}
                                    className="flex size-4 items-center justify-center rounded-full text-faint hover:text-muted-foreground"
                                >
                                    <CircleHelp className="size-3.5" aria-hidden />
                                </button>
                            )}
                        />
                        <Tooltip.Portal>
                            <Tooltip.Positioner sideOffset={6}>
                                <Tooltip.Popup className="max-w-64 rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-pop">
                                    {explain}
                                </Tooltip.Popup>
                            </Tooltip.Positioner>
                        </Tooltip.Portal>
                    </Tooltip.Root>
                )}
            </span>
            <Switch
                id={id}
                checked={checked}
                defaultChecked={defaultChecked}
                onCheckedChange={(value) => onCheckedChange?.(value)}
                disabled={disabled}
            />
        </div>
    )
}
