import React, { useState, useEffect } from 'react'
import { X, Lock, Unlock, DollarSign, TrendingUp, BarChart2, Package, AlertCircle, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { abrirSesion, cerrarSesion, getResumenSesion } from '../lib/caja'
import dayjs from 'dayjs'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const CajaModal = ({ type, onClose, onSessionUpdate, sesionActiva }) => {
    const [amount, setAmount] = useState('')
    const [tasaBcv, setTasaBcv] = useState('')
    const [observaciones, setObservaciones] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [resumen, setResumen] = useState(null)
    const [invalidTasa, setInvalidTasa] = useState(false)
    const { showToast } = useToast() || {}
    const { user } = useAuth()

    useEffect(() => {
        if (type === 'cerrar' && sesionActiva?.id) {
            getResumenSesion(sesionActiva.id).then(setResumen).catch(console.error)
        }
    }, [type, sesionActiva])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const numAmount = parseFloat(amount.toString().replace(',', '.'))
        const numTasa = parseFloat(tasaBcv.toString().replace(',', '.'))

        if (isNaN(numAmount) || numAmount < 0) {
            setError('Ingrese un monto válido mayor o igual a 0')
            setLoading(false)
            return
        }

        if (isAbrir) {
            if (isNaN(numTasa) || numTasa <= 0) {
                setInvalidTasa(true)
                setError('LA TASA BCV ES OBLIGATORIA Y DEBE SER MAYOR A 0')
                if (showToast) showToast('LA TASA BCV ES REQUERIDA', 'error')
                setLoading(false)
                return
            }
        }

        try {
            if (type === 'abrir') {
                const sesion = await abrirSesion(numAmount, numTasa, user?.id)
                onSessionUpdate(sesion)
            } else {
                if (!sesionActiva?.id) throw new Error('No hay sesión activa para cerrar')
                await cerrarSesion(sesionActiva.id, numAmount, observaciones)
                onSessionUpdate(null)
            }
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const isAbrir = type === 'abrir'
    const accentColor = isAbrir ? 'var(--s-neon)' : '#ff5252'
    const accentBg = isAbrir ? 'rgba(0,230,118,0.08)' : 'rgba(255,82,82,0.08)'

    return (
        <div className="s-overlay" style={{ zIndex: 9999 }}>
            <motion.div
                className="s-overlay__backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="s-modal s-modal--crystal"
                style={{ width: '32rem', border: `1px solid ${isAbrir ? 'rgba(0,230,118,0.25)' : 'rgba(255,82,82,0.25)'}` }}
            >
                {/* Header */}
                <div className="s-modal__header" style={{ borderBottomColor: isAbrir ? 'rgba(0,230,118,0.15)' : 'rgba(255,82,82,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '2.75rem', height: '2.75rem', borderRadius: '10px',
                            background: accentBg, border: `1px solid ${accentColor}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor
                        }}>
                            {isAbrir ? <Unlock size={20} /> : <Lock size={20} />}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 1000, color: '#fff' }}>
                                {isAbrir ? 'APERTURA DE CAJA' : 'CIERRE DE CAJA'}
                            </h2>
                            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: accentColor, letterSpacing: '0.15em' }}>
                                {isAbrir ? 'INICIO DE JORNADA' : `SESIÓN: ${sesionActiva?.id?.slice(0, 8)?.toUpperCase() || '—'}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="s-btn s-btn-secondary s-btn-icon" style={{ border: 'none' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="s-modal__body" style={{ gap: '1.25rem' }}>

                    {/* Resumen para cierre */}
                    {!isAbrir && resumen && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                            {[
                                { icon: TrendingUp, label: 'VENTAS USD', value: `$${resumen.totalVentas.toFixed(2)}`, color: 'var(--s-neon)' },
                                { icon: BarChart2, label: 'TRANSACCIONES', value: resumen.numTransacciones, color: '#2196f3' },
                                { icon: DollarSign, label: 'APERTURA', value: `$${Number(sesionActiva?.monto_apertura || 0).toFixed(2)}`, color: '#ff9800' }
                            ].map(({ icon: Icon, label, value, color }) => (
                                <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                                    <Icon size={18} style={{ color, margin: '0 auto 0.4rem' }} />
                                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{value}</div>
                                    <div style={{ fontSize: '0.55rem', color: 'var(--s-text-dim)', fontWeight: 800, letterSpacing: '0.1em' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Info apertura */}
                    {isAbrir && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--s-text-secondary)', lineHeight: 1.6, textAlign: 'center' }}>
                            Ingrese el monto inicial de efectivo en caja para comenzar la jornada de ventas. Se registrará la hora de apertura automáticamente.
                        </p>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label className="s-section-label" style={{ padding: 0 }}>
                                {isAbrir ? 'MONTO INICIAL EN CAJA (USD)' : 'EFECTIVO CONTADO AL CIERRE (USD)'}
                            </label>
                            <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: accentColor, fontWeight: 900, fontSize: '1.4rem' }}>$</div>
                                <input
                                    autoFocus
                                    type="number" step="0.01" min="0"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="s-input"
                                    style={{ paddingLeft: '3rem', fontSize: '1.8rem', height: '5rem', fontWeight: 900, textAlign: 'center' }}
                                    required
                                />
                            </div>
                        </div>

                        {isAbrir && (
                            <motion.div
                                animate={invalidTasa ? { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } } : {}}
                            >
                                <label className="s-section-label" style={{ padding: 0 }}>TASA DE CAMBIO (BCV)</label>
                                <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                    <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--s-neon)', fontWeight: 900, fontSize: '1rem' }}>BS</div>
                                    <input
                                        type="number" step="0.01" min="0.01"
                                        value={tasaBcv}
                                        onChange={e => {
                                            setTasaBcv(e.target.value)
                                            if (invalidTasa) setInvalidTasa(false)
                                        }}
                                        placeholder="Ingrese la tasa del BCV actual"
                                        className="s-input"
                                        style={{
                                            paddingLeft: '3rem',
                                            fontSize: '1.2rem',
                                            height: '4rem',
                                            fontWeight: 900,
                                            textAlign: 'center',
                                            borderColor: invalidTasa ? '#ff5252' : undefined,
                                            boxShadow: invalidTasa ? '0 0 15px rgba(255,82,82,0.3)' : undefined
                                        }}
                                        required
                                    />
                                </div>
                            </motion.div>
                        )}

                        {!isAbrir && (
                            <div>
                                <label className="s-section-label" style={{ padding: 0 }}>OBSERVACIONES (OPCIONAL)</label>
                                <textarea
                                    className="s-input"
                                    placeholder="Ej: Faltante de caja por desglose, etc."
                                    value={observaciones}
                                    onChange={e => setObservaciones(e.target.value)}
                                    style={{ marginTop: '0.5rem', height: '5rem', resize: 'none', paddingTop: '0.75rem', fontSize: '0.85rem' }}
                                />
                            </div>
                        )}

                        {error && (
                            <div style={{ background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)', padding: '0.875rem 1rem', borderRadius: '8px', color: '#ff5252', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <AlertCircle size={16} />{error.toUpperCase()}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                height: '3.5rem', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.1em',
                                borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', border: 'none',
                                background: isAbrir ? 'linear-gradient(135deg, var(--s-neon), #00b248)' : 'rgba(255,82,82,0.15)',
                                color: isAbrir ? '#000' : '#ff5252',
                                boxShadow: isAbrir ? '0 0 20px rgba(0,230,118,0.3)' : '0 0 10px rgba(255,82,82,0.2)',
                                opacity: loading ? 0.7 : 1,
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? 'PROCESANDO...' : (isAbrir ? '✓ INICIAR JORNADA' : '⚑ CERRAR Y FINALIZAR JORNADA')}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}

export default CajaModal
