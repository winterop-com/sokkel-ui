import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { sokkelStyles } from '@winterop-com/sokkel-ui/vite'
import { pagePolicyVite } from 'tidevann-shared/vite'
import { defineConfig } from 'vite'

/**
 * Relative asset paths, so the build also loads from a file:// URL in the desktop shells. The
 * library's plugin points Tailwind at the modules the app and the shared parts import alone.
 */
export default defineConfig({
    base: './',
    plugins: [react(), sokkelStyles(), tailwindcss(), pagePolicyVite({ generatedCode: true })],
})
