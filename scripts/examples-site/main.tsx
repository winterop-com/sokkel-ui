import './app.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ExamplesIndex } from './ExamplesIndex'

const root = document.getElementById('root')
if (root === null) throw new Error('No #root element in index.html')

createRoot(root).render(
    <StrictMode>
        <ExamplesIndex />
    </StrictMode>,
)
