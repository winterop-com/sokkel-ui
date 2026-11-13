import type { StreamParser } from '@codemirror/language'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'

import { CodeEditor, languageForMediaType, type CodeCompletionSource, type CodeLanguage } from '@winterop-com/sokkel-ui/CodeEditor'
import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { registerPlugins } from '@winterop-com/sokkel-ui/lib/plugins'
import { DHIS2_FUNCTIONS } from '@winterop-com/sokkel-ui-dhis2/names'
import { dhis2, dhis2Plugin } from '@winterop-com/sokkel-ui-dhis2/plugin'
import { dhis2RuleParser } from '@winterop-com/sokkel-ui-dhis2/rule'

registerPlugins([dhis2])

const INDICATOR = `/* Items shipped on time, as a share of all items shipped,
   counted across every category option combination */
(
  #{FH8ab5Rog83.*}
  + #{FH8ab5Rog83.*}.periodOffset(-1)
) / firstNonNull(#{QOlfIKgNJ3D}, 1) * 100

/* Held back where the data set reports too rarely */
* if(R{BfMAe6Itzgt.REPORTING_RATE} < C{bCqvfPR02Im}, 0, 1)

/* Only for sites in the harbor group, and per day */
* orgUnit.group(CXw2yu5fodb) / [days]
`

const PREDICTOR = `/* The expected upper bound: the mean of the samples plus twice their spread */
avg(#{r6nrJANOqMw.yAa4VqG3xfD})
  + 2 * stddevPop(#{r6nrJANOqMw.yAa4VqG3xfD})
  - #{r6nrJANOqMw}.aggregationType(LAST).minDate(2026-1-1)
`

const RULE = `/* Ask for a new reading when the last one is a week old,
   or when an active enrollment has no contact on file */
d2:hasValue('last reading')
  && d2:daysBetween(#{last reading}, V{current_date}) > 7
  || V{enrollment_status} == 'ACTIVE'
  && !d2:hasValue(A{contact})
  && !d2:validatePattern(A{reference}, '[A-Z]{3}-[0-9]+')
  && d2:yearsBetween(A{iESIqZ0R0R0}, V{event_date}) >= 18
`

/** A server that knows fewer names than the latest: `d2:inUserGroup` and `V{analytics_period_end}` are left out. */
const OLDER = dhis2RuleParser({
    functions: ['d2:hasValue', 'd2:daysBetween', 'd2:concatenate'],
    variables: ['current_date', 'event_date'],
}) as StreamParser<unknown> & { name: string }

const OLDER_RULE = `/* Names this server knows are colored as functions and variables;
   the others read as plain names, never as errors */
d2:hasValue(#{reading})
  && d2:daysBetween(V{event_date}, V{current_date}) > 7
  && d2:inUserGroup('pQrS7tUvWx1')
  && V{analytics_period_end} > V{event_date}
`

/** An expression in a pane that fills the canvas, its media type beside its title. */
function Expression({
    title,
    mediaType,
    language,
    initial,
    completions,
    hover,
}: {
    title: string
    mediaType: string
    language: CodeLanguage
    initial: string
    completions?: CodeCompletionSource
    hover?: (word: string) => string | undefined
}) {
    const [value, setValue] = useState(initial)
    return (
        <Stack gap="none" className="h-full min-h-0">
            <PaneHeader title={title} meta={mediaType} />
            <Fill>
                <CodeEditor
                    label={title}
                    language={language}
                    variant="pane"
                    size="sm"
                    value={value}
                    onChange={setValue}
                    completions={completions}
                    hover={hover}
                />
            </Fill>
        </Stack>
    )
}

/** The data elements the indicator reads, by uid, as an app's metadata names them. */
const ELEMENTS: Record<string, string> = { FH8ab5Rog83: 'Items shipped on time', QOlfIKgNJ3D: 'Items shipped' }

/** Inside `#{` the data elements by name, putting in their uid; elsewhere the functions. */
const offerItems: CodeCompletionSource = (_word, { before }) =>
    /#\{[^}]*$/.test(before)
        ? Object.entries(ELEMENTS).map(([id, name]) => ({ label: name, detail: id, kind: 'variable' as const, apply: id }))
        : ['firstNonNull', 'if', 'isNull'].map((name) => ({ label: name, kind: 'function' as const, apply: `${name}(` }))

const meta: Meta = { title: 'Editors/DHIS2 expressions' }
export default meta

/**
 * An indicator from the `dhis2` plugin, picked by its media type: data elements with a wildcard
 * disaggregation, a reporting rate, a constant, `[days]`, functions, one written after a value
 * (`.periodOffset`) and a dotted one (`orgUnit.group`), and comments across lines. Typed inside
 * `#{`, a name offers the data elements by name and puts in the uid, since the editor's
 * `completions` hear what comes before the word; a uid names its data element on hover.
 */
export const Indicator: StoryObj = {
    render: () => (
        <Expression
            title="Numerator"
            mediaType="text/x-dhis2-expression"
            language={languageForMediaType('text/x-dhis2-expression')}
            initial={INDICATOR}
            completions={offerItems}
            hover={(word) => ELEMENTS[word]}
        />
    ),
}

/**
 * A predictor's generator in the same language: aggregation functions over the sampled periods, an
 * aggregation type written in capitals and a date.
 */
export const Predictor: StoryObj = {
    render: () => <Expression title="Generator" mediaType="text/x-dhis2-expression" language="dhis2-expression" initial={PREDICTOR} />,
}

/**
 * A program rule's condition from the `dhis2` plugin, by its name: program rule variables whose
 * names hold spaces, attributes, `V{}` program variables and `d2:` functions.
 */
export const ProgramRule: StoryObj = {
    name: 'Program rule',
    render: () => <Expression title="Condition" mediaType="text/x-dhis2-rule" language="dhis2-rule" initial={RULE} />,
}

/**
 * The program language knowing only the names an older server has, as an app's data layer passes
 * them: the function and the variable it was not given read as plain names.
 */
export const OlderServer: StoryObj = {
    name: 'Older server',
    render: () => <Expression title="Condition" mediaType="text/x-dhis2-rule" language={OLDER} initial={OLDER_RULE} />,
}

/** The functions each server in the story knows: the older one lacks three the latest has. */
const SERVERS = {
    older: DHIS2_FUNCTIONS.filter((name) => !['d2:validatePattern', 'd2:yearsBetween', 'd2:inUserGroup'].includes(name)),
    latest: DHIS2_FUNCTIONS,
} as const

/** A condition with the server to read it for picked above it; the plugin installed at the top of the module comes back once the story is left. */
function ServerSwitch() {
    const [server, setServer] = useState<keyof typeof SERVERS>('older')
    const [value, setValue] = useState(RULE)
    useEffect(() => {
        registerPlugins([dhis2Plugin({ functions: SERVERS[server] })])
    }, [server])
    useEffect(() => () => registerPlugins([dhis2]), [])
    return (
        <Stack gap="none" className="h-full min-h-0">
            <PaneHeader
                title="Condition"
                meta="text/x-dhis2-rule"
                actions={
                    <Segmented
                        label="Server"
                        size="sm"
                        value={server}
                        onValueChange={setServer}
                        options={[
                            { value: 'older', label: 'Older server' },
                            { value: 'latest', label: 'Latest server' },
                        ]}
                    />
                }
            />
            <Fill>
                <CodeEditor label="Condition" language="dhis2-rule" variant="pane" size="sm" value={value} onChange={setValue} />
            </Fill>
        </Stack>
    )
}

/**
 * The plugin installed again with another server's names, as an app does when the server it talks
 * to changes: the editor showing `dhis2-rule` takes the new names at once. On the older server,
 * `d2:validatePattern`, `d2:yearsBetween` and `d2:inUserGroup` read as plain names.
 */
export const ServerVersions: StoryObj = {
    name: 'Server versions',
    render: () => <ServerSwitch />,
}
