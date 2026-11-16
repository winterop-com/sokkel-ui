import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { pagePolicyVite } from 'tidevann-shared/vite'
import { defineConfig } from 'vite'

/** Relative asset paths, so the build also loads from a file:// URL in the desktop shells. */
export default defineConfig({
    base: './',
    plugins: [react(), tailwindcss(), pagePolicyVite()],
})
