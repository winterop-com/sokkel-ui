import type { Meta, StoryObj } from '@storybook/react-vite'
import { Eye } from 'lucide-react'
import { useEffect, useState } from 'react'

import { SignIn, type SignInValues } from '@winterop-com/sokkel-ui/SignIn'
import { FlowLines, LevelBars } from '@winterop-com/sokkel-ui/SignInArt'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TidevannMark } from '../fixtures/TidevannMark'
import { RunsPage } from '../RunsPage'

/**
 * Tidevann's door: the sign-in screen, and the runs page it opens onto. The viewport toolbar shows
 * it on a phone, where the brand pane becomes a bar over the form.
 */
const meta: Meta = { title: 'Apps/Sign in' }
export default meta

const BRAND = {
    mark: <TidevannMark />,
    name: 'Tidevann',
    eyebrow: 'Welcome to Tidevann',
    facts: [
        { label: 'instance', value: 'tidevann.example.org' },
        { label: 'version', value: '1.4.2' },
    ],
}

/**
 * The sign-in, then the app: any username with the password "tide" signs in after a moment; any
 * other is refused, and focus goes back to the password. A username that signs in is filled in next
 * time, and the seam's dragged width is kept until a double click puts it back.
 */
function Door({ signedIn: start = false, method = 'password' }: { signedIn?: boolean; method?: 'password' | 'token' }) {
    const [signedIn, setSignedIn] = useState(start)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | undefined>()
    const [tried, setTried] = useState<SignInValues | null>(null)
    useEffect(() => {
        if (tried === null) return
        const timer = setTimeout(() => {
            setBusy(false)
            if (tried.password === 'tide' || tried.token.startsWith('tdv_')) setSignedIn(true)
            else setError(method === 'token' ? 'That token is not valid, or has expired.' : 'That username and password do not match.')
            setTried(null)
        }, 800)
        return () => clearTimeout(timer)
    }, [tried, method])
    if (signedIn) return <RunsPage />
    return (
        <SignIn
            {...BRAND}
            art={method === 'token' ? <LevelBars /> : <FlowLines />}
            method={method}
            description={method === 'token' ? 'Paste a token from Settings, Access tokens.' : 'Enter your credentials to continue.'}
            remember={method === 'password'}
            rememberKey={method === 'password' ? 'tidevann.sign-in.user' : undefined}
            resizable
            widthKey="tidevann.sign-in.width"
            busy={busy}
            error={error}
            onSubmit={(values) => {
                setError(undefined)
                setBusy(true)
                setTried(values)
            }}
        />
    )
}

/** A username and a password over the flow lines. */
export const Password: StoryObj = { render: () => <Door /> }

/** One field for an access token, over the level bars; a token starting tdv_ signs in. */
export const Token: StoryObj = { render: () => <Door method="token" /> }

/** Another way in under the rule: the public board, without an account. */
export const AnotherWay: StoryObj = {
    name: 'Another way',
    render: () => (
        <SignIn
            {...BRAND}
            art={<LevelBars seed={12} />}
            description="Sign in to run jobs, or look on without an account."
            alternatives={
                <Button variant="outline">
                    <Eye data-icon="inline-start" aria-hidden />
                    Watch the public board
                </Button>
            }
            onSubmit={() => undefined}
        />
    ),
}

/** The moment after signing in: the runs page in the shell. */
export const SignedIn: StoryObj = { name: 'Signed in', render: () => <Door signedIn /> }
