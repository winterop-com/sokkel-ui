import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { FileField } from '@winterop-com/sokkel-ui/FileField'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { tableEditing } from '@winterop-com/sokkel-ui/table-editing'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { go } from 'tidevann-shared/router'

import { datasets } from './backend'
import { type Column, COLUMN_TYPES, type ColumnType, counted, freshId, now } from './model'
import { columnsOf, type ParsedTable, parseTable, rowsOf } from './parse'

const SAMPLE = `Month,Harbor,Arrivals
2025-01,Bergen,412
2025-01,Cork,198
2025-02,Bergen,437
2025-02,Cork,224`

type Source = 'file' | 'paste'

/** One column of the table being read: its name and type, editable, and a few of its values. */
interface ColumnLine {
    column: Column
    at: number
    sample: string
}

/**
 * Importing data: a CSV, TSV or JSON file picked or dropped, or rows pasted, read in the browser.
 * The columns' names and guessed types show before anything is kept, each one editable.
 */
export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [source, setSource] = useState<Source>('file')
    const [files, setFiles] = useState<File[]>([])
    const [text, setText] = useState('')
    const [table, setTable] = useState<ParsedTable | null>(null)
    const [columns, setColumns] = useState<Column[]>([])
    const [name, setName] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (open) return
        setSource('file')
        setFiles([])
        setText('')
        setTable(null)
        setColumns([])
        setName('')
        setError(null)
    }, [open])

    const read = (content: string, title: string) => {
        if (content.trim() === '') {
            setTable(null)
            setError(null)
            return
        }
        const result = parseTable(content)
        if (!result.ok) {
            setTable(null)
            setError(result.error)
            return
        }
        setError(null)
        setTable(result.table)
        setColumns(columnsOf(result.table))
        setName((current) => (current.trim() === '' ? title : current))
    }

    const pick = (picked: File[]) => {
        setFiles(picked)
        const [file] = picked
        if (file === undefined) {
            setTable(null)
            setError(null)
            return
        }
        void file.text().then((content) => read(content, file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')))
    }

    const names = columns.map((column) => column.name.trim().toLowerCase())
    const clash = names.find((one, at) => one === '' || names.indexOf(one) !== at)
    const why =
        error !== null
            ? error
            : table === null
              ? source === 'file'
                  ? 'Pick a file to read first.'
                  : 'Paste rows to read first.'
              : name.trim() === ''
                ? 'The dataset needs a name.'
                : clash !== undefined
                  ? 'Every column needs a name of its own.'
                  : undefined

    const save = () => {
        if (table === null) return
        setBusy(true)
        const id = freshId('ds')
        const file = files[0]
        void datasets
            .create(
                {
                    name: name.trim(),
                    description: source === 'file' && file !== undefined ? `Imported from ${file.name}.` : 'Pasted in.',
                    source,
                    columns,
                    rows: rowsOf(table, columns, id),
                    updatedAt: now(),
                },
                id,
            )
            .then(
                (made) => {
                    setBusy(false)
                    onOpenChange(false)
                    toast.success(`${made.name} imported, ${counted(made.rows.length, 'row')}`)
                    go(`/datasets/${made.id}`)
                },
                () => setBusy(false),
            )
    }

    const lines: ColumnLine[] = columns.map((column, at) => ({
        column,
        at,
        sample: (table?.rows ?? [])
            .map((row) => row[at] ?? '')
            .filter((value) => value !== '')
            .slice(0, 3)
            .join(', '),
    }))
    const setColumn = (at: number, patch: Partial<Column>) =>
        setColumns((current) => current.map((column, index) => (index === at ? { ...column, ...patch } : column)))
    const columnTable: DataColumn<ColumnLine>[] = [
        {
            id: 'name',
            header: 'Column',
            width: 'minmax(9rem,1fr)',
            cell: (line) => line.column.name,
            edit: {
                editor: 'text',
                value: (line) => line.column.name,
                validate: (value) => (value.trim() === '' ? 'A column needs a name.' : null),
                save: (line, value) => setColumn(line.at, { name: value.trim() }),
            },
        },
        {
            id: 'type',
            header: 'Type',
            width: '8rem',
            cell: (line) => COLUMN_TYPES.find((type) => type.value === line.column.type)?.label ?? line.column.type,
            edit: {
                editor: 'select',
                options: COLUMN_TYPES.map((type) => ({ value: type.value, label: type.label })),
                value: (line) => line.column.type,
                save: (line, value) => setColumn(line.at, { type: value as ColumnType }),
            },
        },
        {
            id: 'sample',
            header: 'Values',
            width: 'minmax(10rem,1.4fr)',
            cell: (line) => <span className="truncate text-muted-foreground">{line.sample}</span>,
        },
    ]

    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            width="xl"
            phone="sheet"
            title="Import data"
            description="A CSV, TSV or JSON file, or rows pasted."
            confirm={{ label: 'Import', onConfirm: save, busy, busyLabel: 'Importing', why }}
            footer={
                table === null ? undefined : <span className="text-xs text-muted-foreground">{counted(table.rows.length, 'row')} read</span>
            }
        >
            <Stack gap="lg">
                <Segmented<Source>
                    label="Source"
                    value={source}
                    onValueChange={(next) => {
                        setSource(next)
                        setTable(null)
                        setError(null)
                        if (next === 'file' && files[0] !== undefined) pick(files)
                        if (next === 'paste' && text !== '') read(text, 'Pasted data')
                    }}
                    options={[
                        { value: 'file', label: 'File' },
                        { value: 'paste', label: 'Paste' },
                    ]}
                />
                {source === 'file' ? (
                    <FileField
                        id="import-file"
                        label="File"
                        description="The first row names the columns. JSON is a list of objects, or of arrays under a header row."
                        accept={['.csv', '.tsv', '.json', '.txt']}
                        types="CSV, TSV or JSON"
                        maxFiles={1}
                        maxSize={5_000_000}
                        value={files}
                        onChange={pick}
                        error={error}
                    />
                ) : (
                    <TextField
                        id="import-paste"
                        label="Rows"
                        description="Comma, semicolon or tab separated, the first row naming the columns; or JSON."
                        multiline
                        rows={8}
                        mono
                        placeholder={SAMPLE}
                        value={text}
                        onChange={(next) => {
                            setText(next)
                            read(next, 'Pasted data')
                        }}
                        error={error}
                    />
                )}
                {table !== null && (
                    <>
                        <TextField id="import-name" label="Name" value={name} onChange={setName} required />
                        <Field
                            id="import-columns"
                            label="Columns"
                            description="Types are guessed from the values; press a name or a type to change it."
                        >
                            <DataTable
                                columns={columnTable}
                                rows={lines}
                                rowKey={(line) => line.column.id}
                                editing={tableEditing}
                                minWidth="auto"
                                stackBelow={420}
                                resizable={false}
                                variant="list"
                            />
                        </Field>
                    </>
                )}
            </Stack>
        </DialogShell>
    )
}
