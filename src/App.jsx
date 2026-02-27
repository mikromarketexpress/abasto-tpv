import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import POS from './pages/POS'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import HelpModal from './components/HelpModal'
import { supabase } from './lib/supabase'
import { getOfflineSales, deleteOfflineSale } from './lib/db'
import { useToast } from './context/ToastContext'

function App() {
    const [activePage, setActivePage] = useState('pos')
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [showHelp, setShowHelp] = useState(false)

    useEffect(() => {
        const up = () => setIsOnline(true)
        const down = () => setIsOnline(false)
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
    }, [])

    const { showToast } = useToast()

    useEffect(() => {
        if (!isOnline) return
        const sync = async () => {
            const sales = await getOfflineSales()
            if (sales.length === 0) return

            let syncedCount = 0
            for (const sale of sales) {
                try {
                    const { error } = await supabase.rpc('finalizar_venta_v2', {
                        p_total_usd: sale.total_usd,
                        p_tasa_bcv: sale.tasa_bcv,
                        p_productos: sale.productos,
                        p_pagos: sale.pagos
                    })
                    if (!error) {
                        await deleteOfflineSale(sale.id)
                        syncedCount++
                    }
                } catch (err) { console.error('Sync error:', err) }
            }
            if (syncedCount > 0) {
                showToast(`${syncedCount} VENTAS SINCRONIZADAS CON LA NUBE`, 'info')
            }
        }
        sync()
    }, [isOnline])

    return (
        <div className="s-layout">
            <div className="s-ambient-blue" />
            <div className="s-ambient-green" />

            {/* Header Area */}
            <Header isOnline={isOnline} />

            {/* Content Area */}
            <div className="s-layout__body">
                <Sidebar activePage={activePage} setActivePage={setActivePage} />
                <main className="s-layout__main">
                    {activePage === 'pos' && <POS />}
                    {activePage === 'dashboard' && <Dashboard />}
                    {activePage === 'inventory' && <Inventory />}
                </main>
            </div>

            {/* Footer Status Bar */}
            <footer className="s-footer">
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {[
                        ['F1', 'AYUDA'],
                        ['F5', 'REFRESCAR'],
                        ['ESC', 'CERRAR']
                    ].map(([key, label]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 1000, background: 'rgba(0,230,118,0.1)', color: 'var(--s-neon)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(0,230,118,0.2)' }}>{key}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>{label}</span>
                        </div>
                    ))}
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#fff', letterSpacing: '0.2em' }}>
                    MICRO MARKET <span style={{ color: 'var(--s-neon)' }}>EXPRESS</span> — <span style={{ color: 'var(--s-text-primary)' }}>v2.5.0</span>
                </div>
            </footer>

            {showHelp && <HelpModal onClose={() => setShowHelp(false)} activePage={activePage} />}
        </div>
    )
}

export default App
