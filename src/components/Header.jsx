import React, { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'

const Header = ({ isOnline }) => {
    const [time, setTime] = useState(new Date())
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(t)
    }, [])

    const hhmm = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    const date = time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

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
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--s-text-dim)', textTransform: 'uppercase', marginTop: '0.2rem' }}>{date}</span>
            </div>

            {/* Status & User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', fontWeight: 900, background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--s-glass-border)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? 'var(--s-neon)' : '#ff5252', boxShadow: isOnline ? '0 0 10px var(--s-neon)' : 'none' }} />
                    <span style={{ color: isOnline ? '#fff' : '#ff5252' }}>{isOnline ? 'SISTEMA ONLINE' : 'MODO OFFLINE'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '1.5rem', borderLeft: '1px solid var(--s-glass-border)' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>Admin Master</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--s-text-dim)', textTransform: 'uppercase' }}>Gerente de Tienda</div>
                    </div>
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--r-standard)', border: '1px solid var(--s-neon)', overflow: 'hidden' }}>
                        <img src="https://ui-avatars.com/api/?name=Admin&background=00e676&color=000&bold=true" style={{ width: '100%', height: '100%' }} alt="AV" />
                    </div>
                </div>
            </div>
        </header>
    )
}


export default Header
