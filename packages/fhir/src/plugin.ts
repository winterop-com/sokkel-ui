import type { SokkelPlugin } from '@winterop-com/sokkel-ui/lib/plugins'

import { cqlLanguage } from './cql'
import { fhirpathLanguage } from './fhirpath'

declare module '@winterop-com/sokkel-ui/lib/plugins' {
    interface PluginLanguageNames {
        fhirpath: true
        cql: true
    }
}

/**
 * The health-data standards' languages as a plugin: installed with `registerPlugins([fhir])`, a
 * `CodeEditor` takes `language="fhirpath"` and `language="cql"`, and `languageForMediaType` reads
 * `text/fhirpath`, `application/fhirpath`, `text/cql`, `text/cql-expression` and `application/cql`
 * as them.
 */
export const fhir: SokkelPlugin = {
    name: 'fhir',
    languages: [fhirpathLanguage, cqlLanguage],
}
