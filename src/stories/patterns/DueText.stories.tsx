import type { Meta, StoryObj } from '@storybook/react-vite'
import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'

import { DueText } from '../../components/DueText'
import { Stack } from '../../components/Layout'

const meta: Meta = { title: 'Patterns/Due text', parameters: { frame: 'column' } }
export default meta

/** Today, for every story: the tone follows from it, never from the clock. */
const NOW = new Date(2026, 10, 5, 9, 30)
const day = (date: number) => new Date(2026, 10, date)

/** Passed, today, and later: critical, warning, and quiet. */
export const Dates: StoryObj = {
    render: () => (
        <Stack gap="xs" className="text-sm">
            <DueText date={day(3)} now={NOW} />
            <DueText date={day(5)} now={NOW} />
            <DueText date={day(12)} now={NOW} />
        </Stack>
    ),
}

/** In the surrounding color while not near, as a value in a list of fields. */
export const Plain: StoryObj = {
    render: () => (
        <Stack gap="xs" className="text-sm">
            <DueText date={day(4)} now={NOW} quiet={false} words={{ date: (date) => format(date, 'EEEE d MMMM') }} />
            <DueText date={day(20)} now={NOW} quiet={false} words={{ date: (date) => format(date, 'EEEE d MMMM') }} />
        </Stack>
    ),
}

/** A glyph before the date, as a card's foot draws it; a finished item's date is never toned. */
export const Icon: StoryObj = {
    render: () => (
        <Stack gap="xs" className="text-xs">
            <DueText date={day(2)} now={NOW} icon={<CalendarDays aria-hidden />} />
            <DueText date={day(5)} now={NOW} icon={<CalendarDays aria-hidden />} />
            <DueText date={day(2)} now={NOW} done icon={<CalendarDays aria-hidden />} />
        </Stack>
    ),
}

/** An expiry: near within a week, the warning mark while toned, and no date at all. */
export const Expiry: StoryObj = {
    render: () => {
        const words = {
            date: (date: Date) => format(date, 'MMM d'),
            title: () => undefined,
            none: 'never',
        }
        return (
            <Stack gap="xs" className="text-sm">
                <DueText date={day(1)} now={NOW} nearDays={7} alert words={words} />
                <DueText date={day(8)} now={NOW} nearDays={7} alert words={words} />
                <DueText date={new Date(2026, 11, 31)} now={NOW} nearDays={7} alert words={words} />
                <DueText date={undefined} now={NOW} words={words} />
            </Stack>
        )
    },
}
