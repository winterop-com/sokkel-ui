import { Tooltip } from '@base-ui/react/tooltip'
import { CircleHelp } from 'lucide-react'
import type { ReactNode } from 'react'

import { Switch } from './ui/switch'

export interface SwitchFieldProps {
    id: string
    label: string
    /** What turning it on does, shown on hover or focus of the help mark. */
    explain?: string
    /** A short word beside the label, muted, such as `default` for a setting left at its default. */
    note?: ReactNode
    /** Why the setting cannot be changed now; given, the switch is disabled and the reason shows under the label in place of the help mark. */
    reason?: ReactNode
    checked?: boolean
    defaultChecked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
}

/**
 * An on/off setting: its label and the switch at the row's right edge. The whole row is the label,
 * so a press anywhere on it turns the switch. What it does, where the label alone does not say, is
 * a tooltip on a help mark beside the label rather than a line under it. `reason` disables the
 * switch and says why in a line under the label, where it can be read without hovering.
 */
export function SwitchField({ id, label, explain, note, reason, checked, defaultChecked, onCheckedChange, disabled }: SwitchFieldProps) {
    const held = reason !== undefined && reason !== null && reason !== false
    const reasonId = `${id}-reason`
    return (
        <label
            htmlFor={id}
            className="flex min-h-(--density-control) cursor-pointer items-center justify-between gap-4 text-sm has-disabled:cursor-not-allowed"
        >
            <span className="flex min-w-0 flex-col">
                {/* A long label breaks within its room, and the note and help mark wrap under it, never running under the switch. */}
                <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
                    <span id={`${id}-label`} className="min-w-0 wrap-anywhere">
                        {label}
                    </span>
                    {note !== undefined && <span className="min-w-0 text-xs wrap-anywhere text-faint">{note}</span>}
                    {explain !== undefined && !held && (
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
                {held && (
                    <span id={reasonId} className="text-help text-muted-foreground">
                        {reason}
                    </span>
                )}
            </span>
            <Switch
                id={id}
                checked={checked}
                defaultChecked={defaultChecked}
                onCheckedChange={(value) => onCheckedChange?.(value)}
                disabled={held || disabled}
                aria-labelledby={`${id}-label`}
                aria-describedby={held ? reasonId : undefined}
            />
        </label>
    )
}
