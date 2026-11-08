import type { Plugin } from 'vite'

import { library } from '../../vite.lib.ts'
import { appearanceScriptFile } from './src/lib/appearance.ts'

/**
 * Writes `dist/appearance.js`, the script that wears the kept look before the page draws, as a file
 * for a page that refuses inline script. It is `appearanceScriptFile()`, the same script
 * `appearanceScript()` writes inline, so the two never part.
 */
function appearanceFile(): Plugin {
    return {
        name: 'appearance-file',
        generateBundle() {
            this.emitFile({ type: 'asset', fileName: 'appearance.js', source: `${appearanceScriptFile()}\n` })
        },
    }
}

// A module's list of sources is named as the `exports` map names the module: `primitives/<name>` for
// `components/ui`, the bare name for the rest of `components`, and `hooks/` and `lib/` as they are.
const config = library(import.meta.dirname, ['components', 'hooks', 'lib'], (module) =>
    module.replace(/^components\/ui\//, 'primitives/').replace(/^components\//, ''),
)

export default { ...config, plugins: [...(config.plugins ?? []), appearanceFile()] }
