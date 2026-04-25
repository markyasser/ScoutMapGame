import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppBootstrap } from './components/AppBootstrap'
import { RemoteSync } from './components/RemoteSync'
import { GameStateProvider } from './context/GameStateProvider'
import { MapTargetsProvider } from './context/MapTargetsProvider'
import { AdminPage } from './pages/AdminPage'
import { TeamGamePage } from './pages/TeamGamePage'

const appShellClass =
  'min-h-svh w-full min-w-0 bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950 text-stone-200 antialiased'

export default function App() {
  return (
    <AppBootstrap>
      <GameStateProvider>
        <MapTargetsProvider>
          <RemoteSync>
            <BrowserRouter>
              <div className={appShellClass}>
                <Routes>
                  <Route path="/" element={<TeamGamePage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </BrowserRouter>
          </RemoteSync>
        </MapTargetsProvider>
      </GameStateProvider>
    </AppBootstrap>
  )
}
