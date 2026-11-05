import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'

import { ChipInput } from '../../components/ChipInput'
import { Field, describedBy } from '../../components/Field'
import { PermissionMatrix, type Grants, type MatrixGroup, type MatrixRole } from '../../components/PermissionMatrix'
import { SaveBar } from '../../components/SaveBar'
import { SecretReveal } from '../../components/SecretReveal'
import { TooltipProvider } from '../../components/ui/tooltip'

/** The parts of an app's access screens: addresses as chips, a secret shown once, unsaved edits, and roles against permissions. */
function Ground({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
    return (
        <TooltipProvider>
            <div className="min-h-svh bg-background p-6 text-foreground">
                <div className={wide ? 'flex flex-col gap-6' : 'flex max-w-lg flex-col gap-6'}>{children}</div>
            </div>
        </TooltipProvider>
    )
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Chips() {
    const [emails, setEmails] = useState(['ada@example.org', 'grace@example.org'])
    const [hosts, setHosts] = useState(['api.example.org', 'worker-1.example.org', 'scheduler'])
    const [empty, setEmpty] = useState<string[]>([])
    return (
        <Ground>
            <Field id="emails" label="Email addresses" help="Separate them with commas or spaces, or paste a list.">
                <ChipInput
                    id="emails"
                    values={emails}
                    onChange={setEmails}
                    validate={(value) => EMAIL.test(value)}
                    describedBy={describedBy('emails', { help: true })}
                />
            </Field>
            <Field id="hosts" label="Allowed hosts" hint="one refused">
                <ChipInput
                    id="hosts"
                    values={hosts}
                    onChange={setHosts}
                    validate={(value) => value.includes('.')}
                    mono
                    words={{ invalid: () => 'A host needs a domain: scheduler.example.org' }}
                />
            </Field>
            <Field id="cc" label="Copy to">
                <ChipInput id="cc" values={empty} onChange={setEmpty} placeholder="name@example.org" />
            </Field>
        </Ground>
    )
}

const ROLES: MatrixRole[] = [
    { id: 'admin', label: 'Admin', locked: true, note: '1 member' },
    { id: 'viewer', label: 'Viewer', locked: true, note: '3 members' },
    { id: 'operator', label: 'Operator', note: '1 member' },
]

const GROUPS: MatrixGroup[] = [
    {
        id: 'runs',
        label: 'Runs',
        permissions: [
            { id: 'runs:read', label: 'View runs and logs', code: 'runs:read' },
            { id: 'runs:start', label: 'Start and cancel', code: 'runs:start' },
        ],
    },
    {
        id: 'secrets',
        label: 'Secrets',
        permissions: [
            { id: 'secrets:list', label: 'See names', code: 'secrets:list' },
            { id: 'secrets:read', label: 'Read values', code: 'secrets:read', description: 'Shown in a step that uses them' },
        ],
    },
]

const SAVED: Grants = {
    admin: ['runs:read', 'runs:start', 'secrets:list', 'secrets:read'],
    viewer: ['runs:read', 'secrets:list'],
    operator: ['runs:read', 'secrets:list'],
}

function Matrix() {
    const [grants, setGrants] = useState<Grants>({ ...SAVED, operator: ['runs:read', 'runs:start', 'secrets:list'] })
    return (
        <Ground wide>
            <PermissionMatrix
                roles={ROLES}
                groups={GROUPS}
                value={grants}
                saved={SAVED}
                onChange={(role, permission, granted) =>
                    setGrants({
                        ...grants,
                        [role]: granted ? [...grants[role], permission] : grants[role].filter((id) => id !== permission),
                    })
                }
            />
        </Ground>
    )
}

function Saving() {
    const [count, setCount] = useState(3)
    return (
        <TooltipProvider>
            <div className="flex h-svh flex-col bg-background text-foreground">
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="flex min-h-full flex-col">
                        <div className="flex-1 p-6 text-sm text-muted-foreground">The page's content scrolls over the bar.</div>
                        <SaveBar count={count} onSave={() => setCount(0)} onDiscard={() => setCount(0)} />
                    </div>
                </div>
            </div>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Patterns/Access' }
export default meta

/** Addresses as chips, one field refusing an entry, and an empty one with its placeholder. */
export const ChipField: StoryObj = { name: 'Chip input', render: () => <Chips /> }

/** A token shown once, with its copy button and the warning that it will not be shown again. */
export const Secret: StoryObj = {
    name: 'Secret reveal',
    render: () => (
        <Ground>
            <SecretReveal value="tdv_test_0000000000000000" label="release-bot" note="Keep it in a secret store, not in code." />
        </Ground>
    ),
}

/** Three unsaved edits held at the foot of the page, with Discard and Save. */
export const Unsaved: StoryObj = { name: 'Save bar', render: () => <Saving /> }

/** Two built-in roles read-only and a custom one with two boxes changed since it was saved. */
export const Permissions: StoryObj = { name: 'Permission matrix', render: () => <Matrix /> }
