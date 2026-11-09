import { tokenVar } from '@winterop-com/sokkel-ui/dashboard/thresholds'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import { ToggleGroup, ToggleGroupItem } from '@winterop-com/sokkel-ui/primitives/toggle-group'

import { COLORS } from './model'

export interface Option {
    value: string
    label: string
}

/** A choice from a list, for a `Field` around it to label by `id`. */
export function SelectInput({
    id,
    value,
    options,
    onChange,
    label,
}: {
    id: string
    value: string
    options: readonly Option[]
    onChange: (value: string) => void
    label?: string
}) {
    return (
        <Select items={options} value={value} onValueChange={(next) => next !== null && onChange(String(next))}>
            <SelectTrigger id={id} aria-label={label} className="w-full">
                <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start">
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

/** A color token picked from the theme's swatches. */
export function ColorInput({
    id,
    value,
    onChange,
    label,
}: {
    id: string
    value: string
    onChange: (value: string) => void
    label: string
}) {
    return (
        <ToggleGroup
            id={id}
            aria-label={label}
            variant="outline"
            size="sm"
            spacing={1}
            className="flex-wrap"
            value={[value]}
            onValueChange={(next: string[]) => {
                const [chosen] = next
                if (chosen !== undefined) onChange(chosen)
            }}
        >
            {COLORS.map((color) => (
                <ToggleGroupItem key={color.value} value={color.value} aria-label={color.label} title={color.label}>
                    <Dot color={tokenVar(color.value)} />
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    )
}

/** A color token picked from a list naming each with its swatch, for a threshold's row. */
export function ColorSelect({
    id,
    value,
    onChange,
    label,
}: {
    id: string
    value: string
    onChange: (value: string) => void
    label: string
}) {
    return (
        <Select items={COLORS} value={value} onValueChange={(next) => next !== null && onChange(String(next))}>
            <SelectTrigger id={id} aria-label={label} className="w-36 shrink-0">
                <SelectValue>
                    {(chosen: string) => (
                        <span className="flex items-center gap-2">
                            <Dot color={tokenVar(chosen)} />
                            {COLORS.find((color) => color.value === chosen)?.label ?? chosen}
                        </span>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start">
                {COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                        <span className="flex items-center gap-2">
                            <Dot color={tokenVar(color.value)} />
                            {color.label}
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
