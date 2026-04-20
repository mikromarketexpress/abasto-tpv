import React, { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Package, Clock, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDatabase } from '../hooks/useDatabase'
import StockAlertBanner from '../components/StockAlertBanner'
import dayjs from 'dayjs'

const Dashboard = ({ setActivePage }) => {
    const { isReady, getVentas, getProductos, getSesionActiva, getConfiguracion } = useDatabase()
    const [stats, setStats] = useState({ ventasHoy: 0, ticketPromedio: 0, clientes: 0 })
    const [historyData, setHistoryData] = useState([])
    const [categorySales, setCategorySales] = useState([])
    const [topProducts, setTopProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [sesionActiva, setSesionActiva] = useState(null)
    const [tasaBcv, setTasaBcv] = useState(() => {
        const saved = localStorage.getItem('mme_tasa_bcv')
        return saved ? parseFloat(saved) : 46.5
    })

    useEffect(() => {
        if (isReady) {
            fetchStats()
        }
    }, [isReady, getVentas, getProductos, getSesionActiva, getConfiguracion])

    const fetchStats = () => {
        try {
            const ventas = getVentas()
            const productos = getProductos()
            const sesion = getSesionActiva()
            const cfg = getConfiguracion()

            setSesionActiva(sesion)
            if (sesion?.tasa_bcv_apertura) {
                setTasaBcv(sesion.tasa_bcv_apertura)
            } else if (cfg?.tasa_bcv) {
                setTasaBcv(cfg.tasa_bcv)
            }

            const today = dayjs().startOf('day').toISOString()
            const ventasHoy = ventas.filter(v => new Date(v.fecha) >= new Date(today))
            const total = ventasHoy.reduce((acc, s) => acc + Number(s.total_usd || 0), 0)
            const count = ventasHoy.length

            setStats({
                ventasHoy: total,
                ticketPromedio: count > 0 ? total / count : 0,
                clientes: count
            })

            const horasMap = {}
            for (let h = 6; h <= 21; h++) horasMap[`${String(h).padStart(2, '0')}:00`] = 0
            ventasHoy.forEach(v => {
                const hora = `${String(dayjs(v.fecha).hour()).padStart(2, '0')}:00`
                if (horasMap[hora] !== undefined) horasMap[hora] += Number(v.total_usd || 0)
            })
            setHistoryData(Object.entries(horasMap).map(([name, ventes]) => ({ name, ventes })))

            const prodMap = {}
            ventasHoy.forEach(v => {
                try {
                    const prods = JSON.parse(v.productos_json || '[]')
                    prods.forEach(p => {
                        if (!prodMap[p.id]) prodMap[p.id] = { name: p.nombre || 'Sin nombre', sales: 0 }
                        prodMap[p.id].sales += Number(p.cantidad || 0)
                    })
                } catch (e) {}
            })
            const sorted = Object.values(prodMap).sort((a, b) => b.sales - a.sales).slice(0, 4)
            const colors = ['var(--s-neon)', '#2196f3', '#9c27b0', '#ff9800']
            setTopProducts(sorted.map((p, i) => ({ ...p, color: colors[i] || '#fff', id: i + 1 })))

            setCategorySales([
                { name: 'ALIMENTOS', value: 45, color: 'var(--s-neon)' },
                { name: 'BEBIDAS', value: 25, color: '#2196f3' },
                { name: 'LIMPIEZA', value: 15, color: '#9c27b0' },
                { name: 'OTROS', value: 15, color: '#ff9800' }
            ])
        } catch (err) {
            console.error('Error fetching stats:', err)
        } finally {
            setLoading(false)
        }
    }

    const KPI = ({ label, value, trend, icon: Icon, color = "var(--s-neon)" }) => (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="s-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
            <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
                <Icon size={24} />
            </div>
            <div>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--s-text-dim)', textTransform: 'uppercase' }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#fff' }}>{value}</h3>
                    {trend !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.7rem', fontWeight: 900, color: trend >= 0 ? 'var(--s-neon)' : '#ff5252' }}>
                            {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {Math.abs(trend)}%
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )

    return (
        <div className="s-scroll" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingRight: '1rem' }}>
            <StockAlertBanner onNavigateInventory={() => setActivePage?.('inventory')} />

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#fff' }}>CENTRO DE ANÁLISIS</h2>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--s-text-dim)', textTransform: 'uppercase' }}>Google Sheets • Tiempo Real</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {sesionActiva && (
                        <div style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: '8px', padding: '0.4rem 0.8rem', fontSize: '0.65rem', fontWeight: 900, color: 'var(--s-neon)' }}>
                            CAJA ACTIVA
                        </div>
                    )}
                    <button onClick={fetchStats} className="s-btn s-btn-secondary" style={{ height: '2.5rem', padding: '0 1rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RefreshCw size={14} /> ACTUALIZAR
                    </button>
                    <div className="s-panel" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 900, color: 'var(--s-neon)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Clock size={14} /> {dayjs().format('HH:mm')}
                    </div>
                </div>
            </header>

            <div style={{ display: 'flex', gap: 'var(--gap-2)' }}>
                <KPI label="Ventas de Hoy" value={`$${stats.ventasHoy.toLocaleString()}`} trend={12.5} icon={DollarSign} />
                <KPI label="Ticket Promedio" value={`$${stats.ticketPromedio.toFixed(2)}`} trend={5.2} icon={TrendingUp} color="#2196f3" />
                <KPI label="Transacciones" value={stats.clientes} icon={Package} color="#9c27b0" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--gap-2)', flex: 1 }}>
                <div className="s-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>FLUJO DE INGRESOS</h3>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--s-text-dim)' }}>MOVIMIENTO POR HORA</span>
                    </div>
                    <div style={{ flex: 1, minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={historyData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--s-neon)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="var(--s-neon)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} dy={10} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ background: 'rgba(13,18,32,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: 'var(--s-neon)' }} />
                                <Area type="monotone" dataKey="ventes" stroke="var(--s-neon)" strokeWidth={3} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-2)' }}>
                    <div className="s-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--s-text-dim)', alignSelf: 'flex-start' }}>COMPOSICIÓN</h3>
                        <div style={{ height: '180px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                        {categorySales.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="s-panel" style={{ padding: '1.5rem', flex: 1 }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--s-text-dim)', marginBottom: '1.5rem' }}>PRODUCTOS LÍDERES</h3>
                        {topProducts.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ width: '2rem', height: '2rem', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${p.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.color }}>
                                    <Package size={14} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', display: 'block' }}>{p.name}</span>
                                </div>
                            </div>
                        ))}
                        {topProducts.length === 0 && <span style={{ color: 'var(--s-text-dim)', fontSize: '0.75rem' }}>Sin datos aún</span>}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
