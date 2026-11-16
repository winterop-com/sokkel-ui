import './app.css'

import { ErrorBoundary } from '@winterop-com/sokkel-ui/ErrorBoundary'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureDemo, onReset } from 'tidevann-shared/backend'

configureDemo({ app: 'video' })
// The example's own modules load once it is named, since one may read the backend as it loads.
const [{ App }, { forgetClips }] = await Promise.all([import('./App'), import('./clips')])
// The clips kept in IndexedDB, pinned and downloaded ones too, go with the demo data.
onReset(() => forgetClips({ downloads: true }))

const root = document.getElementById('root')
if (root === null) throw new Error('No #root element in index.html')

createRoot(root).render(
    <StrictMode>
        <ErrorBoundary inset>
            <App />
        </ErrorBoundary>
    </StrictMode>,
)
