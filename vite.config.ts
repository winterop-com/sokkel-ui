import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const packages = fileURLToPath(new URL('./packages', import.meta.url))

/**
 * Each package's modules by the names an app imports them by, read from their sources, so Storybook
 * and the tests run the code as written without a build. The same paths as each package's `exports`.
 */
export const alias = [
    { find: /^@winterop-com\/sokkel-ui\/primitives\/(.+)$/, replacement: `${packages}/core/src/components/ui/$1` },
    { find: /^@winterop-com\/sokkel-ui\/hooks\/(.+)$/, replacement: `${packages}/core/src/hooks/$1` },
    { find: /^@winterop-com\/sokkel-ui\/lib\/(.+)$/, replacement: `${packages}/core/src/lib/$1` },
    { find: /^@winterop-com\/sokkel-ui\/([^.]+)$/, replacement: `${packages}/core/src/components/$1` },
    { find: /^@winterop-com\/sokkel-ui-(charts|maps|graph|terminal|media)\/([^.]+)$/, replacement: `${packages}/$1/src/$2` },
    { find: '@', replacement: `${packages}/core/src` },
]

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: { alias },
})
