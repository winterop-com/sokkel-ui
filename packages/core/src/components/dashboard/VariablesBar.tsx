import { useId, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'

/** One choice of a dashboard variable. */
export interface VariableOption {
    value: string
    label: string
}

/** A dashboard variable: a dropdown of choices, or a toggle. */
export type Variable =
    | {
          kind: 'select'
          id: string
          label: string
          value: string
          options: readonly VariableOption[]
          onChange: (value: string) => void
      }
    | {
          kind: 'toggle'
          id: string
          label: string
          checked: boolean
          onChange: (checked: boolean) => void
      }

const CHIP = 'flex h-7 min-w-0 items-stretch overflow-hidden rounded-control border border-border bg-field text-xs'
const LABEL = 'flex shrink-0 items-center border-r border-border bg-secondary px-2 font-medium text-muted-foreground'

function SelectVariable({ variable }: { variable: Extract<Variable, { kind: 'select' }> }) {
    const id = useId()
    return (
        <div className={CHIP}>
            <label htmlFor={id} className={LABEL}>
                {variable.label}
            </label>
            <Select
                items={variable.options}
                value={variable.value}
                onValueChange={(next) => next !== null && variable.onChange(String(next))}
            >
                <SelectTrigger
                    id={id}
                    size="sm"
                    className="h-full min-w-24 rounded-none border-0 bg-transparent py-0 pr-1.5 pl-2 text-xs focus-visible:ring-inset"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start">
                    {variable.options.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

function ToggleVariable({ variable }: { variable: Extract<Variable, { kind: 'toggle' }> }) {
    const id = useId()
    return (
        <div className={CHIP}>
            <label htmlFor={id} className={LABEL}>
                {variable.label}
            </label>
            <span className="flex items-center px-2">
                <Switch id={id} size="sm" checked={variable.checked} onCheckedChange={(checked) => variable.onChange(checked)} />
            </span>
        </div>
    )
}

export interface VariablesBarProps {
    variables: readonly Variable[]
    end?: ReactNode
    className?: string
}

/**
 * The bar across a dashboard's top: its variables as labeled dropdowns and toggles that filter
 * every panel, and at the end, such as the range and refresh controls. It wraps on a narrow screen.
 */
export function VariablesBar({ variables, end, className }: VariablesBarProps) {
    return (
        <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
            {variables.map((variable) =>
                variable.kind === 'select' ? (
                    <SelectVariable key={variable.id} variable={variable} />
                ) : (
                    <ToggleVariable key={variable.id} variable={variable} />
                ),
            )}
            {end !== undefined && <div className="ml-auto flex flex-wrap items-center gap-1.5">{end}</div>}
        </div>
    )
}
