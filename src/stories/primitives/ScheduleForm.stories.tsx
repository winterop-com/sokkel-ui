import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DateField } from '@winterop-com/sokkel-ui/DateField'
import { DateTimeField } from '@winterop-com/sokkel-ui/DateTimeField'
import { FormBar } from '@winterop-com/sokkel-ui/FormBar'
import { IssueCount, type Issue, type IssueEntry } from '@winterop-com/sokkel-ui/IssueMark'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { TimeField } from '@winterop-com/sokkel-ui/TimeField'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'

/**
 * The date, time and number fields together in a form: when nightly-export starts, how often it
 * retries and how long a run may take. Each field says what it finds wrong itself and tells the
 * form, which counts it beside Save and holds the save until it is put right.
 */
const meta: Meta = { title: 'Primitives/Inputs/Schedule form', parameters: { frame: 'column' } }
export default meta

const TODAY = '2026-11-09'

const LABELS = { start: 'Start date', at: 'Runs at', retries: 'Retries', timeout: 'Timeout', paused: 'Paused until' } as const
type Key = keyof typeof LABELS

function ScheduleForm() {
    const [start, setStart] = useState<string | null>('2026-11-10')
    const [at, setAt] = useState<string | null>('02:00')
    const [retries, setRetries] = useState<number | null>(3)
    const [limit, setLimit] = useState<number | null>(7200)
    const [paused, setPaused] = useState<string | null>(null)
    const [found, setFound] = useState<Partial<Record<Key, Issue>>>({})
    const [open, setOpen] = useState<Key | null>(null)
    const [saved, setSaved] = useState(false)

    const told = (key: Key) => (issue: Issue | null) =>
        setFound(({ [key]: _gone, ...rest }) => (issue === null ? rest : { ...rest, [key]: issue }))
    const at_ = (key: Key) => ({
        id: `schedule-${key}`,
        label: LABELS[key],
        onIssueChange: told(key),
        issueOpen: open === key,
        onIssueOpenChange: (next: boolean) => setOpen(next ? key : null),
    })
    const list: IssueEntry[] = (Object.keys(LABELS) as Key[]).flatMap((key) => {
        const issue = found[key]
        return issue === undefined ? [] : [{ label: LABELS[key], issue, target: `schedule-${key}`, onGo: () => setOpen(key) }]
    })
    const changed =
        <T,>(set: (value: T) => void) =>
        (value: T) => {
            set(value)
            setSaved(false)
        }

    return (
        <Stack gap="lg" className="max-w-xl">
            <Section title="Schedule" description="When nightly-export starts each night, and what a run may take.">
                <Stack gap="lg">
                    <Columns count={2} min="sm" gap="lg">
                        <DateField {...at_('start')} required min={TODAY} today={TODAY} value={start} onValueChange={changed(setStart)} />
                        <TimeField {...at_('at')} required zone="UTC" value={at} onValueChange={changed(setAt)} />
                        <NumberField
                            {...at_('retries')}
                            hint="per step"
                            integer
                            min={0}
                            max={10}
                            stepper
                            value={retries}
                            onValueChange={changed(setRetries)}
                        />
                        <NumberField
                            {...at_('timeout')}
                            suffix="s"
                            integer
                            min={30}
                            max={3600}
                            step={30}
                            value={limit}
                            onValueChange={changed(setLimit)}
                        />
                    </Columns>
                    <DateTimeField
                        {...at_('paused')}
                        description="Leave empty to run every night."
                        zone="UTC"
                        min={`${TODAY}T00:00`}
                        today={TODAY}
                        value={paused}
                        onValueChange={changed(setPaused)}
                    />
                </Stack>
            </Section>
            <FormBar placement="end" note={saved ? 'Saved' : undefined}>
                <IssueCount critical={list.length} list={list} />
                <Button
                    onClick={() => {
                        if (list.length > 0) return setOpen((Object.keys(LABELS) as Key[]).find((key) => found[key] !== undefined) ?? null)
                        setSaved(start !== null && at !== null)
                    }}
                >
                    Save
                </Button>
            </FormBar>
        </Stack>
    )
}

/** A schedule for nightly-export: its timeout is over the hour a run may take, which its mark and the count beside Save say. */
export const Schedule: StoryObj = { render: () => <ScheduleForm /> }
