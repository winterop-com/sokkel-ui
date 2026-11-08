import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DataTable, type DataColumn } from './DataTable'
import { InlineEdit } from './InlineEdit'
import { tableEditing } from './table-editing'

const save = async () => undefined

describe('InlineEdit at rest', () => {
    it('shows the value as a button that says what it edits', () => {
        const html = renderToStaticMarkup(<InlineEdit label="Schedule" defaultValue="0 2 * * *" onSave={save} />)
        expect(html).toContain('<button')
        expect(html).toContain('0 2 * * *')
        expect(html).toContain('Edit Schedule')
    })

    it('says an empty value with the placeholder, or the words for empty', () => {
        expect(renderToStaticMarkup(<InlineEdit label="Owner" onSave={save} />)).toContain('Empty')
        expect(renderToStaticMarkup(<InlineEdit label="Owner" placeholder="Nobody" onSave={save} />)).toContain('Nobody')
    })

    it('draws a number in figures and a choice by its label', () => {
        expect(renderToStaticMarkup(<InlineEdit label="Records" editor="number" value={12500} onSave={save} />)).toContain('12,500')
        expect(renderToStaticMarkup(<InlineEdit label="At" editor="time" value="02:30" onSave={save} />)).toContain('02:30')
        const owner = renderToStaticMarkup(
            <InlineEdit
                label="Owner"
                editor="select"
                value="ada"
                options={[
                    { value: 'ada', label: 'Ada' },
                    { value: 'grace', label: 'Grace' },
                ]}
                onSave={save}
            />,
        )
        expect(owner).toContain('>Ada<')
    })

    it('is read only when disabled', () => {
        const html = renderToStaticMarkup(<InlineEdit label="Job" value="nightly-export" disabled onSave={save} />)
        expect(html).not.toContain('<button')
        expect(html).not.toContain('Edit Job')
        expect(html).toContain('nightly-export')
    })

    it('draws a page title in its type', () => {
        expect(renderToStaticMarkup(<InlineEdit label="Name" variant="title" value="nightly-export" onSave={save} />)).toContain(
            'text-page-title',
        )
    })
})

describe('InlineEdit editing', () => {
    it('opens on the value in an input named for it', () => {
        const html = renderToStaticMarkup(<InlineEdit label="Schedule" value="0 2 * * *" defaultEditing onSave={save} />)
        expect(html).toMatch(/<input[^>]*aria-label="Schedule"/)
        expect(html).toContain('value="0 2 * * *"')
        expect(html).not.toContain('Edit Schedule')
    })

    it('types a time into a time field named for the value, the time as its field writes it', () => {
        const html = renderToStaticMarkup(<InlineEdit label="At" editor="time" value="02:30" defaultEditing onSave={save} />)
        expect(html).toMatch(/<input[^>]*aria-label="At"/)
        expect(html).toContain('value="02:30"')
        expect(html).not.toContain('Edit At')
    })

    it('holds the typed value read only with a spinner while it saves', () => {
        const html = renderToStaticMarkup(
            <InlineEdit label="Retries" editor="number" value={3} defaultEditing={{ draft: '5', saving: true }} onSave={save} />,
        )
        expect(html).toContain('value="5"')
        expect(html).toContain('readOnly=""')
        expect(html).toContain('aria-busy="true"')
        expect(html).toContain('aria-label="Saving"')
    })

    it("keeps the typed value open with the app's refusal in the mark at its end", () => {
        const html = renderToStaticMarkup(
            <InlineEdit
                label="Retries"
                editor="number"
                value={3}
                defaultEditing={{ draft: '12', error: 'At most 10 retries' }}
                onSave={save}
            />,
        )
        expect(html).toContain('value="12"')
        expect(html).toContain('aria-invalid="true"')
        expect(html).toContain('aria-label="Error: At most 10 retries"')
    })

    it('gives several lines a Save and a Cancel, in the words given', () => {
        const html = renderToStaticMarkup(
            <InlineEdit
                label="Description"
                editor="multiline"
                value="Exports the day's orders."
                defaultEditing
                words={{ save: 'Lagre', cancel: 'Avbryt' }}
                onSave={save}
            />,
        )
        expect(html).toContain('<textarea')
        expect(html).toContain('>Lagre<')
        expect(html).toContain('>Avbryt<')
    })

    it('never opens while disabled', () => {
        const html = renderToStaticMarkup(<InlineEdit label="Job" value="nightly-export" disabled defaultEditing onSave={save} />)
        expect(html).not.toContain('<input')
    })
})

describe('DataTable editable cells', () => {
    interface Job {
        id: string
        retries: number
    }
    const columns: DataColumn<Job>[] = [
        { id: 'job', header: 'Job', width: '10rem', cell: (job) => job.id },
        {
            id: 'retries',
            header: 'Retries',
            width: '6rem',
            align: 'end',
            cell: (job) => job.retries,
            edit: { editor: 'number', value: (job) => job.retries, save, enabled: (job) => job.id !== 'send-digest' },
        },
    ]

    it('marks each cell with its column and lets the editable ones take a press', () => {
        const html = renderToStaticMarkup(
            <DataTable
                columns={columns}
                rows={[
                    { id: 'nightly-export', retries: 3 },
                    { id: 'send-digest', retries: 0 },
                ]}
                rowKey={(job) => job.id}
                editing={tableEditing}
            />,
        )
        expect(html).toContain('data-column="retries"')
        // Only the cell its row lets be edited reads as text to edit.
        expect(html.match(/data-column="retries"[^>]*cursor-text/g)?.length).toBe(1)
    })

    it('edits nothing without the editing, which the table then carries none of', () => {
        const html = renderToStaticMarkup(
            <DataTable columns={columns} rows={[{ id: 'nightly-export', retries: 3 }]} rowKey={(job) => job.id} />,
        )
        expect(html).not.toContain('data-column')
        expect(html).not.toContain('cursor-text')
        expect(html).toContain('nightly-export')
    })
})
