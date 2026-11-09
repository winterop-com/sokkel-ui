import { SignIn } from '@winterop-com/sokkel-ui/SignIn'
import { FlowLines } from '@winterop-com/sokkel-ui/SignInArt'
import { useState } from 'react'

import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { PEOPLE, type Person } from './model'
import { useConsole } from './state'

/** The console's door after signing out: ada, grace, linus or margaret sign in with the password "tide". */
export function SignInPage({ frame }: { frame: Frame }) {
    const { setPrefs } = useConsole()
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | undefined>()
    return (
        <SignIn
            mark={<TidevannMark />}
            name="Tidevann"
            eyebrow="Welcome to Tidevann"
            description="Sign in as ada, grace, linus or margaret, with the password tide."
            facts={[
                { label: 'instance', value: 'tidevann.example.org' },
                { label: 'console', value: 'jobs and runs' },
            ]}
            art={<FlowLines />}
            remember
            rememberKey="tidevann-demo:user"
            busy={busy}
            error={error}
            desktop={frame.desktop}
            onSubmit={(values) => {
                setError(undefined)
                setBusy(true)
                const user = values.user.trim().toLowerCase()
                window.setTimeout(() => {
                    if ((PEOPLE as readonly string[]).includes(user) && values.password === 'tide') {
                        void setPrefs({ user: user as Person })
                    } else {
                        setBusy(false)
                        setError('That username and password do not match.')
                    }
                }, 600)
            }}
        />
    )
}
