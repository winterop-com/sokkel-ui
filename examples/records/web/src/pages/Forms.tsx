import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { ItemCard } from '@winterop-com/sokkel-ui/ItemCard'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { go } from 'tidevann-shared/router'

import { FORMS, KIND, PROGRAMS, questionCount, type Form, type FormKind } from '../data/forms'
import { count, KindBadge, useFoot } from '../ui'

const PROGRAM_COLUMNS: DataColumn<Form>[] = [
    {
        id: 'form',
        header: 'Form',
        width: 'minmax(14rem,1fr)',
        cell: (form) => (
            <Stack gap="none">
                <span className="font-medium">{form.title}</span>
                <span className="text-help text-muted-foreground">
                    {form.kind === 'registration'
                        ? 'Registers the household once'
                        : form.repeats === true
                          ? 'Each visit is its own record'
                          : 'One record per household'}
                </span>
            </Stack>
        ),
    },
    { id: 'kind', header: 'Kind', width: '9rem', cell: (form) => <KindBadge form={form} /> },
    { id: 'questions', header: 'Questions', width: '6rem', align: 'end', cell: (form) => questionCount(form) },
    { id: 'code', header: 'Code', width: '8rem', cell: (form) => <span className="font-mono text-xs">{form.id}</span> },
]

function Cards({ kind }: { kind: FormKind }) {
    const forms = FORMS.filter((form) => form.kind === kind)
    return (
        <Section variant="flat" title={KIND[kind].group} meta={String(forms.length)} description={KIND[kind].note}>
            <Columns count={3} min="md" gap="md">
                {forms.map((form) => (
                    <ItemCard
                        key={form.id}
                        title={form.title}
                        code={form.id}
                        description={form.description}
                        href={`#/forms/${form.id}`}
                        status={
                            <>
                                <KindBadge form={form} />
                                <span>{count(questionCount(form), 'question')}</span>
                                {form.period !== undefined && <span>{form.period}</span>}
                            </>
                        }
                    />
                ))}
            </Columns>
        </Section>
    )
}

/** Every form the server serves, grouped by how it is filed: periodic reports, single events, and programs with their registration and follow-ups. */
export function Forms() {
    const programs = Object.entries(PROGRAMS)
    useFoot(
        `${count(FORMS.filter((form) => form.kind === 'periodic').length, 'periodic report')} · ${count(
            FORMS.filter((form) => form.kind === 'event').length,
            'single event',
        )} · ${count(programs.length, 'program')}`,
    )
    return (
        <Page>
            <PageHeader
                title="Forms"
                description="The forms the server serves, grouped by how each is filed: counts for a place over a period, single events, and programs that register a household once and visit it after."
                actions={<ApiLink path="/forms" />}
            />
            <Cards kind="periodic" />
            <Cards kind="event" />
            <Section variant="flat" title="Programs" meta={String(programs.length)} description={KIND.registration.note}>
                {programs.map(([id, program]) => (
                    <Section key={id} title={program.title} description={program.description} flush>
                        <DataTable
                            variant="list"
                            columns={PROGRAM_COLUMNS}
                            rows={FORMS.filter((form) => form.program === id)}
                            rowKey={(form) => form.id}
                            onOpen={(form) => go(`/forms/${form.id}`)}
                            chevron
                            minWidth="auto"
                            rowHeight="auto"
                        />
                    </Section>
                ))}
            </Section>
        </Page>
    )
}
