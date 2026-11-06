import type { Meta, StoryObj } from '@storybook/react-vite'
import { BotIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Message, MessageAvatar, MessageContent } from '../../components/ui/message'
import { Row, Stack } from '../../components/Layout'
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
function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

function Panel({ children }: { children: ReactNode }) {
    return <div className="w-full max-w-md rounded-xl border border-border p-4">{children}</div>
}

const meta: Meta = { title: 'Primitives/Chat/Questionnaire', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="start" wrap>
            <Stack gap="sm" className="w-full max-w-md">
                <Caption>single choice, letter shortcuts</Caption>
                <Panel>
                    <Questionnaire
                        shortcuts="letters"
                        items={[{ name: 'action', choices: [{ value: 'rerun' }, { value: 'pause' }, { value: 'nothing' }] }]}
                    >
                        <QuestionnaireItem name="action">
                            <QuestionnaireTitle>What should happen to import-orders?</QuestionnaireTitle>
                            <QuestionnaireChoices>
                                <QuestionnaireChoice value="rerun" defaultChecked>
                                    Rerun it now
                                </QuestionnaireChoice>
                                <QuestionnaireChoice value="pause">Pause its schedule</QuestionnaireChoice>
                                <QuestionnaireChoice value="nothing">Leave it</QuestionnaireChoice>
                            </QuestionnaireChoices>
                        </QuestionnaireItem>
                        <QuestionnaireActions>
                            <QuestionnaireSubmit />
                        </QuestionnaireActions>
                    </Questionnaire>
                </Panel>
            </Stack>
            <Stack gap="sm" className="w-full max-w-md">
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
                                    <QuestionnaireChoiceDescription>The job's owners</QuestionnaireChoiceDescription>
                                </QuestionnaireChoice>
                                <QuestionnaireChoice value="slack" defaultChecked>
                                    Slack
                                    <QuestionnaireChoiceDescription>#orders</QuestionnaireChoiceDescription>
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
            </Stack>
            <Stack gap="sm" className="w-full max-w-md">
                <Caption>typed answer</Caption>
                <Panel>
                    <Questionnaire items={[{ name: 'file' }]}>
                        <QuestionnaireItem name="file">
                            <QuestionnaireTitle>Which file should fetch read?</QuestionnaireTitle>
                            <QuestionnaireInput defaultValue="orders-2026-10.csv" />
                        </QuestionnaireItem>
                        <QuestionnaireActions>
                            <QuestionnaireSubmit />
                        </QuestionnaireActions>
                    </Questionnaire>
                </Panel>
            </Stack>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="start" wrap>
            <Stack gap="sm" className="w-full max-w-md">
                <Caption>invalid, a required answer missing</Caption>
                <Panel>
                    <Questionnaire items={[{ name: 'code', required: true }]}>
                        <QuestionnaireItem name="code" required invalid>
                            <QuestionnaireTitle>Name the new schedule</QuestionnaireTitle>
                            <QuestionnaireInput placeholder="every-hour" aria-invalid />
                            <QuestionnaireError>Give the schedule a code.</QuestionnaireError>
                        </QuestionnaireItem>
                        <QuestionnaireActions>
                            <QuestionnaireSubmit />
                        </QuestionnaireActions>
                    </Questionnaire>
                </Panel>
            </Stack>
            <Stack gap="sm" className="w-full max-w-md">
                <Caption>a disabled choice</Caption>
                <Panel>
                    <Questionnaire
                        items={[{ name: 'target', choices: [{ value: 'harbor-staging' }, { value: 'harbor-exports', disabled: true }] }]}
                    >
                        <QuestionnaireItem name="target">
                            <QuestionnaireTitle>Where should upload write?</QuestionnaireTitle>
                            <QuestionnaireChoices>
                                <QuestionnaireChoice value="harbor-staging" defaultChecked>
                                    harbor-staging
                                </QuestionnaireChoice>
                                <QuestionnaireChoice value="harbor-exports" disabled>
                                    harbor-exports
                                    <QuestionnaireChoiceDescription>You cannot write to this bucket</QuestionnaireChoiceDescription>
                                </QuestionnaireChoice>
                            </QuestionnaireChoices>
                        </QuestionnaireItem>
                        <QuestionnaireActions>
                            <QuestionnaireSubmit />
                        </QuestionnaireActions>
                    </Questionnaire>
                </Panel>
            </Stack>
            <Stack gap="sm" className="w-full max-w-md">
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
            </Stack>
        </Row>
    ),
}

const STEPS = [
    { name: 'action', choices: [{ value: 'rerun' }, { value: 'pause' }, { value: 'edit' }] },
    { name: 'source', choices: [{ value: 'api' }, { value: 'upload' }] },
    { name: 'note' },
]

export const FollowUp: StoryObj = {
    render: () => (
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
                                <QuestionnaireTitle>What should happen to import-orders?</QuestionnaireTitle>
                                <QuestionnaireChoices>
                                    <QuestionnaireChoice value="rerun">Rerun it now</QuestionnaireChoice>
                                    <QuestionnaireChoice value="pause">Pause its schedule</QuestionnaireChoice>
                                    <QuestionnaireChoice value="edit" defaultChecked>
                                        Change the validate step
                                    </QuestionnaireChoice>
                                </QuestionnaireChoices>
                            </QuestionnaireItem>
                            <QuestionnaireItem name="source">
                                <QuestionnaireTitle>Which rows should validate check?</QuestionnaireTitle>
                                <QuestionnaireDescription>
                                    The api had no orders for 2026-10 at 14:02; your uploaded CSV has 2,184.
                                </QuestionnaireDescription>
                                <QuestionnaireChoices>
                                    <QuestionnaireChoice value="api">
                                        The orders from the api
                                        <QuestionnaireChoiceDescription>As it is configured now</QuestionnaireChoiceDescription>
                                    </QuestionnaireChoice>
                                    <QuestionnaireChoice value="upload" defaultChecked>
                                        The uploaded orders-2026-10.csv
                                        <QuestionnaireChoiceDescription>Checked against the orders rules</QuestionnaireChoiceDescription>
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
    ),
}
