import React from 'react'
import { motion } from 'framer-motion'
import { DatabaseZap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ProfileSelection = () => {
    const { login } = useAuth()

    const handleEnter = () => {
        login({
            id: 'guest',
            nombre_vendedor: 'ADMINISTRADOR',
            rol: 'admin'
        })
    }

    return (
        <div className="s-login-container" style={{
            height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at center, rgba(0, 230, 118, 0.05) 0%, #000 100%)', position: 'fixed', top: 0, left: 0, zIndex: 100000
        }}>
            <div style={{ textAlign: 'center', width: '100%', maxWidth: '500px', padding: '2rem' }}>
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 1000, color: '#fff', letterSpacing: '0.1em' }}>
                        MICRO MARKET <span style={{ color: 'var(--s-neon)' }}>EXPRESS</span>
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                        <DatabaseZap size={20} style={{ color: 'var(--s-neon)' }} />
                        <p style={{ color: 'var(--s-neon)', fontWeight: 700, fontSize: '0.9rem' }}>GOOGLE SHEETS CONECTADO</p>
                    </div>
                    <p style={{ color: 'var(--s-text-dim)', fontWeight: 700, marginTop: '1rem', letterSpacing: '0.1em' }}>
                        SISTEMA DE PUNTO DE VENTA
                    </p>
                </motion.div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleEnter}
                    className="s-btn s-btn-primary"
                    style={{
                        width: '100%', height: '5rem', fontSize: '1.3rem', letterSpacing: '0.15em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem'
                    }}
                >
                    ENTRAR AL SISTEMA
                </motion.button>

                <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.7rem', color: 'var(--s-text-dim)' }}>
                    <span>BASE: GOOGLE SHEETS</span>
                    <span>|</span>
                    <span>v3.0 GS</span>
                </div>
            </div>
        </div>
    )
}

export default ProfileSelection
