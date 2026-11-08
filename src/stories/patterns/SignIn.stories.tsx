import type { Meta, StoryObj } from '@storybook/react-vite'
import { Radio } from 'lucide-react'
import { useEffect, useState } from 'react'

import { SignIn, type SignInProbe, type SignInValues } from '@winterop-com/sokkel-ui/SignIn'
import { FlowLines, LevelBars } from '@winterop-com/sokkel-ui/SignInArt'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TidevannMark } from '../fixtures/TidevannMark'

/** A sign-in screen: the brand pane with its art, mark and facts beside the form. */
const meta: Meta = { title: 'Patterns/Sign in' }
export default meta

const FACTS = [
    { label: 'instance', value: 'tidevann.example.org' },
    { label: 'version', value: '1.4.2' },
]

const BRAND = {
    mark: <TidevannMark />,
    name: 'Tidevann',
    facts: FACTS,
    eyebrow: 'Welcome to Tidevann',
    description: 'Enter your credentials to continue.',
}

/**
 * A username and a password over the flow lines, the seam between the panes draggable. Sending
 * the password "tide" signs in; any other is refused.
 */
export const Password: StoryObj = {
    render: function Render() {
        const [error, setError] = useState<string | undefined>()
        const submit = (values: SignInValues) =>
            setError(values.password === 'tide' ? undefined : 'That username and password do not match.')
        return <SignIn {...BRAND} art={<FlowLines />} resizable remember error={error} onSubmit={submit} />
    },
}

/** One field for an access token, with the server's address above it, over the level bars. */
export const Token: StoryObj = {
    render: () => (
        <SignIn
            {...BRAND}
            art={<LevelBars />}
            method="token"
            server
            defaultValues={{ server: 'https://tidevann.example.org' }}
            description="Paste a token from your settings on another device."
            onSubmit={() => undefined}
        />
    ),
}

/** The fields without their leading icons, the server's address over them. */
export const NoIcons: StoryObj = {
    name: 'No icons',
    render: () => (
        <SignIn
            {...BRAND}
            art={<FlowLines seed={4} />}
            icons={false}
            server
            defaultValues={{ server: 'https://tidevann.example.org' }}
            onSubmit={() => undefined}
        />
    ),
}

/**
 * A server whose accounts may have no password: the password is marked optional, and the form can be
 * sent with the username alone.
 */
export const NoPassword: StoryObj = {
    name: 'No password',
    render: () => <SignIn {...BRAND} art={<FlowLines />} optional="password" defaultValues={{ user: 'ada' }} onSubmit={() => undefined} />,
}

/**
 * A server that may need no credentials at all: the username and password are both marked optional,
 * and the form can be sent with the server's address alone.
 */
export const NoCredentials: StoryObj = {
    name: 'No credentials',
    render: () => (
        <SignIn
            {...BRAND}
            art={<LevelBars seed={5} />}
            server
            optional="credentials"
            defaultValues={{ server: 'https://tidevann.example.org' }}
            description="Say where the server is, and who you are if it asks."
            onSubmit={() => undefined}
        />
    ),
}

/** Another way in under the rule, full width. */
export const Alternatives: StoryObj = {
    render: () => (
        <SignIn
            {...BRAND}
            art={<LevelBars seed={12} />}
            description="Sign in, or look on without an account."
            alternatives={
                <Button variant="outline">
                    <Radio data-icon="inline-start" aria-hidden />
                    Watch the harbor board without signing in
                </Button>
            }
            onSubmit={() => undefined}
        />
    ),
}

/** The last try refused, the reason over the submit. */
export const Refused: StoryObj = {
    render: () => (
        <SignIn
            {...BRAND}
            art={<FlowLines />}
            defaultValues={{ user: 'ada' }}
            error="That username and password do not match."
            onSubmit={() => undefined}
        />
    ),
}

/** A try under way: the fields held and the submit saying so. */
export const Busy: StoryObj = {
    render: () => (
        <SignIn {...BRAND} art={<FlowLines />} busy defaultValues={{ user: 'ada', password: 'tidewater' }} onSubmit={() => undefined} />
    ),
}

/** The client's own version, under what answered at the server's address. */
const CLIENT = [{ label: 'client', value: '2.3.0' }]

/** The servers that answer in these stories, by host, with the version each answers with. */
const SERVERS: Record<string, string> = {
    'tidevann.example.org': '1.4.2',
    'harbor.example.org': '1.5.0',
    'juniper.example.org': '1.3.9',
}

/** The version a server answers with at an address, or nothing when none answers there. */
const versionAt = (address: string): string | undefined =>
    SERVERS[
        address
            .trim()
            .replace(/^https?:\/\//, '')
            .replace(/\/+$/, '')
    ]

const NO_VALUES: SignInValues = { server: '', user: '', password: '', token: '', remember: false }

/**
 * The app holding the values and asking the server's address a moment after the typing pauses, the
 * brand pane saying what answered there; the submit waits while the address is asked. Tidevann,
 * harbor and juniper on example.org answer; any other address does not.
 */
function Probing({ found = false, address }: { found?: boolean; address: string }) {
    const [values, setValues] = useState<SignInValues>({ ...NO_VALUES, server: address })
    const [heard, setHeard] = useState({ server: address, version: versionAt(address) })
    const typed = values.server.trim()
    useEffect(() => {
        if (typed === heard.server) return
        const timer = setTimeout(() => setHeard({ server: typed, version: versionAt(typed) }), 600)
        return () => clearTimeout(timer)
    }, [typed, heard.server])
    const probe: SignInProbe | undefined =
        typed === ''
            ? undefined
            : typed !== heard.server
              ? { server: typed, state: 'asking' }
              : heard.version === undefined
                ? { server: typed, state: 'silent' }
                : { server: typed, state: 'answered', version: heard.version }
    return (
        <SignIn
            {...BRAND}
            facts={CLIENT}
            art={<FlowLines seed={7} />}
            server={found ? 'found' : true}
            values={values}
            onValuesChange={setValues}
            probe={probe}
            ready={probe?.state !== 'asking'}
            onSubmit={() => undefined}
        />
    )
}

/**
 * The app looking for its server before anyone types one: the server line says so in the field's
 * place, and the submit waits.
 */
export const Waiting: StoryObj = {
    render: () => <SignIn {...BRAND} facts={CLIENT} art={<FlowLines seed={7} />} server="looking" onSubmit={() => undefined} />,
}

/**
 * The server found without typing: the brand pane names it and its version, and a link stands in the
 * field's place to connect to a different one, which brings the field back.
 */
export const Found: StoryObj = { render: () => <Probing found address="https://tidevann.example.org" /> }

/**
 * A typed address asked as it is typed: harbor answered, so the brand pane gives its version. Type
 * another to see it asked again.
 */
export const Probe: StoryObj = { name: 'Probing', render: () => <Probing address="https://harbor.example.org" /> }

/** A typed address where nothing answered: the brand pane, and the bar on a phone, say so. */
export const NoAnswer: StoryObj = { name: 'No answer', render: () => <Probing address="https://larkspur.example.org" /> }

/** The brand pane in the page's scheme rather than dark, a third of the width, with no art. */
export const PageScheme: StoryObj = {
    name: 'Page scheme',
    render: () => <SignIn {...BRAND} brandScheme="page" brandWidth="36%" onSubmit={() => undefined} />,
}

/**
 * In a desktop window with its title bar hidden: the brand pane drags the window, outlined here,
 * and the window's buttons sit over its corner, clear of the mark; on a narrow window the bar
 * over the form leaves them room at its start.
 */
export const Desktop: StoryObj = {
    parameters: { desktopWindow: true },
    render: () => <SignIn {...BRAND} art={<FlowLines />} desktop={{ trafficLights: true }} onSubmit={() => undefined} />,
}
