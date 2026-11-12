import type { SokkelPlugin } from '@winterop-com/sokkel-ui/lib/plugins'

import { dhis2ExpressionLanguage } from './expression'
import type { Dhis2Names } from './names'
import { dhis2RuleLanguage } from './rule'

declare module '@winterop-com/sokkel-ui/lib/plugins' {
    interface PluginLanguageNames {
        'dhis2-expression': true
        'dhis2-rule': true
    }
}

/**
 * DHIS2's expression languages as a plugin that knows the functions and program variables given: a
 * `CodeEditor` takes `language="dhis2-expression"` (indicators, validation rules, predictors) and
 * `language="dhis2-rule"` (program rules, program indicators), and `languageForMediaType` reads
 * `text/x-dhis2-expression` and `text/x-dhis2-rule` as them. An app passes the names its server
 * knows, from its own data layer; left out, they are the latest server's.
 */
export function dhis2Plugin(names: Dhis2Names = {}): SokkelPlugin {
    return { name: 'dhis2', languages: [dhis2ExpressionLanguage(names), dhis2RuleLanguage(names)] }
}

/** DHIS2's expression languages as a plugin, knowing the latest server's functions and variables: `registerPlugins([dhis2])`. */
export const dhis2: SokkelPlugin = dhis2Plugin()
