import './app.css'

import { ErrorBoundary } from '@winterop-com/sokkel-ui/ErrorBoundary'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureDemo } from 'tidevann-shared/backend'

configureDemo({ app: 'music' })
// The example's own modules load once it is named, since one may read the backend as it loads.
const { App } = await import('./App')

const root = document.getElementById('root')
if (root === null) throw new Error('No #root element in index.html')

createRoot(root).render(
    <StrictMode>
        <ErrorBoundary inset>
            <App />
        </ErrorBoundary>
    </StrictMode>,
)
