import React, { useState, useEffect, useMemo, useRef } from 'react'
import { X, Lock, Unlock, DollarSign, TrendingUp, BarChart2, AlertCircle, CreditCard, Smartphone, QrCode, ArrowLeftRight, Printer } from 'lucide-react'
import { motion } from 'framer-motion'
import { gsService } from '../lib/googleSheetsService'
import { useCaja } from '../context/CajaContext'
import CurrencyInput from './CurrencyInput'
import BsInput from './BsInput'
import { formatUSD, formatBS, parseUSDNumber, parseVENumber } from '../lib/financialUtils'
import dayjs from 'dayjs'

const METODOS_SISTEMA = [
    { id: 'debito', label: 'MONTO CIERRE (DÉBITO)', icon: CreditCard, color: '#2196f3' },
    { id: 'pago_movil', label: 'MONTO CIERRE (PAGO MÓVIL)', icon: Smartphone, color: '#ff9800' },
    { id: 'bio_pago', label: 'MONTO CIERRE (BIO PAGO)', icon: QrCode, color: '#9c27b0' },
    { id: 'transferencia', label: 'MONTO CIERRE (TRANSFERENCIAS)', icon: ArrowLeftRight, color: '#00bcd4' }
]

const CajaModal = ({ type, onClose, onSessionUpdate }) => {
    const { setTasaBCV } = useCaja()
    const [fondoCashUSD, setFondoCashUSD] = useState('')
    const [fondoCashBS, setFondoCashBS] = useState('')
    const [tasaBcv, setTasaBcv] = useState('')
    const [observaciones, setObservaciones] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showPrintReport, setShowPrintReport] = useState(false)
    const cierreRef = useRef(null)

    const isAbrir = type === 'abrir'

    useEffect(() => {
        if (isAbrir) {
            const fetchTasaBCV = async () => {
                try {
                    const result = await gsService.fetchAndUpdateTasaBcv()
                    if (result?.success && result.data?.tasa_bcv > 0) {
                        setTasaBcv(Number(result.data.tasa_bcv).toFixed(2))
                    } else {
                        const tasaCache = gsService.getTasaBcv()
                        if (tasaCache > 0) {
                            setTasaBcv(Number(tasaCache).toFixed(2))
                        }
                    }
                } catch (e) {
                    const tasaCache = gsService.getTasaBcv()
                    if (tasaCache > 0) {
                        setTasaBcv(Number(tasaCache).toFixed(2))
                    }
                }
            }
            fetchTasaBCV()
        }
    }, [isAbrir])

    const generateSesionId = () => {
        const datePart = dayjs().format('YYYYMMDD')
        const randPart = Math.random().toString(36).substring(2, 7).toUpperCase()
        return `CAJA-${datePart}-${randPart}`
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const numUSD = parseUSDNumber(fondoCashUSD)
        const numBS = parseVENumber(fondoCashBS)
        const numTasa = parseUSDNumber(tasaBcv)

        if (isAbrir && (isNaN(numTasa) || numTasa <= 0)) {
            setError('LA TASA BCV ES REQUERIDA')
            setLoading(false)
            return
        }

        try {
            if (isAbrir) {
                // PRIMERO: Sincronizar tasa BCV automáticamente antes de abrir caja
                setLoading(true)
                setError(null)
                
                let tasaFinal = numTasa
                try {
                    const tasaResult = await gsService.fetchAndUpdateTasaBcv()
                    if (tasaResult?.success && tasaResult.data?.tasa_bcv > 0) {
                        tasaFinal = tasaResult.data.tasa_bcv
                        console.log('[Caja] Tasa BCV sincronizada automáticamente:', tasaFinal)
                    } else {
                        console.log('[Caja] No se pudo sincronizar tasa BCV, usando valor manual:', numTasa)
                    }
                } catch (e) {
                    console.log('[Caja] Error sincronizando tasa BCV, usando valor manual:', numTasa)
                }
                
                const sesionId = generateSesionId()
                const sesionObj = {
                    id: sesionId,
                    fecha_apertura: new Date().toISOString(),
                    apertura_usd: numUSD,
                    apertura_bs: numBS,
                    tasa_bcv_apertura: tasaFinal,
                    estado: 'ACTIVA'
                }
                await gsService.abrirSesionCaja(sesionObj)
                setTasaBCV(tasaFinal)
                onSessionUpdate(sesionObj)
                onClose()
            } else {
                const sesiones = gsService.getTable('Caja')
                const activa = sesiones.find(s => s.estado === 'ACTIVA')
                if (activa) {
                    const montoCierreUSD = (Number(activa.apertura_usd) || 0) + totalVentas
                    const montoCierreBS = (Number(activa.apertura_bs) || 0) + totalVentasBS
                    cierreRef.current = {
                        sesion: activa,
                        ventasCount: ventas.length,
                        totalVentasUSD: totalVentas,
                        totalVentasBS: totalVentasBS,
                        totalItemsVendidos,
                        totalsSistema: { ...totalsSistema },
                        cierreUSD: montoCierreUSD,
                        cierreBS: montoCierreBS,
                        observaciones
                    }
                    await gsService.cerrarSesionCaja({
                        id: activa.id,
                        fecha_cierre: new Date().toISOString(),
                        cierre_usd: montoCierreUSD,
                        cierre_bs: montoCierreBS,
                        cierre_debito: totalsSistema.debito,
                        cierre_pago_movil: totalsSistema.pago_movil,
                        cierre_bio_pago: totalsSistema.bio_pago,
                        cierre_transferencia: totalsSistema.transferencia,
                        observaciones: observaciones
                    })
                    setTasaBCV(0)
                }
                onSessionUpdate(null)
                setShowPrintReport(true)
                return
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => window.print()
    const handleCloseReport = () => { setShowPrintReport(false); onClose() }

    const sesiones = gsService.getTable('Caja')
    const sesionActiva = sesiones.find(s => s.estado === 'ACTIVA')
    const ventas = gsService.getTable('Ventas').filter(v => v.sesion_caja_id === sesionActiva?.id)

    const totalVentas = ventas.reduce((sum, v) => sum + (Number(v.total_venta_usd) || 0), 0)
    const totalVentasBS = ventas.reduce((sum, v) => sum + (Number(v.total_bs) || 0), 0)
    const totalItemsVendidos = ventas.reduce((sum, v) => {
        try {
            const prods = typeof v.productos_json === 'string' ? JSON.parse(v.productos_json) : v.productos_json
            return sum + (prods || []).reduce((s, p) => s + (Number(p.cantidad) || 0), 0)
        } catch { return sum }
    }, 0)
    const totalsSistema = ventas.reduce((acc, v) => {
        acc.debito += Number(v.pago_debito) || 0
        acc.pago_movil += Number(v.pago_pago_movil) || 0
        acc.bio_pago += Number(v.pago_bio_pago) || 0
        acc.transferencia += Number(v.pago_transferencia) || 0
        return acc
    }, { debito: 0, pago_movil: 0, bio_pago: 0, transferencia: 0 })

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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                            {[
                                { icon: TrendingUp, label: 'VENTAS USD', value: `$${formatUSD(totalVentas)}`, color: 'var(--s-neon)' },
                                { icon: BarChart2, label: 'TRANSACCIONES', value: ventas.length, color: '#2196f3' },
                                { icon: DollarSign, label: 'APERTURA USD', value: `$${formatUSD(sesionActiva.apertura_usd)}`, color: '#00e676' },
                                { icon: DollarSign, label: 'APERTURA BS', value: `Bs ${formatBS(sesionActiva.apertura_bs)}`, color: '#2196f3' }
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
                        {isAbrir ? (
                            <>
                                <div>
                                    <label className="s-section-label" style={{ color: '#00e676' }}>MONTO INICIAL EFECTIVO (USD)</label>
                                    <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                        <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#00e676', fontWeight: 900, fontSize: '1.4rem' }}>$</div>
                                        <CurrencyInput currency="USD" autoFocus name="fondo_usd" id="caja-fondo-usd" value={fondoCashUSD} onChange={v => setFondoCashUSD(String(v))} placeholder="0.00" color="#00e676" style={{ paddingLeft: '3rem', fontSize: '1.8rem', height: '5rem', fontWeight: 900, textAlign: 'center', borderColor: '#00e676' }} />
                                    </div>
                                </div>

                                <div>
                                    <label className="s-section-label" style={{ color: '#2196f3' }}>MONTO INICIAL EFECTIVO (BS)</label>
                                    <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                        <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#2196f3', fontWeight: 900, fontSize: '1.4rem' }}>Bs</div>
                                        <BsInput id="caja-fondo-bs" name="fondo_bs" value={fondoCashBS} onChange={v => setFondoCashBS(String(v))} placeholder="0,00" color="#2196f3" style={{ fontSize: '1.8rem', height: '5rem', paddingLeft: '3rem' }} />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem' }}>
                                    <div style={{ fontSize: '0.55rem', fontWeight: 900, color: '#666', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>TOTALES DEL SISTEMA (SOLO LECTURA)</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid rgba(0,230,118,0.15)' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#888' }}>APERTURA USD</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#00e676', fontFamily: 'monospace' }}>${formatUSD(Number(sesionActiva?.apertura_usd) || 0)}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#888' }}>VENTAS USD</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#00e676', fontFamily: 'monospace' }}>${formatUSD(totalVentas)}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(0,230,118,0.06)', borderRadius: '6px', border: '1px solid #00e676' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#00e676' }}>MONTO CIERRE USD</span>
                                            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#00e676', fontFamily: 'monospace' }}>${formatUSD((Number(sesionActiva?.apertura_usd) || 0) + totalVentas)}</span>
                                        </div>
                                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0.2rem 0' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid rgba(33,150,243,0.15)' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#888' }}>APERTURA BS</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#2196f3', fontFamily: 'monospace' }}>Bs {formatBS(Number(sesionActiva?.apertura_bs) || 0)}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#888' }}>VENTAS BS</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#2196f3', fontFamily: 'monospace' }}>Bs {formatBS(totalVentasBS)}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(33,150,243,0.06)', borderRadius: '6px', border: '1px solid #2196f3' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#2196f3' }}>MONTO CIERRE BS</span>
                                            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#2196f3', fontFamily: 'monospace' }}>Bs {formatBS((Number(sesionActiva?.apertura_bs) || 0) + totalVentasBS)}</span>
                                        </div>
                                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0.2rem 0' }} />
                                        {METODOS_SISTEMA.map(({ id, label, icon: Icon, color }) => (
                                            <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: `1px solid ${color}20` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Icon size={14} style={{ color }} />
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#888', letterSpacing: '0.05em' }}>{label}</span>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 900, color, fontFamily: 'monospace' }}>Bs {formatBS(totalsSistema[id])}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {isAbrir && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <label className="s-section-label">TASA BCV</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const fetchTasa = async () => {
                                                try {
                                                    const result = await gsService.fetchAndUpdateTasaBcv()
                                                    if (result?.tasaBCV && result.tasaBCV > 0) {
                                                        setTasaBcv(Number(result.tasaBCV).toFixed(2))
                                                    }
                                                } catch (e) {}
                                            }
                                            fetchTasa()
                                        }}
                                        style={{
                                            background: 'none',
                                            border: '1px solid var(--s-neon)',
                                            color: 'var(--s-neon)',
                                            fontSize: '0.6rem',
                                            fontWeight: 800,
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                        title="Actualizar tasa BCV"
                                    >
                                        ↻ ACTUALIZAR
                                    </button>
                                </div>
                                <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                    <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--s-neon)', fontWeight: 900 }}>BS</div>
                                    <CurrencyInput currency="USD" name="tasa_bcv" id="caja-tasa" value={tasaBcv} onChange={v => setTasaBcv(parseFloat(v).toFixed(2))} placeholder="Tasa actual" color="var(--s-neon)" style={{ paddingLeft: '3rem', fontSize: '1.2rem', height: '4rem', fontWeight: 900, textAlign: 'center' }} />
                                </div>
                                <div style={{ fontSize: '0.55rem', color: 'var(--s-text-dim)', textAlign: 'center', marginTop: '0.25rem' }}>
                                    (Valor obtenido automáticamente del BCV - editable)
                                </div>
                            </div>
                        )}

                        {!isAbrir && (
                            <div>
                                <label className="s-section-label">OBSERVACIONES</label>
                                <textarea name="observaciones" id="caja-observaciones" value={observaciones} onChange={e => setObservaciones(e.target.value)} className="s-input" placeholder="Observaciones..." style={{ marginTop: '0.5rem', height: '5rem', resize: 'none', paddingTop: '0.75rem' }} />
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

            {showPrintReport && cierreRef.current && (
                <div className="print-cierre" style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: '#fff', zIndex: 10000, display: 'flex', flexDirection: 'column',
                    padding: '1.5rem', overflow: 'auto', fontFamily: 'monospace'
                }}>
                    <div style={{ flex: 1, maxWidth: '80mm', margin: '0 auto', width: '100%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '2px solid #000' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>MICRO MARKET EXPRESS</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.25rem' }}>CIERRE DE CAJA</div>
                        </div>

                        <table style={{ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666', width: '40%' }}>SESIÓN</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>{cierreRef.current.sesion.id?.slice(0, 8)}</td></tr>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>APERTURA</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>{dayjs(cierreRef.current.sesion.fecha_apertura).format('DD/MM/YYYY HH:mm')}</td></tr>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>CIERRE</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>{dayjs().format('DD/MM/YYYY HH:mm')}</td></tr>
                            </tbody>
                        </table>

                        <div style={{ margin: '0.75rem 0', borderTop: '1px dashed #000' }} />

                        <table style={{ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr><td style={{ fontWeight: 900, padding: '0.3rem 0', borderBottom: '1px solid #000', fontSize: '0.75rem' }} colSpan={2}>APERTURA</td></tr>
                            </thead>
                            <tbody>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>FONDO USD</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>${formatUSD(cierreRef.current.sesion.apertura_usd)}</td></tr>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>FONDO BS</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>Bs {formatBS(cierreRef.current.sesion.apertura_bs)}</td></tr>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>TASA BCV</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>Bs {formatBS(cierreRef.current.sesion.tasa_bcv_apertura)}</td></tr>
                            </tbody>
                        </table>

                        <div style={{ margin: '0.75rem 0', borderTop: '1px dashed #000' }} />

                        <table style={{ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr><td style={{ fontWeight: 900, padding: '0.3rem 0', borderBottom: '1px solid #000', fontSize: '0.75rem' }} colSpan={2}>VENTAS</td></tr>
                            </thead>
                            <tbody>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>TRANSACCIONES</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>{cierreRef.current.ventasCount}</td></tr>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>PRODUCTOS VENDIDOS</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>{cierreRef.current.totalItemsVendidos}</td></tr>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>TOTAL USD</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>${formatUSD(cierreRef.current.totalVentasUSD)}</td></tr>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>TOTAL BS</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>Bs {formatBS(cierreRef.current.totalVentasBS)}</td></tr>
                            </tbody>
                        </table>

                        <div style={{ margin: '0.75rem 0', borderTop: '1px dashed #000' }} />

                        <table style={{ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr><td style={{ fontWeight: 900, padding: '0.3rem 0', borderBottom: '1px solid #000', fontSize: '0.75rem' }} colSpan={2}>MÉTODOS DE PAGO</td></tr>
                            </thead>
                            <tbody>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>DÉBITO</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>Bs {formatBS(cierreRef.current.totalsSistema.debito)}</td></tr>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>PAGO MÓVIL</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>Bs {formatBS(cierreRef.current.totalsSistema.pago_movil)}</td></tr>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>BIO PAGO</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>Bs {formatBS(cierreRef.current.totalsSistema.bio_pago)}</td></tr>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>TRANSFERENCIA</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>Bs {formatBS(cierreRef.current.totalsSistema.transferencia)}</td></tr>
                            </tbody>
                        </table>

                        <div style={{ margin: '0.75rem 0', borderTop: '1px dashed #000' }} />

                        <table style={{ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr><td style={{ fontWeight: 900, padding: '0.3rem 0', borderBottom: '1px solid #000', fontSize: '0.75rem' }} colSpan={2}>CIERRE MANUAL</td></tr>
                            </thead>
                            <tbody>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>EFECTIVO USD</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>${formatUSD(cierreRef.current.cierreUSD)}</td></tr>
                                <tr><td style={{ padding: '0.2rem 0', color: '#666' }}>EFECTIVO BS</td><td style={{ padding: '0.2rem 0', fontWeight: 700, textAlign: 'right' }}>Bs {formatBS(cierreRef.current.cierreBS)}</td></tr>
                            </tbody>
                        </table>

                        {cierreRef.current.observaciones && (
                            <>
                                <div style={{ margin: '0.75rem 0', borderTop: '1px dashed #000' }} />
                                <div style={{ fontSize: '0.65rem' }}>
                                    <div style={{ fontWeight: 900, marginBottom: '0.2rem' }}>OBSERVACIONES</div>
                                    <div style={{ color: '#333' }}>{cierreRef.current.observaciones}</div>
                                </div>
                            </>
                        )}

                        <div style={{ margin: '1rem 0', borderTop: '2px solid #000' }} />
                        <div style={{ textAlign: 'center', fontSize: '0.6rem', color: '#888' }}>
                            {dayjs().format('DD/MM/YYYY HH:mm:ss')} | Generado por MME
                        </div>
                    </div>

                    <div className="no-print" style={{
                        textAlign: 'center', padding: '1rem', borderTop: '1px solid #ddd',
                        background: '#f5f5f5', marginTop: 'auto'
                    }}>
                        <button onClick={handlePrint} style={{
                            padding: '0.75rem 2rem', fontSize: '0.9rem', fontWeight: 900,
                            background: '#00e676', color: '#000', border: 'none', borderRadius: '8px',
                            cursor: 'pointer', marginRight: '0.75rem'
                        }}><Printer size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />IMPRIMIR CIERRE</button>
                        <button onClick={handleCloseReport} style={{
                            padding: '0.75rem 2rem', fontSize: '0.9rem', fontWeight: 900,
                            background: '#333', color: '#fff', border: 'none', borderRadius: '8px',
                            cursor: 'pointer'
                        }}>CERRAR</button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CajaModal
