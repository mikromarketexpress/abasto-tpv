import React, { useState } from 'react'
import { X, Lock, Unlock, DollarSign, TrendingUp, BarChart2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { gsService } from '../lib/googleSheetsService'
import dayjs from 'dayjs'

const CajaModal = ({ type, onClose, onSessionUpdate }) => {
    const [amount, setAmount] = useState('')
    const [tasaBcv, setTasaBcv] = useState('')
    const [observaciones, setObservaciones] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const isAbrir = type === 'abrir'

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const numAmount = parseFloat(amount.toString().replace(',', '.'))
        const numTasa = parseFloat(tasaBcv.toString().replace(',', '.'))

        if (isNaN(numAmount) || numAmount < 0) {
            setError('Ingrese un monto válido')
            setLoading(false)
            return
        }

        if (isAbrir && (isNaN(numTasa) || numTasa <= 0)) {
            setError('LA TASA BCV ES REQUERIDA')
            setLoading(false)
            return
        }

        try {
            if (isAbrir) {
                const sesion = await gsService.insert('Caja', {
                    id: crypto.randomUUID(),
                    fecha_apertura: new Date().toISOString(),
                    monto_inicial: numAmount,
                    monto_apertura_usd: numAmount,
                    tasa_bcv_apertura: numTasa,
                    estado: 'ACTIVA'
                })
                onSessionUpdate(sesion)
            } else {
                const sesiones = gsService.getTable('Caja')
                const activa = sesiones.find(s => s.estado === 'ACTIVA')
                if (activa) {
                    await gsService.update('Caja', {
                        ...activa,
                        estado: 'CERRADA',
                        fecha_cierre: new Date().toISOString(),
                        monto_cierre: numAmount,
                        observaciones: observaciones
                    })
                }
                onSessionUpdate(null)
            }
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const sesiones = gsService.getTable('Caja')
    const sesionActiva = sesiones.find(s => s.estado === 'ACTIVA')
    const ventas = gsService.getTable('Ventas').filter(v => v.sesion_caja_id === sesionActiva?.id)
    const totalVentas = ventas.reduce((sum, v) => sum + (Number(v.total_usd) || 0), 0)

    const accentColor = isAbrir ? 'var(--s-neon)' : '#ff5252'

    return (
        <div className="s-overlay" style={{ zIndex: 9999 }}>
            <motion.div className="s-overlay__backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="s-modal s-modal--crystal" style={{ width: '32rem' }}>
                <div className="s-modal__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '10px', background: 'rgba(0,230,118,0.08)', border: '1px solid var(--s-neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--s-neon)' }}>
                            {isAbrir ? <Unlock size={20} /> : <Lock size={20} />}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 1000, color: '#fff' }}>{isAbrir ? 'APERTURA DE CAJA' : 'CIERRE DE CAJA'}</h2>
                            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: accentColor }}>{isAbrir ? 'INICIO DE JORNADA' : `SESIÓN: ${sesionActiva?.id?.slice(0, 8) || '—'}`}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="s-btn s-btn-secondary s-btn-icon"><X size={20} /></button>
                </div>

                <div className="s-modal__body" style={{ gap: '1.25rem' }}>
                    {!isAbrir && sesionActiva && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                            {[
                                { icon: TrendingUp, label: 'VENTAS USD', value: `$${totalVentas.toFixed(2)}`, color: 'var(--s-neon)' },
                                { icon: BarChart2, label: 'TRANSACCIONES', value: ventas.length, color: '#2196f3' },
                                { icon: DollarSign, label: 'APERTURA', value: `$${Number(sesionActiva.monto_apertura_usd || 0).toFixed(2)}`, color: '#ff9800' }
                            ].map(({ icon: Icon, label, value, color }) => (
                                <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                                    <Icon size={18} style={{ color, margin: '0 auto 0.4rem' }} />
                                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{value}</div>
                                    <div style={{ fontSize: '0.55rem', color: 'var(--s-text-dim)', fontWeight: 800 }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label className="s-section-label">{isAbrir ? 'MONTO INICIAL (USD)' : 'MONTO CIERRE (USD)'}</label>
                            <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: accentColor, fontWeight: 900, fontSize: '1.4rem' }}>$</div>
                                <input autoFocus type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="s-input" style={{ paddingLeft: '3rem', fontSize: '1.8rem', height: '5rem', fontWeight: 900, textAlign: 'center' }} required />
                            </div>
                        </div>

                        {isAbrir && (
                            <div>
                                <label className="s-section-label">TASA BCV</label>
                                <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                    <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--s-neon)', fontWeight: 900 }}>BS</div>
                                    <input type="number" step="0.01" min="0.01" value={tasaBcv} onChange={e => setTasaBcv(e.target.value)} placeholder="Tasa actual" className="s-input" style={{ paddingLeft: '3rem', fontSize: '1.2rem', height: '4rem', fontWeight: 900, textAlign: 'center' }} required />
                                </div>
                            </div>
                        )}

                        {!isAbrir && (
                            <div>
                                <label className="s-section-label">OBSERVACIONES</label>
                                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} className="s-input" placeholder="Observaciones..." style={{ marginTop: '0.5rem', height: '5rem', resize: 'none', paddingTop: '0.75rem' }} />
                            </div>
                        )}

                        {error && (
                            <div style={{ background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)', padding: '0.875rem', borderRadius: '8px', color: '#ff5252', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <AlertCircle size={16} />{error.toUpperCase()}
                            </div>
                        )}

                        <button type="submit" disabled={loading} style={{ height: '3.5rem', fontSize: '0.9rem', fontWeight: 900, borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', border: 'none', background: isAbrir ? 'linear-gradient(135deg, var(--s-neon), #00b248)' : 'rgba(255,82,82,0.15)', color: isAbrir ? '#000' : '#ff5252', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'PROCESANDO...' : (isAbrir ? '✓ INICIAR JORNADA' : '⚑ CERRAR JORNADA')}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}

export default CajaModal
