import { Banner } from '@winterop-com/sokkel-ui/Banner'
import { CodeEditor, type CodeMark } from '@winterop-com/sokkel-ui/CodeEditor'
import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { SelectField } from '@winterop-com/sokkel-ui/SelectField'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { BookOpen, Play } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { describeWord, elementNames, evaluate, FUNCTIONS, VARIABLES, type Evaluation } from '../data/evaluate'
import type { Resource } from '../data/model'
import { resources, type Stored } from '../data/server'
import { Pane } from '../pane'
import { count, titleOf, useFoot, usePrefs } from '../ui'

/** The subject that stands for the whole server: every resource in one collection Bundle. */
const SERVER_BUNDLE = 'bundle'

/** Expressions to start from, each with the subject it is written for. */
const EXAMPLES = [
    {
        label: 'Official name',
        subject: 'Patient/pat-001',
        expression: "// The official name, given names first\nname.where(use = 'official')\n  .select(given.join(' ') + ' ' + family)",
    },
    { label: 'Older than 65', subject: 'Patient/pat-006', expression: '// Born more than 65 years ago\nbirthDate < today() - 65 years' },
    {
        label: 'High blood pressure',
        subject: SERVER_BUNDLE,
        expression:
            "// Who had a systolic pressure of 140 or more\nentry.resource.ofType(Observation)\n  .where(code.coding.exists(system = %loinc and code = '8480-6'))\n  .where(value.ofType(Quantity).value >= 140)\n  .subject.display\n  .distinct()",
    },
    {
        label: 'Active conditions',
        subject: SERVER_BUNDLE,
        expression: "entry.resource.ofType(Condition)\n  .where(clinicalStatus.coding.code = 'active')\n  .code.text\n  .distinct()",
    },
    {
        label: 'Mean heart rate',
        subject: SERVER_BUNDLE,
        expression:
            "/* The mean of every heart rate measured,\n   rounded to one decimal */\nentry.resource.ofType(Observation)\n  .where(code.coding.code = '8867-4')\n  .value.ofType(Quantity).value\n  .avg()\n  .round(1)",
    },
    {
        label: 'Patients by city',
        subject: SERVER_BUNDLE,
        expression: "entry.resource.ofType(Patient)\n  .where(address.city = 'Tromsø')\n  .name.family",
    },
]

const SUBJECT_TYPES = new Set(['Patient', 'Practitioner', 'Organization', 'Condition', 'Library'])

/** The column of an error's line and column as a mark on the expression, else its first line. */
function errorMark(result: Evaluation): CodeMark[] {
    if (result.state !== 'failed') return []
    if (result.line === undefined || result.column === undefined) return [{ line: 1, tone: 'error', message: result.message }]
    return [{ line: result.line, from: result.column + 1, to: result.column + 2, tone: 'error', message: result.message }]
}

/**
 * A FHIRPath playground: an expression written with the `fhir` plugin's FHIRPath language,
 * evaluated live by the FHIRPath engine against a resource on the server or the whole server as a
 * Bundle, with the result beside it and an error marked where the expression stops reading.
 */
export function FhirPathPage({ subjectKey }: { subjectKey?: string }) {
    const { rows } = useCollection(resources)
    const [prefs] = usePrefs()
    const [expression, setExpression] = useStored('fhirpath-expression', EXAMPLES[0]?.expression ?? '')
    const [chosen, setChosen] = useStored('fhirpath-subject', 'Patient/pat-001')
    const subjectId = subjectKey ?? chosen
    const [ran, setRan] = useState<{ expression: string; subject: string } | undefined>(undefined)
    const all = rows ?? []

    const subject = useMemo<Resource | undefined>(() => {
        if (rows === undefined) return undefined
        if (subjectId === SERVER_BUNDLE)
            return {
                resourceType: 'Bundle',
                id: 'server',
                type: 'collection',
                total: rows.length,
                entry: rows.map((row) => ({ resource: row.resource })),
            }
        return rows.find((row) => row.id === subjectId)?.resource
    }, [rows, subjectId])

    const shown = prefs.live ? expression : ran?.subject === subjectId ? ran.expression : ''
    const result = useMemo(() => evaluate(shown, subject), [shown, subject])
    const words = useMemo(
        () => [
            ...FUNCTIONS,
            ...VARIABLES,
            ...elementNames(subject?.resourceType === 'Bundle' ? all.slice(0, 80).map((row) => row.resource) : subject),
        ],
        [subject, all],
    )
    const run = () => setRan({ expression, subject: subjectId })
    useFoot(
        result.state === 'done'
            ? `${count(result.value.length, 'item')} in ${result.ms.toFixed(1)} ms`
            : result.state === 'failed'
              ? 'The expression does not evaluate'
              : 'Nothing evaluated yet',
        undefined,
        [result],
    )

    const choose = (key: string) => {
        if (subjectKey !== undefined) go('/fhirpath')
        setChosen(key)
    }

    const options = [
        { value: SERVER_BUNDLE, label: `The whole server, as a Bundle of ${count(all.length, 'resource')}` },
        ...all
            .filter((row: Stored) => SUBJECT_TYPES.has(row.type) || row.id === subjectId)
            .map((row) => ({ value: row.id, label: `${row.type}: ${titleOf(row.resource)}` })),
    ]

    return (
        <Page className="h-full">
            <PageHeader
                title="FHIRPath"
                description="Write an expression and read what it selects, evaluated against a resource on the server or the whole server as one Bundle."
                actions={
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
                                <BookOpen aria-hidden />
                                Examples
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {EXAMPLES.map((example) => (
                                    <DropdownMenuItem
                                        key={example.label}
                                        onClick={() => {
                                            setExpression(example.expression)
                                            choose(example.subject)
                                            setRan({ expression: example.expression, subject: example.subject })
                                        }}
                                    >
                                        {example.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {!prefs.live && (
                            <Button size="sm" onClick={run}>
                                <Play aria-hidden />
                                Evaluate
                            </Button>
                        )}
                    </>
                }
            />
            <SelectField id="fhirpath-subject" label="Evaluate against" options={options} value={subjectId} onChange={choose} />
            <SplitPane
                id="fhirpath-split"
                className="min-h-0 flex-1"
                direction="across"
                defaultShare={0.55}
                minShare={0.3}
                maxShare={0.75}
                first={
                    <SplitPane
                        id="fhirpath-expression"
                        direction="down"
                        defaultShare={0.5}
                        minShare={0.2}
                        maxShare={0.8}
                        first={
                            <Pane title="Expression" meta={prefs.live ? 'Evaluated as typed' : 'Mod-Enter evaluates'}>
                                <CodeEditor
                                    label="FHIRPath expression"
                                    language="fhirpath"
                                    variant="pane"
                                    value={expression}
                                    onChange={setExpression}
                                    completions={words}
                                    hover={describeWord}
                                    marks={errorMark(result)}
                                    onRun={run}
                                    lineNumbers={prefs.lineNumbers}
                                    wrap={prefs.wrap}
                                    size={prefs.size}
                                    bracketColors
                                />
                            </Pane>
                        }
                        second={
                            <Pane
                                title="Result"
                                meta={
                                    result.state === 'done'
                                        ? `${count(result.value.length, 'item')} in ${result.ms.toFixed(1)} ms`
                                        : result.state === 'failed'
                                          ? 'Refused'
                                          : undefined
                                }
                            >
                                {result.state === 'failed' ? (
                                    <Banner tone="critical">
                                        {result.line === undefined
                                            ? result.message
                                            : `Line ${String(result.line)}, column ${String((result.column ?? 0) + 1)}: ${result.message}`}
                                    </Banner>
                                ) : (
                                    <CodeEditor
                                        label="Result"
                                        language="json"
                                        variant="pane"
                                        readOnly
                                        value={result.state === 'done' ? JSON.stringify(result.value, null, 2) : ''}
                                        placeholder={
                                            prefs.live ? 'Write an expression to see what it selects.' : 'Press Evaluate or Mod-Enter.'
                                        }
                                        lineNumbers={prefs.lineNumbers}
                                        size={prefs.size}
                                        folding
                                    />
                                )}
                            </Pane>
                        }
                    />
                }
                second={
                    <Pane title={subjectId === SERVER_BUNDLE ? 'Bundle' : subjectId} meta={subject?.resourceType}>
                        <CodeEditor
                            label="Subject"
                            language="json"
                            variant="pane"
                            readOnly
                            value={subject === undefined ? '' : JSON.stringify(subject, null, 2)}
                            lineNumbers={prefs.lineNumbers}
                            size={prefs.size}
                            folding
                            search
                        />
                    </Pane>
                }
            />
        </Page>
    )
}
