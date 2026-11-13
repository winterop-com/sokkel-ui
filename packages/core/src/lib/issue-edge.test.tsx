import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Field } from '../components/Field'
import { ISSUE_EDGE as ISSUE_MARK_EDGE } from '../components/IssueMark'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { Input } from '../components/ui/input'
import { NativeSelect } from '../components/ui/native-select'
import { Switch } from '../components/ui/switch'
import { Textarea } from '../components/ui/textarea'
import { FIELD_EDGE, HOLDS_INVALID_EDGE, INVALID_EDGE, ISSUE_EDGE, ISSUE_WITHIN_EDGE } from './issue-edge'

/** A class's variants and its utility, split on the colons outside brackets: `[&>:first-child]:focus-visible:ring-3`. */
function parts(name: string): { variants: string[]; utility: string } {
    const pieces: string[] = []
    let depth = 0
    let from = 0
    for (let at = 0; at < name.length; at += 1) {
        if (name[at] === '[') depth += 1
        if (name[at] === ']') depth -= 1
        if (name[at] === ':' && depth === 0) {
            pieces.push(name.slice(from, at))
            from = at + 1
        }
    }
    return { variants: pieces, utility: name.slice(from) }
}

const names = (classes: string) => classes.split(/\s+/).filter(Boolean)
const utilities = (classes: string) =>
    names(classes)
        .map((name) => parts(name).utility)
        .sort()
const focused = (name: string) => parts(name).variants.some((variant) => variant.startsWith('focus'))

const CRITICAL = {
    INVALID_EDGE,
    HOLDS_INVALID_EDGE,
    ISSUE_EDGE: ISSUE_EDGE.critical,
    ISSUE_WITHIN_EDGE: ISSUE_WITHIN_EDGE.critical,
    FIELD_EDGE: FIELD_EDGE.critical,
}
const WARNING = { ISSUE_EDGE: ISSUE_EDGE.warning, ISSUE_WITHIN_EDGE: ISSUE_WITHIN_EDGE.warning, FIELD_EDGE: FIELD_EDGE.warning }

/** The classes of an opening tag, its entities read back. */
const classesOf = (tag: string) => names((/class="([^"]*)"/.exec(tag)?.[1] ?? '').replaceAll('&gt;', '>').replaceAll('&amp;', '&'))

/** The classes of the first element in `html` that says `aria-invalid` and has classes. */
const invalidClasses = (html: string) =>
    classesOf([...html.matchAll(/<[^>]*aria-invalid="true"[^>]*>/g)].map(([tag]) => tag).find((tag) => tag.includes('class="')) ?? '')

describe('the issue edge', () => {
    it('draws the same tints in every form: the edge at 80 at rest and full with focus, a 3px ring at 20, 40 in dark', () => {
        for (const [form, classes] of Object.entries(CRITICAL)) {
            expect(utilities(classes), form).toEqual([
                'border-critical',
                'border-critical/80',
                'ring-3',
                'ring-critical/20',
                'ring-critical/40',
            ])
            for (const name of names(classes)) {
                const { utility, variants } = parts(name)
                expect(focused(name), name).toBe(utility !== 'border-critical/80')
                expect(variants.includes('dark'), name).toBe(utility === 'ring-critical/40')
            }
        }
        for (const [form, classes] of Object.entries(WARNING)) {
            expect(utilities(classes), form).toEqual(['border-warning', 'border-warning/80', 'ring-warning/25'])
            for (const name of names(classes)) expect(focused(name), name).toBe(parts(name).utility !== 'border-warning/80')
        }
    })

    it('is the edge IssueMark exports', () => {
        expect(ISSUE_MARK_EDGE).toBe(ISSUE_EDGE)
    })

    it('is worn by a bare primitive that says aria-invalid, in no other color', () => {
        const controls: [string, ReactElement][] = [
            ['Input', <Input aria-invalid />],
            ['Textarea', <Textarea aria-invalid />],
            ['NativeSelect', <NativeSelect aria-invalid />],
            ['Checkbox', <Checkbox aria-invalid />],
            ['Switch', <Switch aria-invalid />],
            ['Button', <Button variant="outline" aria-invalid />],
        ]
        for (const [name, control] of controls) {
            const own = invalidClasses(renderToStaticMarkup(control))
            expect(own, name).toEqual(expect.arrayContaining(names(INVALID_EDGE)))
            expect(
                own.filter((one) => one.includes('destructive')),
                name,
            ).toEqual([])
        }
    })

    it("is put by a field on its control in the worst issue's tone", () => {
        // The box that holds the control, the `div` the input opens in.
        const box = (html: string) => classesOf(html.slice(html.lastIndexOf('<div', html.indexOf('<input')), html.indexOf('<input')))
        const refused = renderToStaticMarkup(
            <Field id="code" label="Code" error="Use lowercase letters, digits and dashes.">
                <Input id="code" aria-invalid />
            </Field>,
        )
        expect(box(refused)).toEqual(expect.arrayContaining(names(FIELD_EDGE.critical)))
        const warned = renderToStaticMarkup(
            <Field
                id="retries"
                label="Retries"
                issues={[{ tone: 'warning', text: 'More than 5 retries can hold a failed run for an hour.' }]}
            >
                <Input id="retries" />
            </Field>,
        )
        expect(box(warned)).toEqual(expect.arrayContaining(names(FIELD_EDGE.warning)))
        expect(box(warned).some((name) => name.includes('critical'))).toBe(false)
    })
})
