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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <span className="s-caption" style={{ letterSpacing: '0.15em' }}>Filipenses 4:13</span>
                <h1 style={{
                    fontSize: 'var(--fs-lg)', fontWeight: 900, color: 'var(--stitch-text-1)',
                    letterSpacing: '-0.02em', lineHeight: 1
                }}>
                    MIKRO <span style={{ color: 'var(--stitch-text-1)', fontWeight: 900 }}>MARKET</span>{' '}
                    <span style={{ color: 'var(--stitch-blue)', fontStyle: 'italic', fontWeight: 900 }}>EXPRESS</span>
                </h1>
            </div>

            {/* Clock */}
            <div className="s-panel" style={{
                padding: '0.5rem 1.5rem', textAlign: 'center',
                display: 'flex', flexDirection: 'column', gap: '0.1rem'
            }}>
                <span style={{
                    fontSize: 'var(--fs-xl)', fontWeight: 800,
                    color: 'var(--stitch-text-1)', letterSpacing: '-0.02em', lineHeight: 1
                }}>{hhmm}</span>
                <span className="s-caption" style={{ letterSpacing: '0.05em' }}>{date}</span>
            </div>

            {/* Right: Status + Bell + User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                <div className="s-status-online">
                    <span className="s-status-online__dot" style={{ background: isOnline ? 'var(--stitch-green)' : 'var(--stitch-red)' }} />
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                </div>

                <button className="s-btn-icon">
                    <Bell size={15} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', paddingLeft: 'var(--sp-4)', borderLeft: '1px solid var(--stitch-border)' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--stitch-text-1)' }}>Admin User</div>
                        <div className="s-caption">Gerente</div>
                    </div>
                    <div className="s-btn-icon" style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--r-base)', overflow: 'hidden', padding: 0 }}>
                        <img
                            src="https://ui-avatars.com/api/?name=Admin+User&background=1152d4&color=fff&bold=true&size=64"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            alt="AU"
                        />
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Header
