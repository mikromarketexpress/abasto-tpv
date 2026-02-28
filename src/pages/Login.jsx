import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { User, Lock, Delete, ArrowRight, ShieldCheck, UserCheck, X as CloseIcon, Package, XCircle } from 'lucide-react'

const Login = () => {
    const [sellers, setSellers] = useState([])
    const [selectedSeller, setSelectedSeller] = useState(null)
    const [pin, setPin] = useState('')
    const [errorMessage, setErrorMessage] = useState(null)
    const { login } = useAuth()
    const { showToast } = useToast()

    useEffect(() => {
        fetchSellers()
    }, [])

    const fetchSellers = async () => {
        setErrorMessage(null)
        try {
            const { data, error } = await supabase
                .from('perfiles_vendedores')
                .select('*')
                .order('nombre_vendedor')
            if (error) throw error
            console.log('Sellers fetched:', data)
            if (!data || data.length === 0) {
                setErrorMessage('No se encontraron perfiles en la base de datos.')
            }
            setSellers(data || [])
        } catch (err) {
            console.error('Error fetching sellers:', err)
            setErrorMessage(`Error de conexión: ${err.message || 'No se pudo contactar con el servidor'}`)
        }
    }

    const handlePinClick = (num) => {
        if (pin.length < 4) setPin(prev => prev + num)
    }

    const handleClear = () => setPin('')
    const handleDelete = () => setPin(prev => prev.slice(0, -1))

    const handleLoginSubmit = async () => {
        if (pin.length !== 4 || !selectedSeller) return
        console.log('Attempting login for:', selectedSeller.nombre_vendedor)
        try {
            // Aseguramos que ambos sean strings para la comparación
            const inputPin = String(pin)
            const storedPin = String(selectedSeller.pin_acceso)

            console.log('Comparing:', inputPin, 'with:', storedPin)

            if (inputPin === storedPin) {
                console.log('Login success!')
                showToast(`BIENVENIDO, ${selectedSeller.nombre_vendedor.toUpperCase()}`, 'success')
                login(selectedSeller)
            } else {
                console.log('Login failed: PIN incorrect')
                showToast('PIN INCORRECTO', 'error')
                setPin('')
            }
        } catch (err) {
            console.error('Login error:', err)
            showToast('ERROR AL INICIAR SESIÓN', 'error')
        }
    }

    // Auto-submit when 4 digits are entered
    useEffect(() => {
        if (pin.length === 4) {
            setTimeout(() => {
                handleLoginSubmit()
            }, 100)
        }
    }, [pin])

    return (
        <div className="s-login-container" style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, rgba(0, 230, 118, 0.05) 0%, #000 100%)',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 100000
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="s-panel s-panel--crystal"
                style={{
                    width: '40rem',
                    padding: '3rem',
                    textAlign: 'center',
                    border: '1px solid var(--s-glass-border)',
                    boxShadow: '0 0 50px rgba(0,230,118,0.1)'
                }}
            >
                <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '5rem', height: '5rem', borderRadius: '15px',
                        background: 'rgba(0, 230, 118, 0.1)', border: '1px solid var(--s-neon)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem', color: 'var(--s-neon)',
                        boxShadow: '0 0 20px rgba(0,230,118,0.2)'
                    }}>
                        <ShieldCheck size={32} />
                    </div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#fff', letterSpacing: '0.1em' }}>MICRO MARKET EXPRESS</h1>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--s-neon)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '0.5rem' }}>Sistema de Terminal de Venta (V2.1)</p>
                </div>

                {!selectedSeller ? (
                    <div className="s-seller-selector">
                        <p style={{ marginBottom: '2rem', fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>SELECCIONE SU PERFIL</p>
                        {errorMessage ? (
                            <div style={{ padding: '2rem', color: '#ff5252', fontWeight: 800 }}>
                                <XCircle size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                <div style={{ marginBottom: '1rem' }}>{errorMessage}</div>
                                <button
                                    onClick={fetchSellers}
                                    style={{
                                        background: 'rgba(255,82,82,0.1)',
                                        border: '1px solid rgba(255,82,82,0.3)',
                                        color: '#ff5252',
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '0.7rem',
                                        fontWeight: 900
                                    }}
                                >
                                    REINTENTAR CONEXIÓN
                                </button>
                            </div>
                        ) : sellers.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                {/* ... previous seller list ... */}
                                {sellers.map((s) => (
                                    <motion.div
                                        key={s.id}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedSeller(s)}
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--s-glass-border)',
                                            borderRadius: '15px',
                                            padding: '1.5rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        <div style={{
                                            width: '3.5rem', height: '3.5rem', borderRadius: '50%',
                                            background: s.rol === 'admin' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${s.rol === 'admin' ? 'var(--s-neon)' : 'rgba(255,255,255,0.2)'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: s.rol === 'admin' ? 'var(--s-neon)' : '#fff'
                                        }}>
                                            {s.rol === 'admin' ? <ShieldCheck size={20} /> : <User size={20} />}
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#fff' }}>{s.nombre_vendedor.toUpperCase()}</span>
                                        <span style={{ fontSize: '0.55rem', fontWeight: 800, color: s.rol === 'admin' ? 'var(--s-neon)' : 'var(--s-text-dim)', letterSpacing: '0.1em' }}>{s.rol.toUpperCase()}</span>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '2rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>
                                <Package size={40} className="s-shimmer" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                <div>CARGANDO VENDEDORES...</div>
                                <div style={{ fontSize: '0.6rem', marginTop: '1rem' }}>POR FAVOR, VERIFIQUE SU CONEXIÓN</div>
                            </div>
                        )}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="s-pin-entry"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
                            <button
                                onClick={() => { setSelectedSeller(null); setPin(''); }}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '0.5rem' }}
                            >
                                <CloseIcon size={20} />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'rgba(0,230,118,0.1)', border: '1px solid var(--s-neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--s-neon)' }}>
                                    <UserCheck size={14} />
                                </div>
                                <span style={{ fontSize: '1rem', fontWeight: 1000, color: '#fff' }}>{selectedSeller.nombre_vendedor.toUpperCase()}</span>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem'
                        }}>
                            {[0, 1, 2, 3].map(i => (
                                <motion.div
                                    key={i}
                                    animate={pin.length > i ? { scale: [1, 1.2, 1], borderColor: 'var(--s-neon)' } : {}}
                                    style={{
                                        width: '1.25rem', height: '1.25rem', borderRadius: '50%',
                                        border: `2px solid ${pin.length > i ? 'var(--s-neon)' : 'rgba(255,255,255,0.2)'}`,
                                        background: pin.length > i ? 'var(--s-neon)' : 'transparent',
                                        boxShadow: pin.length > i ? '0 0 10px var(--s-neon-glow)' : 'none'
                                    }}
                                />
                            ))}
                        </div>

                        {/* NUMPAD */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem',
                            maxWidth: '18rem', margin: '0 auto'
                        }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'DEL'].map((val) => (
                                <motion.button
                                    key={val}
                                    whileHover={{ background: 'rgba(255,255,255,0.1)', borderColor: 'var(--s-glass-border-bright)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        if (val === 'C') handleClear()
                                        else if (val === 'DEL') handleDelete()
                                        else handlePinClick(val)
                                    }}
                                    className="s-numpad-btn"
                                    style={{
                                        height: '4rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--s-glass-border)',
                                        background: 'rgba(255,255,255,0.03)',
                                        color: '#fff',
                                        fontSize: '1.2rem',
                                        fontWeight: 900,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {val === 'DEL' ? <Delete size={20} /> : val}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}

                <div style={{ marginTop: '3rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800, letterSpacing: '0.15rem' }}>
                    SISTEMA PROTEGIDO POR ENTIDAD DE SEGURIDAD MME
                </div>
            </motion.div>
        </div>
    )
}

export default Login
