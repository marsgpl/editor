import React from 'react'
import { App } from './components/App'
import { createRoot } from 'react-dom/client'
import s from './index.module.css'

document.addEventListener('DOMContentLoaded', () => {
    const root = document.createElement('div')
    root.classList.add(s.Root)
    document.body.appendChild(root)
    createRoot(root).render(<App />)
}, { once: true })
