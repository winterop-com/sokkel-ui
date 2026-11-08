import { library } from '../../vite.lib.ts'

// A module's list of sources is named as the `exports` map names the module: `primitives/<name>` for
// `components/ui`, the bare name for the rest of `components`, and `hooks/` and `lib/` as they are.
export default library(import.meta.dirname, ['components', 'hooks', 'lib'], (module) =>
    module.replace(/^components\/ui\//, 'primitives/').replace(/^components\//, ''),
)
