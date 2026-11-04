import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Page } from '@playwright/test'

/** Where recorded basemap tiles live, by host and path. */
export const TILE_DIR = fileURLToPath(new URL('./tiles', import.meta.url))

/** The hosts the basemap presets reach: style documents, tiles, fonts and sprites. */
const TILE_HOSTS = /^https:\/\/(?:tiles\.openfreemap\.org|gibs\.earthdata\.nasa\.gov)\//

const TYPES: Record<string, string> = {
    '.json': 'application/json',
    '.pbf': 'application/x-protobuf',
    '.png': 'image/png',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
}

/** The file a response is kept in; a path without an extension is a JSON document. */
function tileFile(address: string): string {
    const path = decodeURIComponent(new URL(address).pathname)
    const named = /\.[a-z]+$/.test(path) ? path : `${path}.json`
    return join(TILE_DIR, new URL(address).hostname, named)
}

/**
 * Serves basemap tiles from `e2e/tiles`, so a story over a real basemap draws the same every run and
 * reaches no network. With `record`, a tile not on disk yet is fetched and saved first; without
 * it, a missing tile answers 404 and the ground shows where it would have been.
 */
export async function routeTiles(page: Page, record: boolean): Promise<void> {
    await page.route(TILE_HOSTS, async (route) => {
        const file = tileFile(route.request().url())
        if (!existsSync(file)) {
            if (!record) return route.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' }, body: '' })
            let response = await route.fetch().catch(() => null)
            for (let attempt = 1; attempt < 4 && (response === null || !response.ok()); attempt += 1) {
                await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
                response = await route.fetch().catch(() => null)
            }
            if (response === null) return route.abort()
            if (!response.ok()) return route.fulfill({ response })
            mkdirSync(dirname(file), { recursive: true })
            writeFileSync(file, await response.body())
        }
        return route.fulfill({
            status: 200,
            contentType: TYPES[file.slice(file.lastIndexOf('.'))] ?? 'application/octet-stream',
            headers: { 'access-control-allow-origin': '*', 'cache-control': 'no-store' },
            body: readFileSync(file),
        })
    })
}

/** Resolves once every map on the page has drawn what it was given and nothing is loading. */
export async function mapsSettled(page: Page): Promise<void> {
    await page.waitForFunction(() => [...document.querySelectorAll('[data-map-view]')].every((map) => map.hasAttribute('data-map-idle')))
}
