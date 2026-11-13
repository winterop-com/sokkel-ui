import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { moveTreeNode, Tree, type TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { FileText, Folder, FolderOpen, PenLine, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { arranged, layouts, resetLayout, saveLayout, type LayoutSection } from '../data/backend'
import { formOf, questionsOf, type Form, type QuestionType } from '../data/forms'
import { count, useFoot } from '../ui'

const TYPE_WORDS: Record<QuestionType, string> = {
    text: 'Text',
    multiline: 'Long text',
    integer: 'Whole number',
    decimal: 'Number',
    date: 'Date',
    time: 'Time',
    yesno: 'Yes or no',
    choice: 'Choice',
    computed: 'Worked out',
}

const SECTION = 'section:'
const QUESTION = 'question:'

/** The form's sections as branches and their questions as rows, in the order it asks them. */
function nodesOf(form: Form): TreeNode[] {
    return form.sections.map((section) => ({
        id: `${SECTION}${section.id}`,
        label: section.title,
        meta: count(section.questions.length, 'question'),
        icon: Folder,
        openIcon: FolderOpen,
        children: section.questions.map((question) => ({
            id: `${QUESTION}${question.id}`,
            label: question.label,
            meta: TYPE_WORDS[question.type],
            icon: FileText,
        })),
    }))
}

/** A tree of sections and questions read back as a layout. */
function layoutFrom(nodes: readonly TreeNode[]): LayoutSection[] {
    return nodes.map((node) => ({
        id: node.id.slice(SECTION.length),
        questions: (node.children ?? []).map((child) => child.id.slice(QUESTION.length)),
    }))
}

/**
 * The order a form asks its questions in: its sections and their questions in a tree, dragged (or
 * moved with Alt and the arrows) into the order every later fill follows. A question moves within
 * its section or into another; a section moves among the sections. Each move is kept on the server.
 */
export function FormLayout({ formId }: { formId: string }) {
    const form = formOf(formId)
    const { rows, error } = useCollection(layouts)
    // The order just dragged, held while the server keeps it, so the tree never jumps back between.
    const [held, setHeld] = useState<LayoutSection[] | null>(null)
    const [busy, setBusy] = useState(false)
    const kept = rows?.find((layout) => layout.id === formId)
    const shown = form === undefined ? undefined : arranged(form, held === null ? kept : { id: formId, sections: held })
    const nodes = shown === undefined ? [] : nodesOf(shown)
    useFoot(
        shown === undefined ? undefined : `${count(shown.sections.length, 'section')} · ${count(questionsOf(shown).length, 'question')}`,
        undefined,
        [shown?.sections.length, kept === undefined],
    )

    const move = (id: string, into: string | null, index: number) => {
        const next = layoutFrom(moveTreeNode(nodes, id, { into, index }))
        setHeld(next)
        saveLayout(formId, next).then(
            () => setHeld(null),
            (failure: unknown) => {
                setHeld(null)
                toast.error('The order was not kept', { description: failure instanceof Error ? failure.message : String(failure) })
            },
        )
    }

    const reset = () => {
        setBusy(true)
        resetLayout(formId).then(
            () => {
                setBusy(false)
                toast.success('Back in the form’s own order')
            },
            (failure: unknown) => {
                setBusy(false)
                toast.error('Not reset', { description: failure instanceof Error ? failure.message : String(failure) })
            },
        )
    }

    return (
        <Page>
            <PageHeader
                title="Layout"
                code={formId}
                onBack={() => go(`/forms/${formId}`)}
                words={{ back: form?.title ?? 'The form' }}
                description="The order the form asks its questions in. Drag a question within its section or into another, or a section among the sections; from the keyboard, Alt (Option) and the arrows move the focused row. Every fill of the form follows the order kept here."
                actions={
                    form === undefined ? undefined : (
                        <>
                            <ApiLink path={`/forms/${formId}/layout`} />
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={reset}
                                busy={busy}
                                reason={kept === undefined ? 'The form is in its own order.' : undefined}
                            >
                                <RotateCcw aria-hidden />
                                Reset
                            </Button>
                            <Button size="sm" onClick={() => go(`/forms/${formId}`)}>
                                <PenLine aria-hidden />
                                Fill in
                            </Button>
                        </>
                    )
                }
            />
            <PageState
                loading={rows === undefined && error === undefined}
                error={
                    error ??
                    (form === undefined
                        ? `The server serves no form called ${formId}.`
                        : form.sections.length === 0
                          ? 'The form is a grid of counts, laid out by its rows and cells; it has no sections to order.'
                          : undefined)
                }
                status={form === undefined ? 404 : undefined}
            >
                {shown !== undefined && (
                    <Section
                        title={shown.title}
                        meta={kept === undefined ? 'The form’s own order' : 'Arranged'}
                        description="Sections in the order they are filled, each with its questions."
                        flush
                    >
                        <Tree
                            label={`Layout of ${shown.title}`}
                            nodes={nodes}
                            selection="none"
                            defaultExpanded={nodes.map((node) => node.id)}
                            onMove={move}
                            canMove={(id, into) => (id.startsWith(SECTION) ? into === null : into?.startsWith(SECTION) === true)}
                        />
                    </Section>
                )}
            </PageState>
        </Page>
    )
}
