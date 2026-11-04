import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'
import type { DateRange } from 'react-day-picker'

import { Button } from '../../components/ui/button'
import { Calendar } from '../../components/ui/calendar'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

const MONTH = new Date(2026, 10, 1)
const DAY = new Date(2026, 10, 4)
const TODAY = new Date(2026, 10, 4)

const meta: Meta = { title: 'Primitives/Inputs/Calendar' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-start gap-6">
                <Labeled label="single">
                    <Calendar mode="single" defaultMonth={MONTH} selected={DAY} today={TODAY} className="rounded-lg border" />
                </Labeled>
                <Labeled label="range">
                    <Calendar
                        mode="range"
                        defaultMonth={MONTH}
                        selected={{ from: new Date(2026, 10, 2), to: new Date(2026, 10, 8) }}
                        today={TODAY}
                        className="rounded-lg border"
                    />
                </Labeled>
                <Labeled label="dropdown caption">
                    <Calendar
                        mode="single"
                        captionLayout="dropdown"
                        defaultMonth={MONTH}
                        selected={DAY}
                        today={TODAY}
                        startMonth={new Date(2024, 0)}
                        endMonth={new Date(2027, 11)}
                        className="rounded-lg border"
                    />
                </Labeled>
                <Labeled label="week numbers">
                    <Calendar
                        mode="single"
                        showWeekNumber
                        defaultMonth={MONTH}
                        selected={DAY}
                        today={TODAY}
                        className="rounded-lg border"
                    />
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-start gap-6">
                <Labeled label="disabled days (no future, no weekends)">
                    <Calendar
                        mode="single"
                        defaultMonth={MONTH}
                        selected={DAY}
                        today={TODAY}
                        disabled={[{ after: TODAY }, { dayOfWeek: [0, 6] }]}
                        className="rounded-lg border"
                    />
                </Labeled>
                <Labeled label="nothing selected">
                    <Calendar mode="single" defaultMonth={MONTH} today={TODAY} className="rounded-lg border" />
                </Labeled>
                <Labeled label="without outside days">
                    <Calendar
                        mode="single"
                        showOutsideDays={false}
                        defaultMonth={MONTH}
                        selected={DAY}
                        today={TODAY}
                        className="rounded-lg border"
                    />
                </Labeled>
            </div>
        </Ground>
    ),
}

function format(date: Date | undefined) {
    if (!date) return '...'
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function Backfill() {
    const [range, setRange] = useState<DateRange | undefined>({ from: new Date(2026, 9, 26), to: new Date(2026, 10, 1) })
    return (
        <Ground>
            <div className="flex max-w-md flex-col gap-3 rounded-lg border border-border p-4">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">Backfill weather-gate</p>
                    <p className="text-sm text-muted-foreground">
                        Start one run per day in the range. Runs that already succeeded are skipped.
                    </p>
                </div>
                <Calendar
                    mode="range"
                    defaultMonth={new Date(2026, 9, 1)}
                    numberOfMonths={1}
                    selected={range}
                    onSelect={setRange}
                    today={TODAY}
                    disabled={{ after: TODAY }}
                    className="self-center"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs text-muted-foreground">
                        {format(range?.from)} to {format(range?.to)}
                    </p>
                    <Button size="sm" disabled={!range?.from || !range?.to}>
                        Start backfill
                    </Button>
                </div>
            </div>
        </Ground>
    )
}

export const BackfillRange: StoryObj = { render: () => <Backfill /> }
