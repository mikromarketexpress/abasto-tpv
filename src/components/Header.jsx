import React, { useState, useEffect } from 'react'
import { Bell, Landmark, Unlock, Lock, LogOut, ShieldCheck, User, RefreshCw, AlertCircle, Check } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useCaja } from '../context/CajaContext'
import { useAuth } from '../context/AuthContext'
import { useDatabase } from '../hooks/useDatabase'
import CajaModal from './CajaModal'
import dayjs from 'dayjs'

const Header = ({ isOnline }) => {
    const [time, setTime] = useState(new Date())
    const [showCajaModal, setShowCajaModal] = useState(false)
    const [cajaModalType, setCajaModalType] = useState('abrir')
    const { sesionActiva, setSesionActiva, loadingCaja } = useCaja()
    const { user, logout } = useAuth()
    const { forceSync, isOnline: dbOnline } = useDatabase()
    const [isSyncing, setIsSyncing] = useState(false)

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(t)
    }, [])

    const handleSync = async () => {
        if (isSyncing || !isOnline) return
        setIsSyncing(true)
        await forceSync()
        setIsSyncing(false)
    }

    const handleCajaClick = () => {
        setCajaModalType(sesionActiva ? 'cerrar' : 'abrir')
        setShowCajaModal(true)
    }

    const hhmm = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    const date = time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const displayName = user?.nombre_vendedor || 'Usuario'
    const displayRole = user?.rol === 'admin' ? 'Gerente de Tienda' : 'Asistente de Ventas'

    return (
        <header className="s-header">
            {/* Logo */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--s-neon)', letterSpacing: '0.2em' }}>FILIPENSES 4:13</span>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                    MIKRO MARKET <span style={{ color: 'var(--s-neon)', fontStyle: 'italic' }}>EXPRESS</span>
                </h1>
            </div>

            {/* Clock Overlay */}
            <div className="s-panel" style={{ padding: '0.4rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: 'none' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{hhmm}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', marginTop: '0.2rem' }}>{date}</span>
            </div>

            {/* Status & User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', fontWeight: 900, background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--s-glass-border)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? 'var(--s-neon)' : '#ff5252', boxShadow: isOnline ? '0 0 10px var(--s-neon)' : 'none' }} />
                    <span style={{ color: isOnline ? '#fff' : '#ff5252' }}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </div>

                {/* Sync Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isOnline && (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.4rem',
                            padding: '0.3rem 0.6rem',
                            background: 'rgba(0, 230, 118, 0.1)', 
                            border: '1px solid rgba(0, 230, 118, 0.2)',
                            borderRadius: '6px'
                        }}>
                            <Check size={12} style={{ color: 'var(--s-neon)' }} />
                        </div>
                    )}
                    <button
                        onClick={handleSync}
                        disabled={!isOnline || isSyncing}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '2rem',
                            height: '2rem',
                            background: isOnline ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${isOnline ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: '6px',
                            color: isOnline ? 'var(--s-neon)' : 'var(--s-text-dim)',
                        cursor: isOnline && !isSyncing ? 'pointer' : 'not-allowed',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        transition: 'all 0.2s'
                    }}
                >
                    <RefreshCw 
                        size={14} 
                        style={{ 
                            animation: isSyncing ? 'spin 1s linear infinite' : 'none' 
                        }} 
                    />
                    {isSyncing ? 'SYNC' : 'SYNC'}
                </button>
                </div>

                {/* Caja Status Button */}
                {!loadingCaja && (
                    <button
                        onClick={handleCajaClick}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer',
                            background: sesionActiva ? 'rgba(0,230,118,0.08)' : 'rgba(255,82,82,0.08)',
                            border: `1px solid ${sesionActiva ? 'rgba(0,230,118,0.3)' : 'rgba(255,82,82,0.3)'}`,
                            color: sesionActiva ? 'var(--s-neon)' : '#ff5252',
                            fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.08em', transition: 'all 0.2s'
                        }}
                    >
                        {sesionActiva ? <Unlock size={14} /> : <Lock size={14} />}
                        <div style={{ textAlign: 'left' }}>
                            <div>{sesionActiva ? 'CAJA ABIERTA' : 'CAJA CERRADA'}</div>
                            {sesionActiva && (
                                <div style={{ fontSize: '0.55rem', fontWeight: 700, opacity: 0.7 }}>
                                    Desde {dayjs(sesionActiva.fecha_apertura).format('hh:mm A')}
                                </div>
                            )}
                        </div>
                        <Landmark size={14} style={{ opacity: 0.6 }} />
                    </button>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '1.5rem', borderLeft: '1px solid var(--s-glass-border)' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>{displayName}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--s-neon)', textTransform: 'uppercase' }}>{user?.rol || 'SISTEMA'}</div>
                    </div>
                    <button
                        onClick={logout}
                        title="Cambiar Vendedor"
                        style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--s-glass-border)',
                            color: '#fff', width: '2.2rem', height: '2.2rem', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.2s',
                            marginLeft: '0.5rem'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--s-neon)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--s-glass-border)'}
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            {showCajaModal && createPortal(
                <CajaModal
                    type={cajaModalType}
                    onClose={() => setShowCajaModal(false)}
                    onSessionUpdate={setSesionActiva}
                    sesionActiva={sesionActiva}
                />,
                document.body
            )}
        </header>
    )
}

export default Header
