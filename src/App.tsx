import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import TimetablePage from './pages/TimetablePage'
import SubjectDetailPage from './pages/SubjectDetailPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-300 px-6 py-5 flex items-center justify-between bg-stone-50/30">
        <NavLink to="/" className="group">
          <h1 className="font-display text-2xl tracking-[0.15em] text-stone-800 font-light italic">
            Class Memo
          </h1>
        </NavLink>
        <nav className="flex items-center gap-8">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-[11px] tracking-[0.2em] uppercase transition-colors duration-300 ${
                isActive ? 'text-stone-900 font-medium' : 'text-stone-500 hover:text-stone-800'
              }`
            }
          >
            Timetable
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `text-[11px] tracking-[0.2em] uppercase transition-colors duration-300 ${
                isActive ? 'text-stone-900 font-medium' : 'text-stone-500 hover:text-stone-800'
              }`
            }
          >
            Settings
          </NavLink>
        </nav>
      </header>

      {/* Main */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Routes location={location}>
              <Route path="/" element={<TimetablePage />} />
              <Route path="/subjects/:id" element={<SubjectDetailPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-300 px-6 py-4 text-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400">
          Class Memo
        </p>
      </footer>
    </div>
  )
}
