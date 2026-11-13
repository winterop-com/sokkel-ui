import './app.css'

import { registerPlugins } from '@winterop-com/sokkel-ui/lib/plugins'
import { fhir } from '@winterop-com/sokkel-ui-fhir/plugin'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureDemo } from 'tidevann-shared/backend'

import { App } from './App'

configureDemo({ app: 'fhir' })
registerPlugins([fhir])

const root = document.getElementById('root')
if (root === null) throw new Error('No #root element in index.html')

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
