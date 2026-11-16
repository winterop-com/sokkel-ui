import './app.css'

import { ErrorBoundary } from '@winterop-com/sokkel-ui/ErrorBoundary'
import { registerPlugins } from '@winterop-com/sokkel-ui/lib/plugins'
import { fhir } from '@winterop-com/sokkel-ui-fhir/plugin'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureDemo, onReset } from 'tidevann-shared/backend'

configureDemo({ app: 'fhir' })
// The example's own modules load once it is named, since one may read the backend as it loads.
const [{ App }, { drafts }] = await Promise.all([import('./App'), import('./editing')])
// Unsaved edits go with the demo data.
onReset(() => drafts.set({}))
registerPlugins([fhir])

const root = document.getElementById('root')
if (root === null) throw new Error('No #root element in index.html')

createRoot(root).render(
    <StrictMode>
        <ErrorBoundary inset>
            <App />
        </ErrorBoundary>
    </StrictMode>,
)
