// The evaluator the checks are written for, in the tests alone: the module itself stands on the core.
import {
    checkUrl,
    combineResults,
    evaluateCheck,
    type Check,
    type CheckKind,
    type CheckTarget,
} from '@winterop-com/sokkel-ui-tracking/checks'
import { describe, expect, it } from 'vitest'

import { DHIS2_CHECK_PART, DHIS2_CHECK_WORDS, DHIS2_DEMO, DHIS2_KIND, DHIS2_LATENCY, dhis2Checks } from './checks'

/** 20 November 2026, 18:40:00 UTC. */
const AT = 1_795_200_000_000

// Shaped as a server answers `/api/system/info` to a signed-in user, with an invented server.
const SYSTEM_INFO = {
    contextPath: 'https://dhis2.example.org/harbor',
    userAgent: 'checks/1.0',
    calendar: 'iso8601',
    dateFormat: 'yyyy-mm-dd',
    serverDate: '2026-11-20T18:40:00.412',
    serverTimeZoneId: 'Etc/UTC',
    serverTimeZoneDisplayName: 'Coordinated Universal Time',
    lastAnalyticsTableSuccess: '2026-11-20T02:13:28.343',
    intervalSinceLastAnalyticsTableSuccess: '16 h, 26 m, 32 s',
    lastAnalyticsTableRuntime: '5 m, 17 s',
    version: '2.43.2.1',
    revision: 'a1b2c3d',
    buildTime: '2026-10-28T09:41:33.000',
    jasperReportsVersion: '6.3.1',
    environmentVariable: 'DHIS2_HOME',
    databaseInfo: { spatialSupport: true, time: '2026-11-20 18:40:00.4' },
    encryption: false,
    emailConfigured: false,
    redisEnabled: false,
    systemId: '7c1d6a0e-5b1f-4a64-9d8e-0f2b6c3a4e10',
    systemName: 'Tidevann harbor',
    instanceBaseUrl: 'https://dhis2.example.org/harbor',
    isMetadataVersionEnabled: true,
}

// Shaped as a server answers `/api/me?fields=id,username,displayName`.
const ME = { id: 'xE7jOejl9FI', username: 'ada', displayName: 'Ada Lovelace' }

// As the public demo server answers `/api/loginConfig`, which takes no credentials, cut to a few fields.
const LOGIN_CONFIG = {
    apiVersion: '2.43.2.1',
    applicationTitle: 'DHIS 2 Demo - Sierra Leone',
    applicationDescription: 'Welcome to the DHIS 2 demo application',
    countryFlag: 'sierra_leone',
    uiLocale: 'en',
    loginPageLayout: 'DEFAULT',
    minPasswordLength: '8',
    maxPasswordLength: '72',
    emailConfigured: false,
    selfRegistrationEnabled: true,
    allowAccountRecovery: true,
}

// As a server answers a script it does not let in.
const UNAUTHORIZED = { httpStatus: 'Unauthorized', httpStatusCode: 401, status: 'ERROR', message: 'Unauthorized' }

const json = (body: unknown, status = 200, latency = 180) => ({ at: AT, status, latency, body: JSON.stringify(body) })

describe('the words', () => {
    it('label every check and the demo server', () => {
        expect(DHIS2_CHECK_PART).toEqual({ id: 'dhis2Check', words: DHIS2_CHECK_WORDS })
        expect(dhis2Checks({ credentials: true }).map((check) => check.label)).toEqual(['Server answers', 'System info', 'Signed in'])
        expect(dhis2Checks().map((check) => check.label)).toEqual(['Server answers', 'Sign-in settings'])
        expect(dhis2Checks({ words: { reachable: 'Answers' } })[0].label).toBe('Answers')
    })
})

describe('the checks of a server', () => {
    it('are checks the evaluator takes, and DHIS2 a kind of server it lists', () => {
        const checks: Check[] = dhis2Checks({ credentials: true })
        const kind: CheckKind = DHIS2_KIND
        expect(checks.map((check) => check.id)).toEqual(['dhis2-reachable', 'dhis2-system-info', 'dhis2-me'])
        expect(kind.checks({ credentials: true })).toEqual(checks)
        expect(kind).toMatchObject({ id: 'dhis2', label: 'DHIS2' })
    })

    it('ask for the system info and the user only with credentials', () => {
        expect(dhis2Checks().map((check) => [check.id, check.path, check.credentials])).toEqual([
            ['dhis2-reachable', '', undefined],
            ['dhis2-login-config', '/api/loginConfig', undefined],
        ])
        expect(dhis2Checks({ credentials: true }).map((check) => [check.id, check.path, check.credentials])).toEqual([
            ['dhis2-reachable', '', undefined],
            ['dhis2-system-info', '/api/system/info', true],
            ['dhis2-me', '/api/me?fields=id,username,displayName', true],
        ])
    })

    it('mark each API request as a script asking for JSON', () => {
        const [reachable, ...api] = dhis2Checks({ credentials: true })
        expect(reachable.headers).toBeUndefined()
        for (const check of [...api, dhis2Checks()[1]])
            expect(check.headers).toEqual({ Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' })
    })

    it('judge every answer by the same latency', () => {
        for (const check of [...dhis2Checks(), ...dhis2Checks({ credentials: true })]) expect(check.latency).toEqual(DHIS2_LATENCY)
        const [reachable] = dhis2Checks()
        expect(evaluateCheck(reachable, { at: AT, status: 200, latency: 2400 })).toMatchObject({
            status: 'degraded',
            failure: { reason: 'latency' },
        })
        expect(evaluateCheck(reachable, { at: AT, status: 200, latency: 15_001 }).status).toBe('down')
    })
})

describe('a server that answers', () => {
    const [reachable, systemInfo, me] = dhis2Checks({ credentials: true })

    it('is reachable when its base URL answers, with its sign-in page or a redirect to it', () => {
        expect(evaluateCheck(reachable, { at: AT, status: 200, latency: 140, body: '<!doctype html><title>DHIS2</title>' }).status).toBe(
            'up',
        )
        expect(evaluateCheck(reachable, { at: AT, status: 302, latency: 90 }).status).toBe('up')
        expect(evaluateCheck(reachable, { at: AT, status: 502, latency: 30 })).toMatchObject({
            status: 'down',
            failure: { reason: 'status', expected: '200-399', actual: '502' },
        })
        expect(evaluateCheck(reachable, { at: AT, error: 'timeout' }).failure).toEqual({ reason: 'unreachable', actual: 'timeout' })
    })

    it('gives the version, the revision and the build time from the system info', () => {
        expect(evaluateCheck(systemInfo, json(SYSTEM_INFO))).toEqual({
            check: 'dhis2-system-info',
            status: 'up',
            at: AT,
            latency: 180,
            httpStatus: 200,
            values: {
                version: '2.43.2.1',
                revision: 'a1b2c3d',
                buildTime: '2026-10-28T09:41:33.000',
                serverDate: '2026-11-20T18:40:00.412',
                systemName: 'Tidevann harbor',
            },
        })
        expect(evaluateCheck(systemInfo, json({ ...SYSTEM_INFO, version: '2.44-SNAPSHOT', revision: undefined })).values).toMatchObject({
            version: '2.44-SNAPSHOT',
        })
    })

    it('gives the signed-in user', () => {
        expect(evaluateCheck(me, json(ME))).toMatchObject({ status: 'up', values: { username: 'ada', name: 'Ada Lovelace' } })
    })

    it('is down for credentials the server does not take', () => {
        for (const check of [systemInfo, me])
            expect(evaluateCheck(check, json(UNAUTHORIZED, 401))).toMatchObject({
                status: 'down',
                httpStatus: 401,
                failure: { reason: 'status', expected: '200', actual: '401' },
            })
    })

    it('is down for a sign-in page or an empty answer in place of the JSON', () => {
        const page = evaluateCheck(systemInfo, { at: AT, status: 200, latency: 150, body: '<!doctype html><title>DHIS2</title>' })
        expect(page).toMatchObject({ status: 'down', failure: { reason: 'json', path: 'version' } })
        // What a server answers a script on an origin it does not allow.
        expect(evaluateCheck(me, { at: AT, status: 200, latency: 150, body: '' }).failure).toMatchObject({
            reason: 'json',
            path: 'username',
        })
        expect(evaluateCheck(systemInfo, json({ ...SYSTEM_INFO, version: 'unknown' })).failure).toMatchObject({
            reason: 'json',
            path: 'version',
            actual: 'unknown',
        })
    })

    it('gives the version without credentials, from the sign-in settings', () => {
        const [, loginConfig] = dhis2Checks()
        expect(evaluateCheck(loginConfig, json(LOGIN_CONFIG))).toMatchObject({
            status: 'up',
            values: { version: '2.43.2.1', title: 'DHIS 2 Demo - Sierra Leone' },
        })
        // A server older than 2.41 has no such settings to give.
        expect(evaluateCheck(loginConfig, json({ httpStatus: 'Not Found', httpStatusCode: 404, status: 'ERROR' }, 404)).status).toBe('down')
    })

    it('stands as its worst check does', () => {
        const round = [
            evaluateCheck(reachable, { at: AT, status: 200, latency: 140 }),
            evaluateCheck(systemInfo, json(SYSTEM_INFO)),
            evaluateCheck(me, json(UNAUTHORIZED, 401)),
        ]
        expect(combineResults(round)).toEqual({ status: 'down', at: AT, latency: 180 })
    })
})

describe('the demo server', () => {
    it('is a server to add, of the DHIS2 kind, with no credentials', () => {
        const target: CheckTarget = DHIS2_DEMO
        expect(target).toEqual({ id: 'dhis2-demo', label: 'DHIS2 demo', kind: 'dhis2', url: 'https://play.dhis2.org/demo' })
        expect(JSON.stringify(DHIS2_DEMO)).not.toMatch(/password|username|admin|district|token/i)
    })

    it('has its checks requested under its address', () => {
        expect(dhis2Checks({ credentials: true }).map((check) => checkUrl(DHIS2_DEMO.url, check))).toEqual([
            'https://play.dhis2.org/demo',
            'https://play.dhis2.org/demo/api/system/info',
            'https://play.dhis2.org/demo/api/me?fields=id,username,displayName',
        ])
    })
})
