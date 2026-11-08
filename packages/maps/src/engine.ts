/**
 * maplibre, its stylesheet and its worker: what `MapView` loads the first time a map is drawn. It
 * is reached only by a dynamic import, so a page that shows no map fetches none of it, and a page
 * that does draws its frame before the engine arrives.
 */
import 'maplibre-gl/dist/maplibre-gl.css'

import { Map, getWorkerUrl, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

/** Points maplibre at its worker, bundled beside the app. */
export function ensureWorker(): void {
    if (getWorkerUrl() !== workerUrl) setWorkerUrl(workerUrl)
}

export { Map }
