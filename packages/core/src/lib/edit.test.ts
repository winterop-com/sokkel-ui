import { describe, expect, it } from 'vitest'

import {
    AT_REST,
    draftOf,
    editCycle,
    editKey,
    failureOf,
    nextColumn,
    nextEditableCell,
    parseNumber,
    readDraft,
    shownValue,
    typesInto,
    type EditAction,
    type EditState,
} from './edit'

const run = (actions: EditAction[], from: EditState = AT_REST) => actions.reduce(editCycle, from)

describe('the edit cycle', () => {
    it('opens on the value, takes what is typed, holds it while it saves, and closes once saved', () => {
        const open = run([{ type: 'start', draft: '0 2 * * *' }])
        expect(open).toEqual({ editing: true, draft: '0 2 * * *', saving: false, error: null })
        const typed = editCycle(open, { type: 'change', draft: '30 2 * * *' })
        const saving = editCycle(typed, { type: 'save' })
        expect(saving).toEqual({ editing: true, draft: '30 2 * * *', saving: true, error: null })
        expect(editCycle(saving, { type: 'saved' })).toEqual(AT_REST)
    })

    it('keeps the editor open on the typed value with the reason when a save is refused', () => {
        const refused = run([
            { type: 'start', draft: '3' },
            { type: 'change', draft: '12' },
            { type: 'save' },
            { type: 'failed', error: 'At most 10 retries' },
        ])
        expect(refused).toEqual({ editing: true, draft: '12', saving: false, error: 'At most 10 retries' })
    })

    it('clears a refusal as soon as the value is changed, as a refused field is no longer refused once changed', () => {
        const refused = run([
            { type: 'start', draft: '12' },
            { type: 'failed', error: 'At most 10 retries' },
        ])
        expect(editCycle(refused, { type: 'change', draft: '1' })).toMatchObject({ draft: '1', error: null })
    })

    it('drops the draft on cancel, but neither cancels nor types while a save runs', () => {
        const open = run([
            { type: 'start', draft: 'ada' },
            { type: 'change', draft: 'grace' },
        ])
        expect(editCycle(open, { type: 'cancel' })).toEqual(AT_REST)
        const saving = editCycle(open, { type: 'save' })
        expect(editCycle(saving, { type: 'cancel' })).toBe(saving)
        expect(editCycle(saving, { type: 'change', draft: 'linus' })).toBe(saving)
        expect(editCycle(saving, { type: 'start', draft: 'linus' })).toBe(saving)
    })

    it('saves nothing that is not open', () => {
        expect(editCycle(AT_REST, { type: 'save' })).toBe(AT_REST)
        expect(editCycle(AT_REST, { type: 'change', draft: 'x' })).toBe(AT_REST)
    })
})

describe('drafts and values', () => {
    it('starts an editor from a value as text, an empty one for none', () => {
        expect(draftOf('nightly-export')).toBe('nightly-export')
        expect(draftOf(3)).toBe('3')
        expect(draftOf(null)).toBe('')
        expect(draftOf(undefined)).toBe('')
    })

    it('reads a number in figures, with thousands marks, and nothing as none', () => {
        expect(parseNumber('42')).toBe(42)
        expect(parseNumber(' 1,204 ')).toBe(1204)
        expect(parseNumber('-0.5')).toBe(-0.5)
        expect(parseNumber('.5')).toBe(0.5)
        expect(parseNumber('1e3')).toBe(1000)
        expect(parseNumber('')).toBeNull()
        expect(parseNumber('  ')).toBeNull()
        expect(parseNumber('twelve')).toBeUndefined()
        expect(parseNumber('12px')).toBeUndefined()
        expect(parseNumber('1.2.3')).toBeUndefined()
    })

    it('refuses text that is not a number in a number editor, in the words given', () => {
        expect(readDraft('7', 'number')).toEqual({ value: 7 })
        expect(readDraft('', 'number')).toEqual({ value: null })
        expect(readDraft('seven', 'number')).toEqual({ error: 'Enter a number' })
        expect(readDraft('seven', 'number', { notNumber: 'Skriv et tall' })).toEqual({ error: 'Skriv et tall' })
        expect(readDraft(' spaced ', 'text')).toEqual({ value: ' spaced ' })
    })

    it("takes a date's draft as the day its field read, and nothing as none", () => {
        expect(readDraft('2026-11-08', 'date')).toEqual({ value: '2026-11-08' })
        expect(readDraft('', 'date')).toEqual({ value: null })
    })

    it('draws a number in figures and a choice by its label', () => {
        expect(shownValue(12345, 'number')).toBe('12,345')
        expect(shownValue('ada', 'select', [{ value: 'ada', label: 'Ada' }])).toBe('Ada')
        expect(shownValue('linus', 'select', [{ value: 'ada' }])).toBe('linus')
        expect(shownValue(null, 'text')).toBe('')
    })

    it("says a refusal by the app's message, or by the words for one without", () => {
        expect(failureOf(new Error('The scheduler reads five fields'))).toBe('The scheduler reads five fields')
        expect(failureOf('Taken')).toBe('Taken')
        expect(failureOf(undefined)).toBe('Could not save')
        expect(failureOf(new Error(''), { failed: 'Ikke lagret' })).toBe('Ikke lagret')
    })
})

describe('the keys in an editor', () => {
    it('saves a line on Enter, and drops it on Escape', () => {
        expect(editKey({ key: 'Enter' }, 'text', false)).toBe('save')
        expect(editKey({ key: 'Enter' }, 'number', false)).toBe('save')
        expect(editKey({ key: 'Escape' }, 'text', false)).toBe('cancel')
        expect(editKey({ key: 'a' }, 'text', false)).toBeUndefined()
    })

    it('keeps Enter for a new line in several lines, saving on Command or Ctrl with Enter', () => {
        expect(editKey({ key: 'Enter' }, 'multiline', false)).toBeUndefined()
        expect(editKey({ key: 'Enter', shiftKey: true }, 'multiline', true)).toBeUndefined()
        expect(editKey({ key: 'Enter', metaKey: true }, 'multiline', false)).toBe('save')
        expect(editKey({ key: 'Enter', ctrlKey: true }, 'multiline', true)).toBe('save')
    })

    it('leaves Enter to a select, which picks from its list', () => {
        expect(editKey({ key: 'Enter' }, 'select', true)).toBeUndefined()
        expect(editKey({ key: 'Escape' }, 'select', true)).toBe('cancel')
    })

    it('in a cell, moves down on Enter, up with Shift, and across on Tab', () => {
        expect(editKey({ key: 'Enter' }, 'number', true)).toBe('down')
        expect(editKey({ key: 'Enter', shiftKey: true }, 'number', true)).toBe('up')
        expect(editKey({ key: 'Tab' }, 'select', true)).toBe('next')
        expect(editKey({ key: 'Tab', shiftKey: true }, 'text', true)).toBe('previous')
        // Outside a cell, Tab is the page's: leaving the editor saves it.
        expect(editKey({ key: 'Tab' }, 'text', false)).toBeUndefined()
    })

    it('lets an input method finish composing before Enter saves', () => {
        expect(editKey({ key: 'Enter', isComposing: true }, 'text', true)).toBeUndefined()
    })

    it('opens a cell at rest on a typed character, never on Space or a chord', () => {
        expect(typesInto({ key: '7' })).toBe(true)
        expect(typesInto({ key: 'ø' })).toBe(true)
        expect(typesInto({ key: ' ' })).toBe(false)
        expect(typesInto({ key: 'c', metaKey: true })).toBe(false)
        expect(typesInto({ key: 'v', ctrlKey: true })).toBe(false)
        expect(typesInto({ key: 'Enter' })).toBe(false)
        expect(typesInto({ key: 'ArrowDown' })).toBe(false)
    })
})

describe('moving between cells', () => {
    const rows = ['r1', 'r2', 'r3']
    const columns = ['schedule', 'retries', 'owner']

    it('steps across a row, then onto the next row, and stops past the end', () => {
        expect(nextEditableCell(rows, columns, { row: 'r1', column: 'schedule' }, 1)).toEqual({ row: 'r1', column: 'retries' })
        expect(nextEditableCell(rows, columns, { row: 'r1', column: 'owner' }, 1)).toEqual({ row: 'r2', column: 'schedule' })
        expect(nextEditableCell(rows, columns, { row: 'r3', column: 'owner' }, 1)).toBeUndefined()
    })

    it('steps back the same way', () => {
        expect(nextEditableCell(rows, columns, { row: 'r2', column: 'schedule' }, -1)).toEqual({ row: 'r1', column: 'owner' })
        expect(nextEditableCell(rows, columns, { row: 'r1', column: 'schedule' }, -1)).toBeUndefined()
    })

    it('skips cells that may not be edited', () => {
        const locked = (row: string, column: string) => !(row === 'r2' && column !== 'owner')
        expect(nextEditableCell(rows, columns, { row: 'r1', column: 'owner' }, 1, locked)).toEqual({ row: 'r2', column: 'owner' })
        expect(nextEditableCell(rows, columns, { row: 'r3', column: 'schedule' }, -1, locked)).toEqual({ row: 'r2', column: 'owner' })
    })

    it('starts from a column that is not editable at the first or last editable one in its row', () => {
        expect(nextEditableCell(rows, columns, { row: 'r2', column: 'job' }, 1)).toEqual({ row: 'r2', column: 'schedule' })
        expect(nextEditableCell(rows, columns, { row: 'r2', column: 'job' }, -1)).toEqual({ row: 'r2', column: 'owner' })
    })

    it('moves the active column by the arrows within the row', () => {
        const all = ['job', ...columns]
        expect(nextColumn(all, 'job', 1)).toBe('schedule')
        expect(nextColumn(all, 'owner', 1)).toBe('owner')
        expect(nextColumn(all, 'job', -1)).toBe('job')
        expect(nextColumn(all, undefined, 1)).toBe('job')
    })
})
