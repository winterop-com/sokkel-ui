import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CodeEditor, languageForMediaType, type CodeLanguage } from '@winterop-com/sokkel-ui/CodeEditor'
import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { registerPlugins } from '@winterop-com/sokkel-ui/lib/plugins'
import { fhir } from '@winterop-com/sokkel-ui-fhir/plugin'

registerPlugins([fhir])

const FHIRPATH = `// The latest body weight in kilograms, measured this year
Observation
  .where(status in ('final' | 'amended'))
  .where(code.coding.exists(system = %loinc and code = '29463-7'))
  .where(effective.ofType(dateTime) >= @2026-01-01T00:00:00Z)
  /* the unit is checked,
     never converted */
  .where(value.ofType(Quantity).code = 'kg')
  .select(value.ofType(Quantity).value)
  .last()
`

const CQL = `library BodyWeight version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

codesystem "LOINC": 'http://loinc.org'
code "Body weight": '29463-7' from "LOINC" display 'Body weight'

parameter "Measurement Period" Interval<DateTime>
  default Interval[@2026-01-01T00:00:00.0, @2027-01-01T00:00:00.0)

context Patient

/*
 * The weights taken in the period, latest first.
 */
define "Weights in Period":
  [Observation: "Body weight"] O
    where O.status in { 'final', 'amended' }
      and O.effective during "Measurement Period"
    sort by effective descending

define "Latest Weight":
  First("Weights in Period").value as Quantity

// Adult on the first day of the period.
define "Is Adult":
  AgeInYearsAt(start of "Measurement Period") >= 18

define "Heavy Adult":
  "Is Adult" and "Latest Weight" > 100 'kg'
`

/** A program in a pane that fills the canvas, its media type beside its title. */
function Program({ title, mediaType, language, initial }: { title: string; mediaType: string; language: CodeLanguage; initial: string }) {
    const [value, setValue] = useState(initial)
    return (
        <Stack gap="none" className="h-full min-h-0">
            <PaneHeader title={title} meta={mediaType} />
            <Fill>
                <CodeEditor label={title} language={language} variant="pane" size="sm" value={value} onChange={setValue} />
            </Fill>
        </Stack>
    )
}

const meta: Meta = { title: 'Editors/Health data' }
export default meta

/**
 * A FHIRPath expression from the `fhir` plugin, picked by its media type: paths and their members,
 * functions, `%` variables, strings, a date-time literal and comments, one of them across lines.
 */
export const FhirPath: StoryObj = {
    name: 'FHIRPath',
    render: () => (
        <Program title="Expression" mediaType="text/fhirpath" language={languageForMediaType('text/fhirpath')} initial={FHIRPATH} />
    ),
}

/**
 * A CQL library from the `fhir` plugin, by its name: its declarations, quoted names, a retrieve,
 * date-time literals in an interval, functions, members after a dot and comments.
 */
export const Cql: StoryObj = {
    name: 'CQL',
    render: () => <Program title="Library" mediaType="text/cql" language="cql" initial={CQL} />,
}
