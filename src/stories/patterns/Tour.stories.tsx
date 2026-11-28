import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Surface } from '@winterop-com/sokkel-ui/Section'
import { Tour, type TourStep } from '@winterop-com/sokkel-ui/Tour'

/**
 * A guided tour of a page: one step at a time, each beside the part it is about, that part cut out
 * of a dimmed page and ringed.
 */
const meta: Meta = { title: 'Patterns/Tour' }
export default meta

const STEPS: TourStep[] = [
    { title: 'Welcome to Tidevann', body: 'A short look at where your jobs run and how to start one.' },
    {
        target: '#tour-new',
        title: 'Start a job',
        body: 'New starts a job now: nightly-export, sync-inventory or one of your own.',
        side: 'bottom',
    },
    {
        target: '#tour-runs',
        title: 'Watch it run',
        body: 'Each run shows here with its steps as it goes: fetch, transform, validate, upload, notify.',
        side: 'top',
    },
    { target: '#tour-help', title: 'Ask for help', body: 'Help opens the docs at the page you are on.', side: 'left' },
]

function Page({ start }: { start: number }) {
    const [open, setOpen] = useState(true)
    const [step, setStep] = useState(start)
    return (
        <Stack gap="lg" className="p-6">
            <PageHeader
                title="Jobs"
                description="What runs in harbor, and when."
                actions={
                    <>
                        <Button id="tour-help" variant="outline" size="sm">
                            Help
                        </Button>
                        <Button id="tour-new" size="sm">
                            New
                        </Button>
                    </>
                }
            />
            <Surface pad id="tour-runs">
                <p className="text-sm text-muted-foreground">nightly-export ran at 02:00 and succeeded in 4 minutes.</p>
            </Surface>
            {!open && (
                <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => {
                        setStep(0)
                        setOpen(true)
                    }}
                >
                    Take the tour
                </Button>
            )}
            <Tour steps={STEPS} open={open} onOpenChange={setOpen} step={step} onStepChange={setStep} />
        </Stack>
    )
}

/** The first step, with no target: in the middle of a dimmed page. */
export const Welcome: StoryObj = { render: () => <Page start={0} /> }

/** The second step, beside the New button, the button cut out of the dim and ringed. Next and Back move through the steps; Skip tour or Escape ends it. */
export const Step: StoryObj = { render: () => <Page start={1} /> }
