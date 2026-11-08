import type { TreeNode, TreeTrail } from '@winterop-com/sokkel-ui/Tree'

/**
 * A deep geography generated the same way every time: continents, countries, regions, districts
 * and sites, some fifty thousand sites in all. The district names are built from syllables picked
 * by a hash of their place in the tree, so nothing is random.
 */

const COUNTRIES: Record<string, string[]> = {
    Africa: ['Kenya', 'Ghana', 'Senegal', 'Malawi', 'Rwanda', 'Zambia'],
    Asia: ['Vietnam', 'Nepal', 'Laos', 'Mongolia', 'Bhutan', 'Cambodia'],
    Europe: ['Norway', 'Portugal', 'Iceland', 'Estonia', 'Austria', 'Ireland'],
    'South America': ['Peru', 'Chile', 'Uruguay', 'Bolivia', 'Ecuador', 'Paraguay'],
    Oceania: ['Fiji', 'Samoa', 'Tonga', 'Vanuatu', 'Palau', 'Kiribati'],
}

const REGIONS = ['North', 'South', 'East', 'West', 'Central', 'Coast', 'Highlands', 'Lakes']
const DISTRICTS_PER_REGION = 10
const SITES_PER_DISTRICT = 21

const FIRST = ['Ka', 'Mo', 'Lu', 'Sa', 'Ti', 'Be', 'No', 'Ra', 'Ve', 'Do', 'Mi', 'Ha', 'Pe', 'Zo', 'Ya', 'Ko']
const MIDDLE = ['la', 'ri', 'na', 'mo', 'ste', 'van', 'li', 'ro', 'de', 'ka', 'su', 'ne']
const LAST = ['ra', 'ni', 'do', 'mbe', 'ta', 'lo', 'sa', 'ke', 'ru', 'ga', 'vi', 'ton']

/** A number that is always the same for the same text. */
function hashed(text: string): number {
    let hash = 2166136261
    for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619) >>> 0
    return hash
}

function districtName(id: string): string {
    const hash = hashed(id)
    return FIRST[hash % FIRST.length] + MIDDLE[(hash >>> 4) % MIDDLE.length] + LAST[(hash >>> 9) % LAST.length]
}

const slug = (text: string) => text.toLowerCase().replaceAll(' ', '-')

function build(): TreeNode[] {
    return Object.entries(COUNTRIES).map(([continent, countries]) => {
        const continentId = slug(continent)
        return {
            id: continentId,
            label: continent,
            children: countries.map((country) => {
                const countryId = `${continentId}/${slug(country)}`
                return {
                    id: countryId,
                    label: country,
                    children: REGIONS.map((region) => {
                        const regionId = `${countryId}/${slug(region)}`
                        return {
                            id: regionId,
                            label: region,
                            children: Array.from({ length: DISTRICTS_PER_REGION }, (_, district) => {
                                const districtId = `${regionId}/d${String(district + 1)}`
                                const name = districtName(districtId)
                                return {
                                    id: districtId,
                                    label: name,
                                    meta: String(SITES_PER_DISTRICT),
                                    children: Array.from({ length: SITES_PER_DISTRICT }, (_, site) => ({
                                        id: `${districtId}/s${String(site + 1)}`,
                                        label: `${name} site ${String(site + 1).padStart(2, '0')}`,
                                    })),
                                }
                            }),
                        }
                    }),
                }
            }),
        }
    })
}

let built: TreeNode[] | null = null

/** The whole geography, given at once. */
export function geography(): TreeNode[] {
    built ??= build()
    return built
}

/** Every node of the geography with its ancestors, by id. */
let trails: Map<string, TreeTrail> | null = null
function trailsById(): Map<string, TreeTrail> {
    if (trails !== null) return trails
    const out = new Map<string, TreeTrail>()
    const walk = (list: readonly TreeNode[], ancestors: TreeNode[]) => {
        for (const node of list) {
            out.set(node.id, { node: shallow(node), ancestors })
            walk(node.children ?? [], [...ancestors, shallow(node)])
        }
    }
    walk(geography(), [])
    trails = out
    return out
}

/** A node as a lazy tree hands it over: marked as having children, without them. */
function shallow(node: TreeNode): TreeNode {
    const { children, ...rest } = node
    return children !== undefined && children.length > 0 ? { ...rest, hasChildren: true } : rest
}

/** Every site in the geography. */
export const SITE_COUNT = Object.values(COUNTRIES).flat().length * REGIONS.length * DISTRICTS_PER_REGION * SITES_PER_DISTRICT

/** The continents alone, each marked as having children to load. */
export const GEOGRAPHY_TOP: TreeNode[] = geography().map(shallow)

/** The ids of every node with children, for a story that opens the whole geography. */
export function branchIds(): string[] {
    const out: string[] = []
    const walk = (list: readonly TreeNode[]) => {
        for (const node of list) {
            if (node.children === undefined) continue
            out.push(node.id)
            walk(node.children)
        }
    }
    walk(geography())
    return out
}

/** A node's children as a server would answer: at once, each marked as having children of its own. */
export function loadPlace(node: TreeNode): Promise<readonly TreeNode[]> {
    const full = trailsById().get(node.id)
    const ancestors = full === undefined ? [] : full.ancestors
    let list: readonly TreeNode[] = geography()
    for (const step of [...ancestors, node]) list = list.find((each) => each.id === step.id)?.children ?? []
    return Promise.resolve(list.map(shallow))
}

/**
 * Every place whose name holds the query, with its ancestors, as a server's search would answer: at
 * once, the broadest places first, the first fifty.
 */
export function searchPlaces(query: string): Promise<readonly TreeTrail[]> {
    const needle = query.trim().toLowerCase()
    const out = [...trailsById().values()].filter((trail) => trail.node.label.toLowerCase().includes(needle))
    out.sort((a, b) => a.ancestors.length - b.ancestors.length)
    return Promise.resolve(out.slice(0, 50))
}

/** Where a place sits, by its id, for a choice made before its level is loaded. */
export function trailOf(id: string): TreeTrail {
    const trail = trailsById().get(id)
    if (trail === undefined) throw new Error(`No place ${id}`)
    return trail
}
