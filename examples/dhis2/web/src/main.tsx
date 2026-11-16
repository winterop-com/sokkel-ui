import './app.css'

import { ErrorBoundary } from '@winterop-com/sokkel-ui/ErrorBoundary'
import { registerPlugins } from '@winterop-com/sokkel-ui/lib/plugins'
import { dhis2Plugin } from '@winterop-com/sokkel-ui-dhis2/plugin'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureDemo } from 'tidevann-shared/backend'

configureDemo({ app: 'dhis2' })
// The example's own modules load once it is named, since one may read the backend as it loads.
const [{ App }, { LATEST, namesOf }] = await Promise.all([import('./App'), import('./data/versions')])

// The expression languages, knowing the latest server's names until the app reads the version it runs.
registerPlugins([dhis2Plugin(namesOf(LATEST))])

const root = document.getElementById('root')
if (root === null) throw new Error('No #root element in index.html')

createRoot(root).render(
    <StrictMode>
        <ErrorBoundary inset>
            <App />
        </ErrorBoundary>
    </StrictMode>,
)
