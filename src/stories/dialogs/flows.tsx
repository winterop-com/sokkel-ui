import { CopyButton } from '@winterop-com/sokkel-ui/CopyButton'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { PersonRow } from '@winterop-com/sokkel-ui/PersonRow'
import { CheckboxField, CheckboxList } from '@winterop-com/sokkel-ui/CheckboxField'
import {
    Attachment,
    AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle,
} from '@winterop-com/sokkel-ui/primitives/attachment'
import { Check, CircleAlert, CircleCheck, Download, FileSpreadsheet, Globe, Link2, Lock, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { AddressInput, type Address } from '@winterop-com/sokkel-ui/AddressInput'
import { CronField } from '@winterop-com/sokkel-ui/CronField'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { IssueCount, IssueMark, type Issue } from '@winterop-com/sokkel-ui/IssueMark'
import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { StepIndicator, WizardDialog } from '@winterop-com/sokkel-ui/StepIndicator'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { NativeSelect, NativeSelectOption } from '@winterop-com/sokkel-ui/primitives/native-select'
import { Progress, ProgressLabel, ProgressValue } from '@winterop-com/sokkel-ui/primitives/progress'
import { DropZone } from '@winterop-com/sokkel-ui/UploadTray'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { describeCron } from '@winterop-com/sokkel-ui/lib/cron'
import { Behind } from './parts'
import { Item, ItemContent, ItemDescription, ItemMedia } from '@winterop-com/sokkel-ui/primitives/item'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { pictureOf } from '../fixtures/portraits'

/** Counts from 0 to 1 while `running`, then calls `onDone`; a stand-in for a server's progress. */
function useProgress(running: boolean, ms: number, onDone: () => void) {
    const [progress, setProgress] = useState(0)
    const done = useRef(onDone)
    done.current = onDone
    useEffect(() => {
        if (!running) return
        setProgress(0)
        const started = performance.now()
        const timer = setInterval(() => {
            const at = Math.min(1, (performance.now() - started) / ms)
            setProgress(at)
            if (at >= 1) {
                clearInterval(timer)
                done.current()
            }
        }, 100)
        return () => clearInterval(timer)
    }, [running, ms])
    return progress
}

const WIZARD_STEPS = [
    { id: 'basics', label: 'Basics' },
    { id: 'source', label: 'Source' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'notify', label: 'Notify' },
    { id: 'review', label: 'Review' },
]

const SOURCES = [
    { value: 'http', label: 'Fetch over HTTP', detail: 'Calls a URL and reads its JSON or CSV answer.' },
    { value: 'file', label: 'A file in storage', detail: 'Reads the newest file in a folder of the project.' },
    { value: 'sql', label: 'A database query', detail: 'Runs a query on a connection the project holds.' },
] as const

/** A new job in five steps, ending on a review of everything chosen; a done step can be pressed to go back to it. */
export function NewJobWizard() {
    const [open, setOpen] = useState(true)
    const [step, setStep] = useState(1)
    const [code, setCode] = useState('sync-inventory')
    const [name, setName] = useState('Sync inventory')
    const [source, setSource] = useState<(typeof SOURCES)[number]['value']>('http')
    const [url, setUrl] = useState('https://api.example.org/stock')
    const [cron, setCron] = useState('0 */4 * * *')
    const [cronOpen, setCronOpen] = useState(false)
    const [onFail, setOnFail] = useState(true)
    const [onSucceed, setOnSucceed] = useState(false)
    const [busy, setBusy] = useState(false)
    const codeIssues: Issue[] =
        code !== '' && !/^[a-z][a-z0-9-]*$/.test(code) ? [{ tone: 'critical', text: 'Lowercase letters, digits and dashes' }] : []
    const urlIssues: Issue[] =
        source === 'http' && url !== '' && !/^https:\/\/\S+$/.test(url)
            ? [{ tone: 'critical', text: 'Enter a full address', detail: 'Starting with https://.' }]
            : []
    const [issueOpen, setIssueOpen] = useState(false)
    const cronValid = describeCron(cron) !== null
    const why = [
        code === '' ? 'Give the job a code.' : codeIssues.length > 0 ? 'Fix the code first.' : undefined,
        source === 'http' && (url === '' || urlIssues.length > 0) ? 'Enter the address to fetch.' : undefined,
        cronValid ? undefined : 'Fix the schedule first.',
        undefined,
        undefined,
    ][step]
    const stepIssues = [codeIssues.length, urlIssues.length, cronValid ? 0 : 1, 0, 0][step]
    return (
        <Behind
            action="New job"
            onAction={() => {
                setStep(0)
                setOpen(true)
            }}
        >
            <WizardDialog
                open={open}
                onOpenChange={setOpen}
                title="New job in harbor"
                steps={WIZARD_STEPS}
                current={step}
                onCurrentChange={(next) => {
                    setIssueOpen(false)
                    setStep(next)
                }}
                why={why}
                count={
                    <IssueCount
                        critical={stepIssues}
                        list={
                            [
                                codeIssues.map((issue) => ({ label: 'Code', issue, onGo: () => setIssueOpen(true) })),
                                urlIssues.map((issue) => ({ label: 'Address', issue, onGo: () => setIssueOpen(true) })),
                                cronValid
                                    ? []
                                    : [
                                          {
                                              label: 'Schedule',
                                              issue: { tone: 'critical' as const, text: 'Not a schedule this field can read' },
                                              onGo: () => setCronOpen(true),
                                          },
                                      ],
                                [],
                                [],
                            ][step]
                        }
                    />
                }
                finish={{
                    label: 'Create job',
                    busy,
                    busyLabel: 'Creating',
                    onFinish: () => {
                        setBusy(true)
                        setTimeout(() => {
                            setBusy(false)
                            setOpen(false)
                        }, 1200)
                    },
                }}
            >
                {step === 0 && (
                    <>
                        <TextField
                            id="wizard-code"
                            label="Code"
                            required
                            mono
                            value={code}
                            onChange={setCode}
                            issues={codeIssues}
                            issueOpen={issueOpen}
                            onIssueOpenChange={setIssueOpen}
                        />
                        <TextField id="wizard-name" label="Name" value={name} onChange={setName} />
                    </>
                )}
                {step === 1 && (
                    <>
                        <fieldset>
                            <legend className="mb-1.5 text-sm font-medium">Where the rows come from</legend>
                            <Row gap="sm" align="stretch" stackBelow="sm">
                                {SOURCES.map((one) => (
                                    <button
                                        key={one.value}
                                        type="button"
                                        aria-pressed={source === one.value}
                                        onClick={() => setSource(one.value)}
                                        className="min-w-0 flex-1 rounded-control border border-border p-3 text-left outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:border-primary/60 aria-pressed:bg-primary/6"
                                    >
                                        <Stack as="span" gap="2xs" className="h-full">
                                            <Row as="span" justify="between" className="text-sm font-medium">
                                                {one.label}
                                                {source === one.value && <Check className="size-4 text-primary-ink" aria-hidden />}
                                            </Row>
                                            <span className="text-xs text-muted-foreground">{one.detail}</span>
                                        </Stack>
                                    </button>
                                ))}
                            </Row>
                        </fieldset>
                        {source === 'http' ? (
                            <TextField
                                id="wizard-url"
                                label="Address"
                                required
                                mono
                                value={url}
                                onChange={setUrl}
                                issues={urlIssues}
                                issueOpen={issueOpen}
                                onIssueOpenChange={setIssueOpen}
                            />
                        ) : (
                            <Field id="wizard-where" label={source === 'file' ? 'Folder' : 'Connection'} required>
                                <NativeSelect id="wizard-where" className="w-full">
                                    {(source === 'file' ? ['harbor/inbox', 'harbor/exports'] : ['warehouse', 'orders-replica']).map(
                                        (one) => (
                                            <NativeSelectOption key={one}>{one}</NativeSelectOption>
                                        ),
                                    )}
                                </NativeSelect>
                            </Field>
                        )}
                    </>
                )}
                {step === 2 && (
                    <CronField
                        id="wizard-cron"
                        value={cron}
                        onChange={setCron}
                        from={new Date('2026-11-05T10:17:00Z')}
                        count={3}
                        issueOpen={cronOpen}
                        onIssueOpenChange={setCronOpen}
                    />
                )}
                {step === 3 && (
                    <>
                        <SwitchField
                            id="wizard-fail"
                            label="When a run fails"
                            explain="Mails the owner, ada."
                            checked={onFail}
                            onCheckedChange={setOnFail}
                        />
                        <SwitchField
                            id="wizard-succeed"
                            label="When a run succeeds"
                            explain="A daily digest instead of a mail per run."
                            checked={onSucceed}
                            onCheckedChange={setOnSucceed}
                        />
                    </>
                )}
                {step === 4 && (
                    <DescriptionList
                        items={[
                            { term: 'Code', value: code, code: true },
                            { term: 'Name', value: name === '' ? '—' : name },
                            { term: 'Source', value: SOURCES.find((one) => one.value === source)?.label },
                            ...(source === 'http' ? [{ term: 'Address', value: url, code: true }] : []),
                            { term: 'Schedule', value: cron, code: true },
                            {
                                term: 'Notify',
                                value: [onFail && 'on failure', onSucceed && 'daily digest'].filter(Boolean).join(', ') || 'nobody',
                            },
                        ]}
                    />
                )}
            </WizardDialog>
        </Behind>
    )
}

const COLUMNS = [
    { column: 'order_id', field: 'code', sample: ['ORD-10231', 'ORD-10232', 'ORD-10233'] },
    { column: 'customer_email', field: 'email', sample: ['ada@example.org', 'grace@example.org', 'linus@example.org'] },
    { column: 'placed_at', field: 'placed', sample: ['2026-10-01', '2026-10-01', '2026-10-02'] },
    { column: 'total', field: 'amount', sample: ['129.00', '42.50', '310.75'] },
    { column: 'currency', field: 'currency', sample: ['EUR', 'EUR', 'NOK'] },
    { column: 'site', field: 'skip', sample: ['larkspur', 'harbor', 'larkspur'] },
]

const FIELDS = [
    { value: 'code', label: 'Order code', required: true },
    { value: 'email', label: 'Customer email', required: true },
    { value: 'placed', label: 'Placed on', required: true },
    { value: 'amount', label: 'Amount', required: true },
    { value: 'currency', label: 'Currency', required: false },
    { value: 'site', label: 'Site', required: false },
    { value: 'skip', label: 'Skip this column', required: false },
]

const FAILED = [
    { row: 18, column: 'customer_email', value: 'ada(at)example.org', why: 'Not an email address' },
    { row: 311, column: 'total', value: '12,50', why: 'Not a number; use a point for decimals' },
    { row: 977, column: 'placed_at', value: '31/10/2026', why: 'Not a date; write it as 2026-10-31' },
]

const FAILED_COLUMNS: DataColumn<(typeof FAILED)[number]>[] = [
    {
        id: 'row',
        header: 'Row',
        width: '4rem',
        align: 'end',
        cell: (row) => <span className="font-mono text-xs tabular-nums">{row.row}</span>,
    },
    { id: 'column', header: 'Column', width: '9rem', cell: (row) => <span className="font-mono text-xs">{row.column}</span> },
    {
        id: 'value',
        header: 'Value',
        width: '9rem',
        cell: (row) => <span className="font-mono text-xs text-critical-ink">{row.value}</span>,
    },
    { id: 'why', header: 'Why', width: 'minmax(0,1fr)', cell: (row) => <span className="text-muted-foreground">{row.why}</span> },
]

type ImportStage = 'file' | 'map' | 'running' | 'done'

/** An import: a dropped file, its columns mapped to fields with a preview, the run, and what failed. Opens on the mapping. */
export function ImportOrders({ stage: first = 'map' }: { stage?: ImportStage }) {
    const [open, setOpen] = useState(true)
    const [stage, setStage] = useState<ImportStage>(first)
    const [file, setFile] = useState('orders-2026-10.csv')
    const [map, setMap] = useState<Record<string, string>>(Object.fromEntries(COLUMNS.map((one) => [one.column, one.field])))
    const progress = useProgress(stage === 'running', 3000, () => setStage('done'))
    const used = Object.values(map)
    const missing = FIELDS.filter((field) => field.required && !used.includes(field.value))
    const twice = FIELDS.filter((field) => field.value !== 'skip' && used.filter((one) => one === field.value).length > 1)
    const [openAt, setOpenAt] = useState<string | null>(null)
    /** A column's issues: a field it shares with another column, and each required field no column gives, on the columns free to give it. */
    const columnIssues = (column: string): Issue[] => {
        const chosen = map[column]
        const clash = twice.find((field) => field.value === chosen)
        return [
            ...(clash === undefined
                ? []
                : [
                      {
                          tone: 'critical' as const,
                          text: `${clash.label} comes from two columns`,
                          detail: 'Each field takes one column; choose another field for one of them.',
                      },
                  ]),
            ...(chosen === 'skip' || clash !== undefined
                ? missing.map((field) => ({
                      tone: 'critical' as const,
                      text: `No column gives ${field.label.toLowerCase()}`,
                      detail: 'It is required on every order.',
                      actions: [
                          {
                              label: `Map this column to ${field.label.toLowerCase()}`,
                              onClick: () => setMap({ ...map, [column]: field.value }),
                          },
                      ],
                  }))
                : []),
        ]
    }
    const index = { file: 0, map: 1, running: 2, done: 2 }[stage]
    const close = (next: boolean) => {
        setOpen(next)
        if (!next) setStage('file')
    }
    return (
        <Behind action="Import orders" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={close}
                width="xl"
                title="Import orders into harbor"
                description={stage === 'file' ? 'A CSV file with a header row, up to 50 MB.' : <span className="font-mono">{file}</span>}
                header={
                    <StepIndicator
                        steps={[
                            { id: 'file', label: 'File' },
                            { id: 'map', label: 'Columns' },
                            { id: 'import', label: 'Import' },
                        ]}
                        current={index}
                        onStep={stage === 'map' ? () => setStage('file') : undefined}
                        className="-mx-4 border-y border-border px-4 py-2.5"
                    />
                }
                back={stage === 'map' ? () => setStage('file') : undefined}
                words={stage === 'done' ? { cancel: 'Close' } : undefined}
                count={
                    stage === 'map' ? (
                        <IssueCount
                            critical={twice.length + missing.length}
                            list={COLUMNS.flatMap((one) =>
                                columnIssues(one.column).map((issue) => ({ label: one.column, issue, onGo: () => setOpenAt(one.column) })),
                            )}
                        />
                    ) : undefined
                }
                footer={
                    stage === 'map'
                        ? '1,204 rows'
                        : stage === 'done' && (
                              <button type="button" className="underline underline-offset-3 hover:text-foreground">
                                  <Row as="span" gap="xs">
                                      <Download className="size-3.5" aria-hidden />
                                      Failed rows as CSV
                                  </Row>
                              </button>
                          )
                }
                confirm={
                    stage === 'file'
                        ? { label: 'Next', onConfirm: () => setStage('map'), why: file === '' ? 'Choose a file.' : undefined }
                        : stage === 'map'
                          ? {
                                label: 'Import 1,204 rows',
                                onConfirm: () => setStage('running'),
                                why:
                                    missing.length > 0
                                        ? `Map a column to ${missing.map((field) => field.label.toLowerCase()).join(', ')}.`
                                        : twice.length > 0
                                          ? `Two columns are mapped to ${twice[0].label.toLowerCase()}.`
                                          : undefined,
                            }
                          : stage === 'running'
                            ? { label: 'Import', busy: true, busyLabel: 'Importing', onConfirm: () => undefined }
                            : { label: 'Open orders', onConfirm: () => close(false) }
                }
            >
                {stage === 'file' && (
                    <DropZone
                        onFiles={(files) => setFile(files[0].name)}
                        words={{ title: 'Drop the file to use it', detail: 'One CSV file.' }}
                    >
                        <Stack
                            as="label"
                            gap="sm"
                            align="center"
                            justify="center"
                            className="h-56 cursor-pointer rounded-surface border-2 border-dashed border-border text-center hover:bg-hover"
                        >
                            <FileSpreadsheet className="size-8 text-muted-foreground" aria-hidden />
                            <span className="text-sm font-medium">Drop a CSV file here, or choose one</span>
                            <span className="text-xs text-muted-foreground">
                                {file === '' ? 'Nothing chosen' : <span className="font-mono">{file}</span>}
                            </span>
                            <input
                                type="file"
                                accept=".csv,text/csv"
                                className="sr-only"
                                onChange={(event) => {
                                    const chosen = event.target.files?.[0]
                                    if (chosen !== undefined) setFile(chosen.name)
                                }}
                            />
                        </Stack>
                    </DropZone>
                )}
                {stage === 'map' && (
                    <DataTable
                        variant="list"
                        columns={[
                            {
                                id: 'column',
                                header: 'Column in the file',
                                width: '10rem',
                                cell: (one) => <span className="font-mono text-xs">{one.column}</span>,
                            },
                            {
                                id: 'field',
                                header: 'Field',
                                width: '14rem',
                                cell: (one) => {
                                    const issues = columnIssues(one.column)
                                    return (
                                        <Row as="span" gap="none" align="stretch" className="relative w-fit pr-8">
                                            <NativeSelect
                                                size="sm"
                                                aria-label={`Field for ${one.column}`}
                                                aria-invalid={issues.length > 0 || undefined}
                                                className="w-44"
                                                value={map[one.column]}
                                                onChange={(event) => setMap({ ...map, [one.column]: event.target.value })}
                                            >
                                                {FIELDS.map((field) => (
                                                    <NativeSelectOption key={field.value} value={field.value}>
                                                        {field.label}
                                                    </NativeSelectOption>
                                                ))}
                                            </NativeSelect>
                                            <IssueMark
                                                issues={issues}
                                                open={openAt === one.column}
                                                onOpenChange={(next) => setOpenAt(next ? one.column : null)}
                                            />
                                        </Row>
                                    )
                                },
                            },
                            {
                                id: 'sample',
                                header: 'First rows',
                                width: 'minmax(0,1fr)',
                                cell: (one) => (
                                    <span
                                        className={cn(
                                            'font-mono text-xs',
                                            map[one.column] === 'skip' ? 'text-faint line-through' : 'text-muted-foreground',
                                        )}
                                    >
                                        {one.sample.join(', ')}
                                    </span>
                                ),
                            },
                        ]}
                        rows={COLUMNS}
                        rowKey={(one) => one.column}
                        hover={false}
                    />
                )}
                {stage === 'running' && (
                    <Stack justify="center" className="h-56">
                        <Progress value={progress * 100}>
                            <ProgressLabel className="font-normal">Importing rows</ProgressLabel>
                            <ProgressValue className="font-mono">
                                {() => `${Math.round(progress * 1204).toLocaleString('en')} of 1,204`}
                            </ProgressValue>
                        </Progress>
                        <p className="text-xs text-muted-foreground">
                            You can close this; the import carries on and the job page shows how it went.
                        </p>
                    </Stack>
                )}
                {stage === 'done' && (
                    <>
                        <Columns count={3} min="xs" gap="sm">
                            {[
                                { label: 'Imported', value: '1,201', icon: <CircleCheck className="size-4 text-good" aria-hidden /> },
                                { label: 'Failed', value: '3', icon: <CircleAlert className="size-4 text-critical" aria-hidden /> },
                                { label: 'Took', value: '0m 48s', icon: null },
                            ].map((stat) => (
                                <Stack key={stat.label} gap="2xs" className="rounded-control border border-border px-3 py-2">
                                    <Row as="span" gap="xs" className="text-xs text-muted-foreground">
                                        {stat.icon}
                                        {stat.label}
                                    </Row>
                                    <span className="font-mono text-title tabular-nums">{stat.value}</span>
                                </Stack>
                            ))}
                        </Columns>
                        <Stack gap="xs">
                            <span className="text-xs font-medium text-critical-ink">Rows not imported</span>
                            <DataTable variant="list" columns={FAILED_COLUMNS} rows={FAILED} rowKey={(row) => String(row.row)} />
                        </Stack>
                    </>
                )}
            </DialogShell>
        </Behind>
    )
}

type ExportStage = 'form' | 'running' | 'ready'

const FORMATS = [
    { value: 'csv', label: 'CSV' },
    { value: 'json', label: 'JSON' },
    { value: 'parquet', label: 'Parquet' },
] as const

/** An export: what and in which form, then its progress, then a file to download that keeps for a day. */
export function ExportRuns({ stage: first = 'form' }: { stage?: ExportStage }) {
    const [open, setOpen] = useState(true)
    const [stage, setStage] = useState<ExportStage>(first)
    const [format, setFormat] = useState<(typeof FORMATS)[number]['value']>('csv')
    const [from, setFrom] = useState('2026-10-01')
    const [to, setTo] = useState('2026-10-31')
    const [include, setInclude] = useState({ runs: true, steps: true, logs: false, inputs: false })
    const progress = useProgress(stage === 'running', 2500, () => setStage('ready'))
    const rangeIssues: Issue[] = from > to ? [{ tone: 'critical', text: 'The end is before the start' }] : []
    const [issueOpen, setIssueOpen] = useState(false)
    const name = `harbor-runs-${from}-${to}.${format}`
    const close = (next: boolean) => {
        setOpen(next)
        if (!next) setStage('form')
    }
    const parts = [
        { key: 'runs', label: 'Runs', detail: 'State, times and who started each, 412 rows.' },
        { key: 'steps', label: 'Steps', detail: 'Each step of each run, 2,060 rows.' },
        { key: 'logs', label: 'Logs', detail: 'Every log line; large.' },
        { key: 'inputs', label: 'Inputs', detail: 'The values each run was started with.' },
    ] as const
    return (
        <Behind action="Export" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={close}
                title={stage === 'ready' ? 'Your export is ready' : 'Export runs from harbor'}
                description={stage === 'ready' ? 'The file keeps for 24 hours; after that, export again.' : undefined}
                words={stage === 'ready' ? { cancel: 'Close' } : undefined}
                count={
                    stage === 'form' ? (
                        <IssueCount
                            critical={rangeIssues.length}
                            list={rangeIssues.map((issue) => ({ label: 'To', issue, onGo: () => setIssueOpen(true) }))}
                        />
                    ) : undefined
                }
                confirm={
                    stage === 'form'
                        ? {
                              label: 'Export',
                              onConfirm: () => setStage('running'),
                              why:
                                  rangeIssues.length > 0
                                      ? 'Fix the dates first.'
                                      : Object.values(include).some(Boolean)
                                        ? undefined
                                        : 'Include at least one part.',
                          }
                        : stage === 'running'
                          ? { label: 'Export', busy: true, busyLabel: 'Exporting', onConfirm: () => undefined }
                          : { label: 'Download', onConfirm: () => close(false) }
                }
            >
                {stage === 'form' && (
                    <>
                        <Field id="export-format" label="Format">
                            <Segmented label="Format" value={format} options={FORMATS} onChoose={setFormat} fill />
                        </Field>
                        <Columns count={2} min="xs" gap="md">
                            <TextField id="export-from" label="From" mono value={from} onChange={setFrom} placeholder="2026-10-01" />
                            <TextField
                                id="export-to"
                                label="To"
                                mono
                                value={to}
                                onChange={setTo}
                                issues={rangeIssues}
                                issueOpen={issueOpen}
                                onIssueOpenChange={setIssueOpen}
                                placeholder="2026-10-31"
                            />
                        </Columns>
                        <CheckboxList label="Include">
                            {parts.map((part) => (
                                <CheckboxField
                                    key={part.key}
                                    label={part.label}
                                    description={part.detail}
                                    checked={include[part.key]}
                                    onCheckedChange={(checked) => setInclude({ ...include, [part.key]: checked })}
                                />
                            ))}
                        </CheckboxList>
                    </>
                )}
                {stage === 'running' && (
                    <Stack justify="center" className="h-40">
                        <Progress value={progress * 100}>
                            <ProgressLabel className="font-normal">Writing {name}</ProgressLabel>
                            <ProgressValue className="font-mono">{() => `${String(Math.round(progress * 100))}%`}</ProgressValue>
                        </Progress>
                    </Stack>
                )}
                {stage === 'ready' && (
                    <Attachment className="w-full">
                        <AttachmentMedia>
                            <FileSpreadsheet aria-hidden />
                        </AttachmentMedia>
                        <AttachmentContent>
                            <AttachmentTitle className="font-mono">{name}</AttachmentTitle>
                            <AttachmentDescription>2.4 MB, 2,472 rows</AttachmentDescription>
                        </AttachmentContent>
                        <AttachmentActions>
                            <CircleCheck className="size-5 text-good" aria-label="Ready" />
                        </AttachmentActions>
                    </Attachment>
                )}
            </DialogShell>
        </Behind>
    )
}

const MEMBERS = [
    { username: 'ada', email: 'ada@example.org', role: 'owner' },
    { username: 'grace', email: 'grace@example.org', role: 'edit' },
    { username: 'linus', email: 'linus@example.org', role: 'view' },
]

const ROLES = [
    { value: 'view', label: 'Can view' },
    { value: 'run', label: 'Can run' },
    { value: 'edit', label: 'Can edit' },
]

/** Sharing a project: who has it and how, invites by address, what the link opens to, and Copy link. */
export function Share() {
    const [open, setOpen] = useState(true)
    const [invite, setInvite] = useState<Address[]>([{ address: 'margaret@example.org' }, { address: 'ops@example.org' }])
    const [inviteRole, setInviteRole] = useState('run')
    const [members, setMembers] = useState(MEMBERS)
    const [link, setLink] = useState<'invited' | 'workspace'>('workspace')
    const send = () => {
        setMembers([...members, ...invite.map((one) => ({ username: one.address.split('@')[0], email: one.address, role: inviteRole }))])
        setInvite([])
    }
    return (
        <Behind action="Share" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="Share harbor"
                description="People see the jobs, runs and logs in the project, as their role allows."
                footer={
                    <CopyButton
                        value="https://tidevann.example.org/harbor"
                        showLabel
                        icon={<Link2 aria-hidden />}
                        words={{ copy: 'Copy link', copied: 'Copied' }}
                        className="-ml-2"
                    />
                }
                confirm={{ label: 'Done', onConfirm: () => setOpen(false) }}
            >
                <Field id="invite" label="Invite">
                    <Row gap="sm" align="start" stackBelow="sm">
                        <AddressInput
                            id="invite"
                            value={invite}
                            onChange={setInvite}
                            className="min-w-0 flex-1"
                            words={{ placeholder: 'Add people by email' }}
                        />
                        <Row align="stretch">
                            <NativeSelect
                                size="default"
                                aria-label="Role for the invited"
                                value={inviteRole}
                                onChange={(event) => setInviteRole(event.target.value)}
                                className="flex-1 sm:w-32"
                            >
                                {ROLES.map((role) => (
                                    <NativeSelectOption key={role.value} value={role.value}>
                                        {role.label}
                                    </NativeSelectOption>
                                ))}
                            </NativeSelect>
                            <Button
                                onClick={send}
                                aria-disabled={invite.length === 0 || undefined}
                                className={cn(invite.length === 0 && 'opacity-50')}
                            >
                                Invite
                            </Button>
                        </Row>
                    </Row>
                </Field>
                <Stack gap="xs">
                    <span className="text-sm font-medium">People with access</span>
                    <Stack as="ul" gap="none">
                        {members.map((member) => (
                            <li key={member.email} className="py-1.5">
                                <PersonRow
                                    name={member.username}
                                    image={pictureOf(member.username)}
                                    note={member.username === 'ada' ? '(you)' : undefined}
                                    detail={member.email}
                                    aside={
                                        member.role === 'owner' ? (
                                            <span className="px-2.5 text-sm">Owner</span>
                                        ) : (
                                            <NativeSelect
                                                size="sm"
                                                aria-label={`Role for ${member.username}`}
                                                value={member.role}
                                                onChange={(event) =>
                                                    setMembers(
                                                        event.target.value === 'remove'
                                                            ? members.filter((one) => one.email !== member.email)
                                                            : members.map((one) =>
                                                                  one.email === member.email ? { ...one, role: event.target.value } : one,
                                                              ),
                                                    )
                                                }
                                                className="w-32"
                                            >
                                                {ROLES.map((role) => (
                                                    <NativeSelectOption key={role.value} value={role.value}>
                                                        {role.label}
                                                    </NativeSelectOption>
                                                ))}
                                                <NativeSelectOption value="remove">Remove</NativeSelectOption>
                                            </NativeSelect>
                                        )
                                    }
                                />
                            </li>
                        ))}
                    </Stack>
                </Stack>
                <Stack gap="xs">
                    <span className="text-sm font-medium">Link access</span>
                    <Item variant="outline" size="sm">
                        <ItemMedia variant="icon">{link === 'invited' ? <Lock aria-hidden /> : <Users aria-hidden />}</ItemMedia>
                        <ItemContent>
                            <NativeSelect
                                size="sm"
                                aria-label="Who the link opens for"
                                value={link}
                                onChange={(event) => setLink(event.target.value as 'invited' | 'workspace')}
                                className="w-fit"
                            >
                                <NativeSelectOption value="invited">Only people invited</NativeSelectOption>
                                <NativeSelectOption value="workspace">Anyone in Tidevann</NativeSelectOption>
                            </NativeSelect>
                            <ItemDescription className="text-xs">
                                {link === 'invited'
                                    ? 'Others who open the link are asked to request access.'
                                    : 'Anyone signed in to Tidevann can view with the link.'}
                            </ItemDescription>
                        </ItemContent>
                        <Globe
                            className={cn('size-4 shrink-0', link === 'workspace' ? 'text-muted-foreground' : 'text-transparent')}
                            aria-hidden
                        />
                    </Item>
                </Stack>
            </DialogShell>
        </Behind>
    )
}
