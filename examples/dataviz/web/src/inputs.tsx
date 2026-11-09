import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import type { ReactNode } from 'react'

import { PALETTES, THEME_TOKENS } from './model'

export interface Option {
    value: string
    label: string
    /** Drawn before the label in the list and the trigger. */
    lead?: ReactNode
}

/** A choice from a list, for a `Field` around it to label by `id`. */
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
        option?.lead === undefined ? (
            option?.label
        ) : (
            <Row gap="sm" align="center" className="min-w-0">
                {option.lead}
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
            : [{ value: 'default', label: withDefault.label, lead: <Swatches tokens={withDefault.tokens} /> }]),
        ...PALETTES.map((palette) => ({ value: palette.id, label: palette.label, lead: <Swatches tokens={palette.tokens} /> })),
    ]
}
