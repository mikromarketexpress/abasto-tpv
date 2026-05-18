import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { BarChart3, DollarSign, TrendingUp, TrendingDown, Calendar, Printer, Filter, CreditCard, Smartphone, QrCode, ArrowLeftRight, Wallet, Database, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { gsService } from '../lib/googleSheetsService'
import { injectarDatosPrueba } from '../lib/seedTestData'
import { formatUSD, formatBS, formatBs } from '../lib/financialUtils'

const PERIODOS = [
    { id: 'diario', label: 'DIARIO', icon: Calendar },
    { id: 'semanal', label: 'SEMANAL', icon: Calendar },
    { id: 'mensual', label: 'MENSUAL', icon: Calendar },
    { id: 'anual', label: 'ANUAL', icon: Calendar }
]

const METODOS_PAGO_CONFIG = [
    { id: 'pago_efectivo_usd', label: 'EFECTIVO (USD)', icon: DollarSign, color: '#00e676' },
    { id: 'pago_efectivo_bs', label: 'EFECTIVO (BS)', icon: Wallet, color: '#2196f3' },
    { id: 'pago_debito', label: 'DÉBITO', icon: CreditCard, color: '#9c27b0' },
    { id: 'pago_pago_movil', label: 'PAGO MÓVIL', icon: Smartphone, color: '#ff9800' },
    { id: 'pago_bio_pago', label: 'BIO PAGO', icon: QrCode, color: '#e91e63' },
    { id: 'pago_transferencia', label: 'TRANSFERENCIA', icon: ArrowLeftRight, color: '#00bcd4' }
]

const Reports = () => {
    const [ventas, setVentas] = useState([])
    const [productos, setProductos] = useState([])
    const [periodo, setPeriodo] = useState('diario')
    const [loading, setLoading] = useState(true)
    const [seeding, setSeeding] = useState(false)
    const [diagResult, setDiagResult] = useState(null)
    const [showDiag, setShowDiag] = useState(false)
    const connStatus = gsService.getConnectionStatus()

    const handleSeedData = async () => {
        setSeeding(true)
        try {
            await injectarDatosPrueba(18)
            await loadData()
        } catch (err) {
            console.error('Error inyectando datos:', err)
        } finally {
            setSeeding(false)
        }
    }

    const handleDiagnostic = async () => {
        setDiagResult(null)
        setShowDiag(true)
        const result = await gsService.runDiagnostic()
        setDiagResult(result)
    }

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            await gsService.initialize()
            const ventasData = gsService.getTable('Ventas') || []
            const productosData = gsService.getTable('Productos') || []
            setVentas(ventasData)
            setProductos(productosData)
        } catch (err) {
            console.error('Error loading data:', err)
        } finally {
            setLoading(false)
        }
    }

    const getPeriodDateRange = useCallback(() => {
        const now = new Date()
        const start = new Date()

        switch (periodo) {
            case 'diario':
                start.setHours(0, 0, 0, 0)
                break
            case 'semanal':
                start.setDate(now.getDate() - now.getDay())
                start.setHours(0, 0, 0, 0)
                break
            case 'mensual':
                start.setDate(1)
                start.setHours(0, 0, 0, 0)
                break
            case 'anual':
                start.setMonth(0, 1)
                start.setHours(0, 0, 0, 0)
                break
        }

        return { start, end: now }
    }, [periodo])

    const ventasFiltradas = useMemo(() => {
        const { start, end } = getPeriodDateRange()
        return ventas.filter(v => {
            const fecha = new Date(v.fecha)
            return fecha >= start && fecha <= end
        })
    }, [ventas, getPeriodDateRange])

    const resumen = useMemo(() => {
        let totalVentas = 0
        let totalCosto = 0
        let totalBs = 0
        const pagos = {}
        METODOS_PAGO_CONFIG.forEach(m => pagos[m.id] = 0)

        ventasFiltradas.forEach(v => {
            const venta = Number(v.total_venta_usd) || 0
            const costo = Number(v.total_costo_usd) || 0
            const bs = Number(v.total_bs) || 0

            totalVentas += venta
            totalCosto += costo
            totalBs += bs

            METODOS_PAGO_CONFIG.forEach(m => {
                pagos[m.id] += Number(v[m.id]) || 0
            })
        })

        return {
            totalVentas,
            totalCosto,
            gananciaNeta: totalVentas - totalCosto,
            margenGanancia: totalVentas > 0 ? ((totalVentas - totalCosto) / totalVentas) * 100 : 0,
            totalBs,
            totalTransacciones: ventasFiltradas.length,
            pagos
        }
    }, [ventasFiltradas])

    const handlePrint = () => {
        window.print()
    }

    const periodLabel = useMemo(() => {
        const { start, end } = getPeriodDateRange()
        const opts = { day: '2-digit', month: '2-digit', year: 'numeric' }
        if (periodo === 'diario') return `DÍA: ${start.toLocaleDateString('es-VE')}`
        if (periodo === 'semanal') return `SEMANA: ${start.toLocaleDateString('es-VE')} — ${end.toLocaleDateString('es-VE')}`
        if (periodo === 'mensual') return `MES: ${start.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })}`
        return `AÑO: ${start.getFullYear()}`
    }, [periodo, getPeriodDateRange])

    return (
        <div className="print-report" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--gap-2)', overflow: 'hidden' }}>
            {/* Connection Status Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: connStatus.status === 'ok' ? 'rgba(0,230,118,0.08)' : 'rgba(255,82,82,0.08)', border: `1px solid ${connStatus.status === 'ok' ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)'}`, borderRadius: '8px', fontSize: '0.6rem', fontWeight: 800 }} className="no-print">
                {connStatus.status === 'ok' ? <Wifi size={14} style={{ color: 'var(--s-neon)' }} /> : connStatus.status === 'loading' ? <div style={{ width: 12, height: 12, border: '2px solid rgba(0,230,118,0.2)', borderTopColor: 'var(--s-neon)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <WifiOff size={14} style={{ color: '#ff5252' }} />}
                <span style={{ color: connStatus.status === 'ok' ? 'var(--s-neon)' : '#ff5252' }}>
                    {connStatus.status === 'ok' ? 'CONECTADO' : connStatus.status === 'loading' ? 'CONECTANDO...' : connStatus.status === 'error' ? 'DESCONECTADO' : 'SIN CONEXIÓN'}
                </span>
                {connStatus.status === 'ok' && <span style={{ color: '#888', marginLeft: '0.5rem' }}>| {connStatus.productsInCache} productos | {connStatus.categoriesInCache} categorías | Tasa: ${formatUSD(gsService.getTasaBcv())}</span>}
                {connStatus.lastError && <span style={{ color: '#ff5252', marginLeft: '0.5rem' }}>({connStatus.lastError.substring(0, 60)}...)</span>}
                <button onClick={handleDiagnostic} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    DIAGNÓSTICO
                </button>
            </div>

            {/* Diagnostic Panel */}
            {showDiag && (
                <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.25rem', fontSize: '0.7rem' }} className="no-print">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ fontWeight: 900, color: '#fff' }}>DIAGNÓSTICO DE CONEXIÓN</h3>
                        <button onClick={() => setShowDiag(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>✕</button>
                    </div>
                    {diagResult ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                                <span style={{ color: '#888' }}>URL</span>
                                <span style={{ color: diagResult.urlValid ? 'var(--s-neon)' : '#ff5252', fontFamily: 'monospace', fontSize: '0.6rem', maxWidth: '20rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{diagResult.url}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                                <span style={{ color: '#888' }}>Red</span>
                                <span style={{ color: diagResult.networkOk ? 'var(--s-neon)' : '#ff5252' }}>{diagResult.networkOk ? '✅ OK' : '❌ Sin internet'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                                <span style={{ color: '#888' }}>Google Sheets</span>
                                <span style={{ color: diagResult.sheetReachable ? 'var(--s-neon)' : '#ff5252' }}>{diagResult.sheetReachable ? '✅ Accesible' : '❌ No responde'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                                <span style={{ color: '#888' }}>Productos cargados</span>
                                <span style={{ color: diagResult.productsLoaded ? 'var(--s-neon)' : '#ff9800' }}>{diagResult.productsLoaded ? '✅ Sí' : '⚠️ Vacío'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                                <span style={{ color: '#888' }}>Cache fallback</span>
                                <span style={{ color: diagResult.cacheFallback ? '#ff9800' : '#888' }}>{diagResult.cacheFallback ? '⚠️ Activo' : 'No'}</span>
                            </div>
                            {diagResult.errors.length > 0 && (
                                <div style={{ padding: '0.75rem', background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)', borderRadius: '6px' }}>
                                    <div style={{ color: '#ff5252', fontWeight: 900, marginBottom: '0.25rem' }}>ERRORES:</div>
                                    {diagResult.errors.map((err, i) => <div key={i} style={{ color: '#ff5252', fontFamily: 'monospace', fontSize: '0.6rem' }}>{err}</div>)}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>Ejecutando diagnóstico...</div>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 1000, color: '#fff' }}>REPORTES Y ANÁLISIS FINANCIERO</h2>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--s-neon)', marginTop: '0.25rem' }}>{periodLabel}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }} className="no-print">
                    <button
                        onClick={loadData}
                        className="s-btn s-btn-secondary"
                        style={{ height: '2.5rem' }}
                    >
                        <Filter size={14} /> ACTUALIZAR
                    </button>
                    <button
                        onClick={handleSeedData}
                        disabled={seeding}
                        className="s-btn"
                        style={{ height: '2.5rem', background: 'rgba(156,39,176,0.15)', border: '1px solid rgba(156,39,176,0.3)', color: '#ce93d8', cursor: seeding ? 'not-allowed' : 'pointer', opacity: seeding ? 0.7 : 1 }}
                    >
                        <Database size={14} /> {seeding ? 'INJECTANDO...' : 'INYECTAR DATOS PRUEBA'}
                    </button>
                    <button
                        onClick={handlePrint}
                        className="s-btn s-btn-primary"
                        style={{ height: '2.5rem' }}
                    >
                        <Printer size={14} /> GENERAR INFORME IMPRIMIBLE
                    </button>
                </div>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: '0.5rem' }}>
                {PERIODOS.map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        onClick={() => setPeriodo(id)}
                        className={`s-chip ${periodo === id ? 'active' : ''}`}
                        style={{ gap: '0.4rem' }}
                    >
                        <Icon size={14} />
                        {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '3rem', height: '3rem', border: '3px solid rgba(0,230,118,0.2)', borderTopColor: 'var(--s-neon)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--gap-2)' }}>
                        {[
                            { label: 'VENTAS TOTALES', value: `$${formatUSD(resumen.totalVentas)}`, sub: `BS ${formatBs(resumen.totalBs)}`, icon: DollarSign, color: 'var(--s-neon)', border: '#00e676' },
                            { label: 'GANANCIA NETA', value: `$${formatUSD(resumen.gananciaNeta)}`, sub: `MARGEN: ${resumen.margenGanancia.toFixed(1)}%`, icon: TrendingUp, color: '#00e676', border: '#00e676' },
                            { label: 'COSTO TOTAL', value: `$${formatUSD(resumen.totalCosto)}`, sub: `${resumen.totalTransacciones} TRANSACCIONES`, icon: TrendingDown, color: '#ff9800', border: '#ff9800' },
                            { label: 'AJUSTES / PÉRDIDAS', value: `$${formatUSD(0)}`, sub: 'SIN REGISTROS', icon: BarChart3, color: '#ff5252', border: '#ff5252' }
                        ].map(({ label, value, sub, icon: Icon, color, border }) => (
                            <motion.div
                                key={label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="print-summary-card"
                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}
                            >
                                <div style={{ width: '3rem', height: '3rem', borderRadius: '10px', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Icon size={18} style={{ color }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#666', letterSpacing: '0.15em' }}>{label}</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 1000, color, lineHeight: 1.2, marginTop: '0.25rem' }}>{value}</div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#888', marginTop: '0.15rem' }}>{sub}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gap-2)', flex: 1 }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#fff', letterSpacing: '0.1em', marginBottom: '1rem' }}>DESGLOSE POR MÉTODO DE PAGO</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {METODOS_PAGO_CONFIG.map(({ id, label, icon: Icon, color }) => (
                                    <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: `1px solid ${color}15` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Icon size={16} style={{ color }} />
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ccc' }}>{label}</span>
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 900, color, fontFamily: 'monospace' }}>
                                            {id === 'pago_efectivo_bs'
                                                ? `Bs ${formatBS(resumen.pagos[id])}`
                                                : `$${formatUSD(resumen.pagos[id])}`
                                            }
                                        </div>
                                    </div>
                                ))}
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.25rem 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#fff' }}>TOTAL RECAUDADO</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--s-neon)', fontFamily: 'monospace' }}>$${formatUSD(resumen.totalVentas)}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(100vh - 18rem)' }}>
                            <h3 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#fff', letterSpacing: '0.1em', marginBottom: '1rem' }}>ÚLTIMAS TRANSACCIONES</h3>
                            {ventasFiltradas.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#555' }}>
                                    <BarChart3 size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                    <p style={{ fontSize: '0.8rem', fontWeight: 800 }}>SIN VENTAS EN ESTE PERÍODO</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {[...ventasFiltradas].reverse().slice(0, 20).map(v => (
                                        <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff' }}>#{String(v.id || '').slice(0, 8)}</div>
                                                <div style={{ fontSize: '0.55rem', color: '#666', fontWeight: 700 }}>
                                                    {new Date(v.fecha).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--s-neon)', fontFamily: 'monospace' }}>${formatUSD(Number(v.total_venta_usd) || 0)}</div>
                                                <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 700 }}>
                                                    {(Number(v.pago_efectivo_usd) || 0) > 0 ? 'EFV ' : ''}
                                                    {(Number(v.pago_debito) || 0) > 0 ? 'DBT ' : ''}
                                                    {(Number(v.pago_pago_movil) || 0) > 0 ? 'PM ' : ''}
                                                    {(Number(v.pago_bio_pago) || 0) > 0 ? 'BIO ' : ''}
                                                    {(Number(v.pago_transferencia) || 0) > 0 ? 'TRF ' : ''}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default Reports
