import './app.css'

import { registerPlugins } from '@winterop-com/sokkel-ui/lib/plugins'
import { dhis2Plugin } from '@winterop-com/sokkel-ui-dhis2/plugin'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureDemo } from 'tidevann-shared/backend'

import { App } from './App'
import { LATEST, namesOf } from './data/versions'

configureDemo({ app: 'dhis2' })

// The expression languages, knowing the latest server's names until the app reads the version it runs.
registerPlugins([dhis2Plugin(namesOf(LATEST))])

const root = document.getElementById('root')
if (root === null) throw new Error('No #root element in index.html')

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
