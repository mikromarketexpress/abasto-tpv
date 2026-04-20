import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import POS from './pages/POS'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import ProfileSelection from './pages/ProfileSelection'
import HelpModal from './components/HelpModal'
import { CajaProvider } from './context/CajaContext'
import { useAuth } from './context/AuthContext'
import { gsService } from './lib/googleSheetsService'
import { useToast } from './context/ToastContext'

function App() {
    const { isAuthenticated } = useAuth()
    const [activePage, setActivePage] = useState('pos')
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
    const [showHelp, setShowHelp] = useState(false)
    const [tasaBcv, setTasaBcv] = useState(0)
    const { showToast } = useToast()

    useEffect(() => {
        gsService.initWithTasa().then(result => {
            if (result.success && result.tasa) {
                setTasaBcv(result.tasa)
                localStorage.setItem('mme_tasa_bcv', result.tasa.toString())
            }
        }).catch(() => {})
    }, [])

    useEffect(() => {
        const up = async () => { 
            setIsOnline(true)
            showToast('CONEXIÓN RESTABLECIDA - SINCRONIZANDO...', 'info')
            await gsService.refresh()
            showToast('DATOS ACTUALIZADOS', 'success')
        }
        const down = () => { 
            setIsOnline(false)
            showToast('MODO OFFLINE ACTIVADO', 'warning')
        }
        
        window.addEventListener('online', up)
        window.addEventListener('offline', down)

        const handleKey = (e) => {
            if (e.key === 'F1') { e.preventDefault(); setShowHelp(p => !p) }
            if (e.key === 'F5') { e.preventDefault(); window.location.reload() }
        }
        window.addEventListener('keydown', handleKey)
        
        return () => {
            window.removeEventListener('online', up)
            window.removeEventListener('offline', down)
            window.removeEventListener('keydown', handleKey)
        }
    }, [showToast])

    if (!isAuthenticated) {
        return <ProfileSelection />
    }

    return (
        <CajaProvider>
            <div className="s-layout">
                <div className="s-ambient-blue" />
                <div className="s-ambient-green" />

                <Header isOnline={isOnline} />

                <div className="s-layout__body">
                    <Sidebar activePage={activePage} setActivePage={setActivePage} />
                    <main className="s-layout__main">
                        {activePage === 'pos' && <POS />}
                        {activePage === 'dashboard' && <Dashboard setActivePage={setActivePage} />}
                        {activePage === 'inventory' && <Inventory />}
                    </main>
                </div>

                <footer className="s-footer">
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        {[['F1', 'AYUDA'], ['F5', 'REFRESCAR']].map(([key, label]) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.6rem', fontWeight: 1000, background: 'rgba(0,230,118,0.1)', color: 'var(--s-neon)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(0,230,118,0.2)' }}>{key}</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#fff', letterSpacing: '0.2em' }}>
                        MICRO MARKET <span style={{ color: 'var(--s-neon)' }}>EXPRESS</span> — <span style={{ color: 'var(--s-text-primary)' }}>GS v8.0</span>
                    </div>
                </footer>

                {showHelp && <HelpModal onClose={() => setShowHelp(false)} activePage={activePage} />}
            </div>
        </CajaProvider>
    )
}

export default App
