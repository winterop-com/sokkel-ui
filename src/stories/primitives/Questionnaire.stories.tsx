import type { Meta, StoryObj } from '@storybook/react-vite'
import { BotIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Message, MessageAvatar, MessageContent } from '../../components/ui/message'
import {
    Questionnaire,
    QuestionnaireActions,
    QuestionnaireChoice,
    QuestionnaireChoiceDescription,
    QuestionnaireChoices,
    QuestionnaireDescription,
    QuestionnaireError,
    QuestionnaireInput,
    QuestionnaireItem,
    QuestionnaireNext,
    QuestionnairePrevious,
    QuestionnaireProgress,
    QuestionnaireSkip,
    QuestionnaireSubmit,
    QuestionnaireTitle,
} from '../../components/ui/questionnaire'

/**
 * Questions an assistant asks back, one at a time: a single choice, several choices, or a typed
 * answer, with a way back, a skip and a next.
 */
function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

function Panel({ children }: { children: ReactNode }) {
    return <div className="w-full max-w-md rounded-xl border border-border p-4">{children}</div>
}

const meta: Meta = { title: 'Primitives/Chat/Questionnaire' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-start gap-6">
                <div className="flex w-full max-w-md flex-col gap-2">
                    <Caption>single choice, letter shortcuts</Caption>
                    <Panel>
                        <Questionnaire
                            shortcuts="letters"
                            items={[{ name: 'action', choices: [{ value: 'rerun' }, { value: 'pause' }, { value: 'nothing' }] }]}
                        >
                            <QuestionnaireItem name="action">
                                <QuestionnaireTitle>What should happen to weather-gate?</QuestionnaireTitle>
                                <QuestionnaireChoices>
                                    <QuestionnaireChoice value="rerun" defaultChecked>
                                        Rerun it now
                                    </QuestionnaireChoice>
                                    <QuestionnaireChoice value="pause">Pause its trigger</QuestionnaireChoice>
                                    <QuestionnaireChoice value="nothing">Leave it</QuestionnaireChoice>
                                </QuestionnaireChoices>
                            </QuestionnaireItem>
                            <QuestionnaireActions>
                                <QuestionnaireSubmit />
                            </QuestionnaireActions>
                        </Questionnaire>
                    </Panel>
                </div>
                <div className="flex w-full max-w-md flex-col gap-2">
                    <Caption>several choices, with descriptions</Caption>
                    <Panel>
                        <Questionnaire
                            shortcuts="numbers"
                            items={[{ name: 'notify', choices: [{ value: 'email' }, { value: 'slack' }, { value: 'webhook' }] }]}
                        >
                            <QuestionnaireItem name="notify" multiple>
                                <QuestionnaireTitle>Who hears when it fails again?</QuestionnaireTitle>
                                <QuestionnaireDescription>Pick any number.</QuestionnaireDescription>
                                <QuestionnaireChoices>
                                    <QuestionnaireChoice value="email" defaultChecked>
                                        Email
                                        <QuestionnaireChoiceDescription>The pipeline's owners</QuestionnaireChoiceDescription>
                                    </QuestionnaireChoice>
                                    <QuestionnaireChoice value="slack" defaultChecked>
                                        Slack
                                        <QuestionnaireChoiceDescription>#pipelines</QuestionnaireChoiceDescription>
                                    </QuestionnaireChoice>
                                    <QuestionnaireChoice value="webhook">
                                        Webhook
                                        <QuestionnaireChoiceDescription>A URL you name</QuestionnaireChoiceDescription>
                                    </QuestionnaireChoice>
                                </QuestionnaireChoices>
                            </QuestionnaireItem>
                            <QuestionnaireActions>
                                <QuestionnaireSubmit />
                            </QuestionnaireActions>
                        </Questionnaire>
                    </Panel>
                </div>
                <div className="flex w-full max-w-md flex-col gap-2">
                    <Caption>typed answer</Caption>
                    <Panel>
                        <Questionnaire items={[{ name: 'station' }]}>
                            <QuestionnaireItem name="station">
                                <QuestionnaireTitle>Which station should the gate read?</QuestionnaireTitle>
                                <QuestionnaireInput defaultValue="SN18700" />
                            </QuestionnaireItem>
                            <QuestionnaireActions>
                                <QuestionnaireSubmit />
                            </QuestionnaireActions>
                        </Questionnaire>
                    </Panel>
                </div>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-start gap-6">
                <div className="flex w-full max-w-md flex-col gap-2">
                    <Caption>invalid, a required answer missing</Caption>
                    <Panel>
                        <Questionnaire items={[{ name: 'code', required: true }]}>
                            <QuestionnaireItem name="code" required invalid>
                                <QuestionnaireTitle>Name the new trigger</QuestionnaireTitle>
                                <QuestionnaireInput placeholder="every-hour" aria-invalid />
                                <QuestionnaireError>Give the trigger a code.</QuestionnaireError>
                            </QuestionnaireItem>
                            <QuestionnaireActions>
                                <QuestionnaireSubmit />
                            </QuestionnaireActions>
                        </Questionnaire>
                    </Panel>
                </div>
                <div className="flex w-full max-w-md flex-col gap-2">
                    <Caption>a disabled choice</Caption>
                    <Panel>
                        <Questionnaire
                            items={[{ name: 'target', choices: [{ value: 'dhis2-play' }, { value: 'dhis2-prod', disabled: true }] }]}
                        >
                            <QuestionnaireItem name="target">
                                <QuestionnaireTitle>Where should store write?</QuestionnaireTitle>
                                <QuestionnaireChoices>
                                    <QuestionnaireChoice value="dhis2-play" defaultChecked>
                                        dhis2-play
                                    </QuestionnaireChoice>
                                    <QuestionnaireChoice value="dhis2-prod" disabled>
                                        dhis2-prod
                                        <QuestionnaireChoiceDescription>You cannot write to this connection</QuestionnaireChoiceDescription>
                                    </QuestionnaireChoice>
                                </QuestionnaireChoices>
                            </QuestionnaireItem>
                            <QuestionnaireActions>
                                <QuestionnaireSubmit />
                            </QuestionnaireActions>
                        </Questionnaire>
                    </Panel>
                </div>
                <div className="flex w-full max-w-md flex-col gap-2">
                    <Caption>disabled input</Caption>
                    <Panel>
                        <Questionnaire items={[{ name: 'schedule' }]}>
                            <QuestionnaireItem name="schedule">
                                <QuestionnaireTitle>Cron schedule</QuestionnaireTitle>
                                <QuestionnaireInput defaultValue="2 * * * *" disabled />
                            </QuestionnaireItem>
                            <QuestionnaireActions>
                                <QuestionnaireSubmit />
                            </QuestionnaireActions>
                        </Questionnaire>
                    </Panel>
                </div>
            </div>
        </Ground>
    ),
}

const STEPS = [
    { name: 'action', choices: [{ value: 'rerun' }, { value: 'pause' }, { value: 'edit' }] },
    { name: 'source', choices: [{ value: 'forecast' }, { value: 'readings' }] },
    { name: 'note' },
]

export const FollowUp: StoryObj = {
    render: () => (
        <Ground>
            <div className="max-w-2xl">
                <Message>
                    <MessageAvatar className="size-8 text-muted-foreground">
                        <BotIcon className="size-4" />
                    </MessageAvatar>
                    <MessageContent>
                        <div className="rounded-xl border border-border p-4">
                            <Questionnaire shortcuts="letters" items={STEPS} defaultItem="source">
                                <QuestionnaireProgress />
                                <QuestionnaireItem name="action">
                                    <QuestionnaireTitle>What should happen to weather-gate?</QuestionnaireTitle>
                                    <QuestionnaireChoices>
                                        <QuestionnaireChoice value="rerun">Rerun it now</QuestionnaireChoice>
                                        <QuestionnaireChoice value="pause">Pause its trigger</QuestionnaireChoice>
                                        <QuestionnaireChoice value="edit" defaultChecked>
                                            Change the gate step
                                        </QuestionnaireChoice>
                                    </QuestionnaireChoices>
                                </QuestionnaireItem>
                                <QuestionnaireItem name="source">
                                    <QuestionnaireTitle>Which source should the gate check?</QuestionnaireTitle>
                                    <QuestionnaireDescription>
                                        The forecast had no rows for SN18700 at 14:02; your readings CSV has 288.
                                    </QuestionnaireDescription>
                                    <QuestionnaireChoices>
                                        <QuestionnaireChoice value="forecast">
                                            The forecast from met-no
                                            <QuestionnaireChoiceDescription>As it is configured now</QuestionnaireChoiceDescription>
                                        </QuestionnaireChoice>
                                        <QuestionnaireChoice value="readings" defaultChecked>
                                            The uploaded readings
                                            <QuestionnaireChoiceDescription>Checked against schema readings</QuestionnaireChoiceDescription>
                                        </QuestionnaireChoice>
                                    </QuestionnaireChoices>
                                </QuestionnaireItem>
                                <QuestionnaireItem name="note">
                                    <QuestionnaireTitle>Anything to add to the change?</QuestionnaireTitle>
                                    <QuestionnaireInput placeholder="A note for the run log" />
                                </QuestionnaireItem>
                                <QuestionnaireActions>
                                    <QuestionnairePrevious />
                                    <QuestionnaireSkip />
                                    <QuestionnaireNext />
                                    <QuestionnaireSubmit />
                                </QuestionnaireActions>
                            </Questionnaire>
                        </div>
                    </MessageContent>
                </Message>
            </div>
        </Ground>
    ),
}
