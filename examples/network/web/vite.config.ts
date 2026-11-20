import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { mapsVite } from '@winterop-com/sokkel-ui-maps/vite'
import { pagePolicyVite } from 'tidevann-shared/vite'
import { defineConfig } from 'vite'

import { geoliteVite } from './server/vite-geolite.ts'

/** Where `scripts/geolite.sh` puts the GeoLite2 City file; it is never committed. */
const GEOLITE = fileURLToPath(new URL('../geolite/GeoLite2-City.mmdb', import.meta.url))

/** Relative asset paths, so the build also loads from a file:// URL in the desktop shells. */
export default defineConfig({
    base: './',
    plugins: [react(), tailwindcss(), pagePolicyVite(), mapsVite(), geoliteVite(GEOLITE)],
})
