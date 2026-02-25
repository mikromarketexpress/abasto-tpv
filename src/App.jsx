import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import POS from './pages/POS'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import HelpModal from './components/HelpModal'
import { supabase } from './lib/supabase'
import { getOfflineSales, deleteOfflineSale } from './lib/db'

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
            if (e.key === 'F1') { e.preventDefault(); window.dispatchEvent(new CustomEvent('focus-search')) }
            if (e.key === 'F5') { e.preventDefault(); setShowHelp(p => !p) }
            if (e.key === 'Escape') setShowHelp(false)
        }
        window.addEventListener('keydown', handleKey)
        return () => {
            window.removeEventListener('online', up)
            window.removeEventListener('offline', down)
            window.removeEventListener('keydown', handleKey)
        }
    }, [])

    // Sync offline sales when back online
    useEffect(() => {
        if (!isOnline) return
        const sync = async () => {
            const sales = await getOfflineSales()
            for (const sale of sales) {
                try {
                    const { error } = await supabase.rpc('finalizar_venta_v2', {
                        p_total_usd: sale.total_usd,
                        p_tasa_bcv: sale.tasa_bcv,
                        p_productos: sale.productos.map(p => ({
                            id: p.id,
                            cantidad: p.cantidad,
                            precio_unitario_usd: p.precio_unitario_usd || p.precio
                        })),
                        p_pagos: sale.pagos.map(p => ({
                            metodo: p.metodo,
                            monto_usd: p.monto_usd || p.monto,
                            monto_bs: p.monto_bs || (p.monto * sale.tasa_bcv)
                        }))
                    })
                    if (!error) {
                        await deleteOfflineSale(sale.id)
                    } else {
                        console.error('Failed to sync sale, deleting to prevent loop:', error);
                        await deleteOfflineSale(sale.id); // Delete it anyway if it fails so it doesn't loop
                    }
                } catch (err) { console.error('Sync error:', err) }
            }
        }
        sync()
    }, [isOnline])

    return (
        <div className="s-layout" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Ambient light effects — exact Stitch design */}
            <div className="s-ambient-blue" style={{ top: '-20%', left: '-10%' }} />
            <div className="s-ambient-green" style={{ bottom: '-15%', right: '-10%' }} />

            {/* Header */}
            <Header isOnline={isOnline} />

            {/* Body */}
            <div className="s-layout__body">
                <Sidebar activePage={activePage} setActivePage={setActivePage} />
                <main className="s-layout__main">
                    {activePage === 'pos' && <POS />}
                    {activePage === 'dashboard' && <Dashboard />}
                    {activePage === 'inventory' && <Inventory />}
                </main>
            </div>

            {/* Footer shortcut bar */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0 1rem', height: '2rem', flexShrink: 0
            }}>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {[['F1', 'BUSCAR'], ['F2', 'CANTIDAD'], ['F5', 'AYUDA'], ['ESC', 'SALIR']].map(([key, label]) => (
                        <span key={key} className="s-caption" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.375rem',
                                padding: '0.1rem 0.4rem',
                                fontWeight: 800, color: 'rgba(224,231,255,0.3)', fontSize: '0.625rem'
                            }}>{key}</span>
                            {label}
                        </span>
                    ))}
                </div>
                <span className="s-caption" style={{ letterSpacing: '0.3em' }}>POS-MK-2026-X4</span>
            </div>

            {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        </div>
    )
}

export default App
