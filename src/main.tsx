import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CourseProvider } from './context/CourseContext.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CourseProvider>
        <App />
      </CourseProvider>
    </ThemeProvider>
  </StrictMode>,
)
