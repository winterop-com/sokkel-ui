import type { Meta, StoryObj } from '@storybook/react-vite'

import { AnsiText } from '@winterop-com/sokkel-ui/AnsiText'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * Output written with ANSI color escapes, as a program prints it to a terminal, drawn as spans in
 * the theme's inks: the sixteen colors in the kind and status inks, the 256-color palette and
 * 24-bit color as they are, with bold, dim, italic, underline and strike-through.
 */
const meta: Meta = { title: 'Patterns/ANSI text', parameters: { frame: 'padded' } }
export default meta

const E = '\u001b['

const RUN = [
    `${E}1mtidevann run nightly-export${E}0m ${E}2m(project harbor, worker 3)${E}0m`,
    `${E}32m✓${E}0m fetch      ${E}2m1.2s${E}0m   4,812 rows from ${E}4mapi.example.org${E}24m`,
    `${E}32m✓${E}0m transform  ${E}2m0.8s${E}0m   4,790 rows, 22 dropped`,
    `${E}33m!${E}0m validate   ${E}2m0.3s${E}0m   ${E}33m3 warnings${E}0m: missing ${E}3mcountry${E}23m on rows 17, 204, 381`,
    `${E}31m✗${E}0m upload     ${E}2m4.1s${E}0m   ${E}1;31mconnection reset${E}0m by ${E}36mstorage.example.org${E}0m`,
    `${E}90m-${E}0m notify     ${E}9mskipped${E}29m after a failure`,
    '',
    `${E}1;31mfailed${E}0m in 6.4s · retry with ${E}1mtidevann runs retry 4812 --from upload${E}0m`,
].join('\n')

const NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']

const SIXTEEN = [
    NAMES.map((name, index) => `${E}${String(30 + index)}m${name.padEnd(8)}${E}0m`).join(' '),
    NAMES.map((name, index) => `${E}${String(90 + index)}m${name.padEnd(8)}${E}0m`).join(' '),
    NAMES.map((name, index) => `${E}${String(40 + index)}m ${name.padEnd(7)}${E}0m`).join(' '),
].join('\n')

const CUBE = Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 36 }, (_, column) => `${E}48;5;${String(16 + row * 36 + column)}m ${E}0m`).join(''),
).join('\n')

const RAMP = Array.from({ length: 48 }, (_, step) => {
    const red = Math.round(40 + (step / 47) * 200)
    return `${E}38;2;${String(red)};120;${String(240 - red)}m█${E}0m`
}).join('')

/** A line of output inside a sentence, taking the text around it. */
export const Inline: StoryObj = {
    name: 'Inline',
    render: () => (
        <p className="max-w-2xl text-body">
            The last line was <AnsiText text={`${E}1;31mfailed${E}0m in 6.4s at ${E}36mupload${E}0m`} />, so the notify step was skipped.
        </p>
    ),
}

/** A run's output as the program printed it: states, timings dimmed, a warning and a failure. */
export const Output: StoryObj = {
    name: 'Output',
    render: () => <AnsiText block text={RUN} />,
}

/** The sixteen colors as text and ground, the 256-color cube as ground, and a 24-bit ramp. */
export const Palette: StoryObj = {
    name: 'Palette',
    render: () => (
        <Stack gap="lg">
            <AnsiText block text={SIXTEEN} />
            <AnsiText block text={CUBE} />
            <AnsiText block text={RAMP} />
        </Stack>
    ),
}
