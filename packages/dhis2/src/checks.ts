/**
 * Health checks for a DHIS2 server, as data. This module asks nothing of a server: it says which
 * paths to request and what each answer must hold, and the app performs the requests. A check has the
 * shape `evaluateCheck` of `@winterop-com/sokkel-ui-tracking/checks` takes, written out here since an
 * add-on stands on the core alone.
 *
 * Three questions are asked of a server:
 *
 * - whether its base URL answers, with or without a redirect to its sign-in page;
 * - which version it runs: `/api/system/info` gives the version, the revision and the build time to a
 *   signed-in user, and `/api/loginConfig` (DHIS2 2.41 and later) gives the version to anyone;
 * - whether the credentials the app holds sign in: `/api/me`.
 *
 * Every API request is marked as a script's (`X-Requested-With`), so a server answers one it does not
 * let in with 401 and not with its sign-in page. A server answers a script on an origin it does not
 * allow with an empty 200, so each check past the first also expects a value in the body.
 */
import type { WordsPart } from '@winterop-com/sokkel-ui/lib/words'

/** HTTP statuses from one to another, both included. */
export interface Dhis2StatusRange {
    from: number
    to: number
}

/** What a value in the JSON body must be. */
export interface Dhis2JsonExpectation {
    /** The path to the value, keys apart by dots. */
    path: string
    /** What the value must equal. With neither this nor `matches`, the value must only be there. */
    equals?: string | number | boolean | null
    /** A regular expression the value, written as text, must match. */
    matches?: string
}

/** One request to a DHIS2 server and what its answer must be. */
export interface Dhis2Check {
    /** Unique among a server's checks. */
    id: string
    /** What a list writes for it. */
    label: string
    /** The path to request under the server's base URL; empty for the base URL itself. */
    path: string
    /** Headers the request carries. */
    headers?: Readonly<Record<string, string>>
    /** Whether the request is sent with the credentials the app holds for the server. */
    credentials?: boolean
    expect: {
        /** The statuses that pass. */
        status: number | Dhis2StatusRange
        /** Values the JSON body must hold, every one of them. */
        json?: readonly Dhis2JsonExpectation[]
    }
    latency: {
        /** An answer slower than this many milliseconds leaves the server degraded. */
        degraded: number
        /** An answer slower than this many milliseconds counts as none. */
        down: number
    }
    /** Values read from the JSON body to show beside the result, each by the path to it. */
    capture?: Readonly<Record<string, string>>
}

export interface Dhis2CheckWords {
    /** The base URL answering. */
    reachable: string
    /** `/api/loginConfig`. */
    loginConfig: string
    /** `/api/system/info`. */
    systemInfo: string
    /** `/api/me`. */
    me: string
    /** The public demo server, in a list of servers to add. */
    demo: string
}

export const DHIS2_CHECK_WORDS: Dhis2CheckWords = {
    reachable: 'Server answers',
    loginConfig: 'Sign-in settings',
    systemInfo: 'System info',
    me: 'Signed in',
    demo: 'DHIS2 demo',
}

export const DHIS2_CHECK_PART: WordsPart<Dhis2CheckWords> = { id: 'dhis2Check', words: DHIS2_CHECK_WORDS }

/** How long a DHIS2 server may take: slow past two seconds, and no answer past fifteen. */
export const DHIS2_LATENCY: Dhis2Check['latency'] = { degraded: 2000, down: 15_000 }

/** What every API request carries: JSON asked for, and the mark of a script, which turns a redirect to the sign-in page into a 401. */
const API_HEADERS: Readonly<Record<string, string>> = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }

/** A version as a server writes it: `2.43.2.1`, `2.42-SNAPSHOT`. */
const VERSION = '^\\d+\\.\\d+'

export interface Dhis2CheckOptions {
    /**
     * Whether the app holds credentials for the server. With them the checks read `/api/system/info`
     * and `/api/me`; without, they read the version from `/api/loginConfig`.
     */
    credentials?: boolean
    /** The checks' labels, in place of the English ones. */
    words?: Partial<Dhis2CheckWords>
}

/**
 * The checks of one DHIS2 server. Its base URL answering is always one. With credentials, the system
 * info (captured: `version`, `revision`, `buildTime`, `serverDate`, `systemName`) and the signed-in
 * user (`username`, `name`) follow; without, the public sign-in settings give the `version` and the
 * server's `title`, which only DHIS2 2.41 and later answer.
 */
export function dhis2Checks(options: Dhis2CheckOptions = {}): Dhis2Check[] {
    const words = { ...DHIS2_CHECK_WORDS, ...options.words }
    const reachable: Dhis2Check = {
        id: 'dhis2-reachable',
        label: words.reachable,
        path: '',
        expect: { status: { from: 200, to: 399 } },
        latency: DHIS2_LATENCY,
    }
    if (options.credentials !== true)
        return [
            reachable,
            {
                id: 'dhis2-login-config',
                label: words.loginConfig,
                path: '/api/loginConfig',
                headers: API_HEADERS,
                expect: { status: 200, json: [{ path: 'apiVersion', matches: VERSION }] },
                latency: DHIS2_LATENCY,
                capture: { version: 'apiVersion', title: 'applicationTitle' },
            },
        ]
    return [
        reachable,
        {
            id: 'dhis2-system-info',
            label: words.systemInfo,
            path: '/api/system/info',
            headers: API_HEADERS,
            credentials: true,
            expect: { status: 200, json: [{ path: 'version', matches: VERSION }] },
            latency: DHIS2_LATENCY,
            capture: {
                version: 'version',
                revision: 'revision',
                buildTime: 'buildTime',
                serverDate: 'serverDate',
                systemName: 'systemName',
            },
        },
        {
            id: 'dhis2-me',
            label: words.me,
            path: '/api/me?fields=id,username,displayName',
            headers: API_HEADERS,
            credentials: true,
            expect: { status: 200, json: [{ path: 'username' }] },
            latency: DHIS2_LATENCY,
            capture: { username: 'username', name: 'displayName' },
        },
    ]
}

/** DHIS2 as a kind of server to watch: its id, its name and its checks. */
export const DHIS2_KIND: { id: string; label: string; checks: (options?: Dhis2CheckOptions) => Dhis2Check[] } = {
    id: 'dhis2',
    label: 'DHIS2',
    checks: dhis2Checks,
}

/** A DHIS2 server to watch, as an app keeps one and a quick-add list offers one. */
export interface Dhis2Target {
    id: string
    label: string
    /** The id of its kind, `dhis2`. */
    kind: string
    /** Its base URL. */
    url: string
}

/**
 * The public demo server, for a list of servers to add. Its address redirects to the stable release
 * of the day, on another host, and a client drops credentials across such a redirect: follow it once
 * and check the address it leads to. It carries no credentials; the app asks for them.
 */
export const DHIS2_DEMO: Dhis2Target = {
    id: 'dhis2-demo',
    label: DHIS2_CHECK_WORDS.demo,
    kind: DHIS2_KIND.id,
    url: 'https://play.dhis2.org/demo',
}

/** What a server answers one check with: its status and its body, as text or as a value written as JSON. */
export interface Dhis2SampleAnswer {
    status: number
    body?: unknown
}

/**
 * What a DHIS2 server that is well answers each check with, by the check's id, for an example, a
 * story or a test with no server at hand. Every check of `dhis2Checks`, with or without
 * credentials, passes on its answer here.
 */
export const DHIS2_SAMPLE_ANSWERS: Readonly<Record<string, Dhis2SampleAnswer>> = {
    'dhis2-reachable': { status: 200, body: '<!doctype html><html><head><title>DHIS2</title></head><body></body></html>' },
    'dhis2-login-config': { status: 200, body: { apiVersion: '2.42.2', applicationTitle: 'DHIS2 Demo', selfRegistrationEnabled: false } },
    'dhis2-system-info': {
        status: 200,
        body: {
            version: '2.42.2',
            revision: '7a1c2e9',
            buildTime: '2026-10-28T09:14:00.000',
            serverDate: '2026-11-20T17:00:00.000',
            systemName: 'DHIS2 Demo',
        },
    },
    'dhis2-me': { status: 200, body: { id: 'xE7jOejl9FI', username: 'ada', displayName: 'Ada' } },
}
