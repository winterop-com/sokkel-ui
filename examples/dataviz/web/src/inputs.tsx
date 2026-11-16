import { Dot } from '@winterop-com/sokkel-ui/Dot'
import type { SelectFieldOption } from '@winterop-com/sokkel-ui/SelectField'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'

import { PALETTES, THEME_TOKENS } from './model'

/** An option of a select: its value, its label, and an `icon` drawn before the label. */
export type Option = SelectFieldOption

/** A choice from a list with no label of its own, for a setting's row, whose title names it; a labeled one is a `SelectField`. */
export function SelectInput({
    id,
    value,
    options,
    onChange,
    label,
    disabled,
}: {
    id: string
    value: string
    options: readonly Option[]
    onChange: (value: string) => void
    label?: string
    disabled?: boolean
}) {
    const lead = (option: Option | undefined) =>
        option?.icon === undefined ? (
            option?.label
        ) : (
            <Row gap="sm" align="center" className="min-w-0">
                {option.icon}
                <span className="truncate">{option.label}</span>
            </Row>
        )
    return (
        <Select items={options} value={value} disabled={disabled} onValueChange={(next) => next !== null && onChange(String(next))}>
            <SelectTrigger id={id} aria-label={label} className="w-full">
                <SelectValue>{(chosen: string) => lead(options.find((option) => option.value === chosen))}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start">
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {lead(option)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

/** A palette's colors as a row of dots. */
export function Swatches({ tokens }: { tokens: readonly string[] | undefined }) {
    return (
        <Row gap="xs" align="center" className="shrink-0">
            {(tokens ?? THEME_TOKENS).slice(0, 5).map((token) => (
                <Dot key={token} color={`var(--${token})`} />
            ))}
        </Row>
    )
}

/** The palettes as options, each with its colors; `withDefault` adds the one the settings name. */
export function paletteOptions(withDefault: { label: string; tokens: readonly string[] | undefined } | undefined): Option[] {
    return [
        ...(withDefault === undefined
            ? []
            : [{ value: 'default', label: withDefault.label, icon: <Swatches tokens={withDefault.tokens} /> }]),
        ...PALETTES.map((palette) => ({ value: palette.id, label: palette.label, icon: <Swatches tokens={palette.tokens} /> })),
    ]
}
