import type { Meta, StoryObj } from '@storybook/react-vite'

import { AssistantReply } from '@winterop-com/sokkel-ui/AssistantReply'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { UsageLine } from '@winterop-com/sokkel-ui/UsageLine'
import { Specimen } from '../fixtures/Specimen'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * What a model's answer cost and how fast it came, in one quiet line under it: the tokens in and
 * out, the time to the first token, the rate and how long it took.
 */
const meta: Meta = { title: 'Patterns/Usage line', parameters: { frame: 'padded' } }
export default meta

/** A finished answer: every figure, a quick one in milliseconds and a slow one in seconds. */
export const Finished: StoryObj = {
    render: () => (
        <Stack gap="lg">
            <Specimen label="quick">
                <UsageLine input={184} output={86} firstToken={130} rate={77.4} latency={1120} />
            </Specimen>
            <Specimen label="slow">
                <UsageLine input={2_412} output={1_204} firstToken={1_840} rate={64.2} latency={18_400} />
            </Specimen>
            <Specimen label="fast, a whole rate">
                <UsageLine input={96} output={412} firstToken={42} rate={212.6} latency={2_010} />
            </Specimen>
        </Stack>
    ),
}

/** While the answer streams the count says so far, and the figures fill in as they are known. */
export const Streaming: StoryObj = {
    render: () => (
        <Stack gap="lg">
            <Specimen label="before the first token">
                <UsageLine input={184} output={0} live />
            </Specimen>
            <Specimen label="streaming">
                <UsageLine input={184} output={31} firstToken={240} rate={48.1} latency={880} live />
            </Specimen>
            <Specimen label="ended at the limit">
                <UsageLine input={184} output={256} firstToken={240} rate={51.3} latency={5_230} note="max tokens" />
            </Specimen>
        </Stack>
    ),
}

const ANSWER = `\`nightly-export\` stopped at the \`validate\` step: **37 of 2,184 rows** had an \`amount\` that was not a number, mostly decimal commas like \`12,50\`.`

/** Under an assistant's reply, as a chat shows it. */
export const UnderAReply: StoryObj = {
    name: 'Under a reply',
    render: () => (
        <TooltipProvider>
            <Stack className="max-w-3xl">
                <AssistantReply mark={<TidevannMark />} name="tide-7b-instruct" time="09:42" content={ANSWER} onRetry={() => undefined}>
                    <UsageLine input={184} output={86} firstToken={130} rate={77.4} latency={1_120} />
                </AssistantReply>
            </Stack>
        </TooltipProvider>
    ),
}
