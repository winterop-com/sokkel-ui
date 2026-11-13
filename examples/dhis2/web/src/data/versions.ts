/**
 * The versions the simulated server can run as, and the function and variable names each knows. The
 * latest knows every name the dhis2 package lists; each older one lacks a few that came later on
 * this simulated server. The app reads a version's names from here, as a real app would read them
 * from its server, and installs the plugin with them.
 */
import { DHIS2_FUNCTIONS, DHIS2_VARIABLES, type Dhis2Names } from '@winterop-com/sokkel-ui-dhis2/names'

export const VERSIONS = ['2.41', '2.42', '2.43', '2.44'] as const
export type Version = (typeof VERSIONS)[number]
export const LATEST: Version = '2.44'

/** The version each name came in on this simulated server; a name not listed is in every version. */
export const ADDED: Readonly<Record<string, Version>> = {
    removeZeros: '2.42',
    containsItems: '2.42',
    'd2:containsItems': '2.42',
    'd2:countIfZeroPos': '2.42',
    scheduled_event_count: '2.42',
    '.stageOffset': '2.43',
    'd2:minutesBetween': '2.43',
    org_unit_count: '2.43',
    'd2:extractDataMatrixValue': '2.44',
    'd2:inUserGroup': '2.44',
    analytics_period_end: '2.44',
    analytics_period_start: '2.44',
}

const known = (name: string, version: Version) => VERSIONS.indexOf(ADDED[name] ?? VERSIONS[0]) <= VERSIONS.indexOf(version)

/** The function and variable names a version knows. */
export function namesOf(version: Version): Required<Dhis2Names> {
    return {
        functions: DHIS2_FUNCTIONS.filter((name) => known(name, version)),
        variables: DHIS2_VARIABLES.filter((name) => known(name, version)),
    }
}
