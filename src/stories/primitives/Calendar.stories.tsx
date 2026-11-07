import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'

import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Calendar } from '@winterop-com/sokkel-ui/primitives/calendar'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Specimen } from '../fixtures/Specimen'

const MONTH = new Date(2026, 10, 1)
const DAY = new Date(2026, 10, 4)
const TODAY = new Date(2026, 10, 4)

const meta: Meta = { title: 'Primitives/Inputs/Calendar', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="start" wrap>
            <Specimen label="single">
                <Calendar mode="single" defaultMonth={MONTH} selected={DAY} today={TODAY} className="rounded-lg border" />
            </Specimen>
            <Specimen label="range">
                <Calendar
                    mode="range"
                    defaultMonth={MONTH}
                    selected={{ from: new Date(2026, 10, 2), to: new Date(2026, 10, 8) }}
                    today={TODAY}
                    className="rounded-lg border"
                />
            </Specimen>
            <Specimen label="dropdown caption">
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
            </Specimen>
            <Specimen label="week numbers">
                <Calendar mode="single" showWeekNumber defaultMonth={MONTH} selected={DAY} today={TODAY} className="rounded-lg border" />
            </Specimen>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="start" wrap>
            <Specimen label="disabled days (no future, no weekends)">
                <Calendar
                    mode="single"
                    defaultMonth={MONTH}
                    selected={DAY}
                    today={TODAY}
                    disabled={[{ after: TODAY }, { dayOfWeek: [0, 6] }]}
                    className="rounded-lg border"
                />
            </Specimen>
            <Specimen label="nothing selected">
                <Calendar mode="single" defaultMonth={MONTH} today={TODAY} className="rounded-lg border" />
            </Specimen>
            <Specimen label="without outside days">
                <Calendar
                    mode="single"
                    showOutsideDays={false}
                    defaultMonth={MONTH}
                    selected={DAY}
                    today={TODAY}
                    className="rounded-lg border"
                />
            </Specimen>
        </Row>
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
        <Stack className="max-w-md rounded-lg border border-border p-4">
            <Stack gap="2xs">
                <p className="text-sm font-medium">Backfill nightly-export</p>
                <p className="text-sm text-muted-foreground">
                    Start one run per day in the range. Runs that already succeeded are skipped.
                </p>
            </Stack>
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
            <Row justify="between" wrap>
                <p className="font-mono text-xs text-muted-foreground">
                    {format(range?.from)} to {format(range?.to)}
                </p>
                <Button size="sm" disabled={!range?.from || !range?.to}>
                    Start backfill
                </Button>
            </Row>
        </Stack>
    )
}

export const BackfillRange: StoryObj = { render: () => <Backfill /> }
