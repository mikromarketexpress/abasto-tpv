import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { TrendingUp, Users, ShoppingBag, DollarSign, ArrowUpRight, ArrowDownRight, Package, Calculator, Clock, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const Dashboard = () => {
    const [stats, setStats] = useState({
        ventasHoy: 0,
        ticketPromedio: 0,
        clientes: 0,
        productosHoy: 0,
        recientes: []
    })
    const [historyData, setHistoryData] = useState([])
    const [loading, setLoading] = useState(true)
    const [categorySales, setCategorySales] = useState([])
    const [topProducts, setTopProducts] = useState([])

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        setLoading(true)
        try {
            const today = dayjs().startOf('day').toISOString()

            const { data: salesToday, error } = await supabase
                .from('ventas')
                .select('total_usd, id, fecha')
                .gte('fecha', today)
                .order('fecha', { ascending: false })

            if (error) throw error

            const safeSales = salesToday || []
            const total = safeSales.reduce((acc, s) => acc + Number(s.total_usd || 0), 0)
            const count = safeSales.length
            const recientes = safeSales.slice(0, 6)

            setStats({
                ventasHoy: total,
                ticketPromedio: count > 0 ? total / count : 0,
                clientes: count,
                productosHoy: count * 2.5,
                recientes: recientes
            })

            // Mock data for charts - could be real in the future
            setHistoryData([
                { name: '08:00', ventes: 120 }, { name: '10:00', ventes: 450 },
                { name: '12:00', ventes: 890 }, { name: '14:00', ventes: 560 },
                { name: '16:00', ventes: 720 }, { name: '18:00', ventes: 1100 },
                { name: '20:00', ventes: 400 },
            ])

            setTopProducts([
                { id: 1, name: 'COCA COLA 1.5L', sales: 45, grow: 12, color: 'var(--s-neon)' },
                { id: 2, name: 'HARINA P.A.N', sales: 38, grow: 8, color: '#2196f3' },
                { id: 3, name: 'ARROZ PRIMOR', sales: 32, grow: -2, color: '#9c27b0' },
                { id: 4, name: 'LECHE CARABOBO', sales: 28, grow: 15, color: '#ff9800' },
            ])

            setCategorySales([
                { name: 'ALIMENTOS', value: 65, color: 'var(--s-neon)' },
                { name: 'BEBIDAS', value: 25, color: '#2196f3' },
                { name: 'LIMPIEZA', value: 10, color: '#9c27b0' },
            ])
        } catch (err) {
            console.error('Error fetching dashboard stats:', err)
        } finally {
            setLoading(false)
        }
    }

    const KPI = ({ label, value, trend, icon: Icon, color = "var(--s-neon)" }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="s-panel"
            style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}
        >
            <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
                <Icon size={24} />
            </div>
            <div>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--s-text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#fff', letterSpacing: '-0.02em' }}>{value}</h3>
                    {trend && (
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.7rem', fontWeight: 900, color: trend > 0 ? 'var(--s-neon)' : '#ff5252' }}>
                            {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {Math.abs(trend)}%
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )

    return (
        <div className="s-scroll" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', paddingRight: '1rem' }}>

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#fff', letterSpacing: '-0.03em' }}>CENTRO DE ANÁLISIS</h2>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--s-text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>Métricas en tiempo real sincronizadas</p>
                </div>
                <div className="s-panel" style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: 900, color: 'var(--s-neon)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Clock size={16} />
                    SINCRO: {dayjs().format('HH:mm:ss')}
                </div>
            </header>

            <div style={{ display: 'flex', gap: 'var(--gap-2)' }}>
                <KPI label="Ventas de Hoy" value={`$${stats.ventasHoy.toLocaleString()}`} trend={12.5} icon={DollarSign} />
                <KPI label="Ticket Promedio" value={`$${stats.ticketPromedio.toFixed(2)}`} trend={5.2} icon={Calculator} color="#2196f3" />
                <KPI label="Clientes" value={stats.clientes} trend={-2.4} icon={Users} color="#9c27b0" />
                <KPI label="Unidades" value={stats.productosHoy} trend={18.1} icon={ShoppingBag} color="#ff9800" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--gap-2)', flex: 1 }}>

                {/* Graph View */}
                <div className="s-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>FLUJO DE INGRESOS</h3>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--s-text-dim)' }}>MOVIMIENTO MONETARIO POR HORA</span>
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
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 800 }} dy={10} />
                                <YAxis hide domain={['auto', 'auto']} />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(13,18,32,0.95)', border: '1px solid var(--s-glass-border)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                                    itemStyle={{ color: 'var(--s-neon)', fontWeight: 900 }}
                                />
                                <Area type="monotone" dataKey="ventes" stroke="var(--s-neon)" strokeWidth={3} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right distribution */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-2)' }}>
                    <div className="s-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--s-text-dim)', alignSelf: 'flex-start' }}>COMPOSICIÓN DE VENTAS</h3>
                        <div style={{ height: '180px', width: '100%', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categorySales} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                        {categorySales.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 1000, color: '#fff' }}>84%</span>
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--s-neon)' }}>EFECTIVIDAD</span>
                            </div>
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>{p.name}</span>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: p.grow > 0 ? 'var(--s-neon)' : '#ff5252' }}>{p.grow > 0 ? '+' : ''}{p.grow}%</span>
                                    </div>
                                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${p.sales}%` }} style={{ height: '100%', background: p.color }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Recent Sales Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 1000, color: '#fff', letterSpacing: '-0.02em' }}>ÚLTIMAS TRANSACCIONES</h3>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--s-neon)', letterSpacing: '0.15em' }}>MÉTRICAS EN TIEMPO REAL</span>
                    </div>
                    <button className="s-btn s-btn-secondary" style={{ height: '2.5rem', fontSize: '0.65rem', padding: '0 1.5rem' }}>
                        VER HISTORIAL COMPLETO
                    </button>
                </div>

                <AnimatePresence mode="popLayout">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: 'var(--gap-3)'
                        }}
                    >
                        {stats.recientes.map((s, idx) => (
                            <motion.div
                                key={s.id}
                                layout
                                variants={{
                                    hidden: { opacity: 0, scale: 0.9, y: 20 },
                                    visible: {
                                        opacity: 1, scale: 1, y: 0,
                                        transition: { delay: idx * 0.1, duration: 0.5, ease: "easeOut" }
                                    }
                                }}
                                className="s-panel"
                                style={{
                                    padding: '1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.25rem',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                whileHover={{
                                    y: -8,
                                    borderColor: 'var(--s-neon)',
                                    boxShadow: '0 15px 40px rgba(0,0,0,0.5), 0 0 20px rgba(0, 230, 118, 0.1)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{
                                            width: '3rem', height: '3rem', borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--s-neon)'
                                        }}>
                                            <TrendingUp size={22} />
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 1000, color: '#fff', display: 'block' }}>
                                                #{s.id?.toString()?.slice(0, 8)?.toUpperCase()}
                                            </span>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--s-text-dim)', textTransform: 'uppercase' }}>
                                                {dayjs(s.fecha).fromNow()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="s-badge s-badge-dim" style={{ background: 'rgba(0, 230, 118, 0.1)', color: 'var(--s-neon)', border: 'none' }}>
                                        ÉXITO
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                                    <div>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--s-text-dim)', display: 'block', marginBottom: '0.25rem' }}>TOTAL COBRADO</span>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#fff', textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>
                                            ${Number(s.total_usd).toFixed(2)}
                                        </div>
                                    </div>
                                    <button
                                        className="s-btn s-btn-secondary s-btn-icon"
                                        style={{ width: '3rem', height: '3rem', borderRadius: '10px' }}
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>

                                {/* Decorative Background Gradient */}
                                <div style={{
                                    position: 'absolute', top: '-50%', right: '-50%',
                                    width: '100%', height: '100%',
                                    background: 'radial-gradient(circle, rgba(0, 230, 118, 0.05) 0%, transparent 70%)',
                                    pointerEvents: 'none'
                                }} />
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>

                {stats.recientes.length === 0 && !loading && (
                    <div className="s-panel" style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', opacity: 0.2 }}>
                        <Clock size={60} strokeWidth={1} />
                        <h3 style={{ fontWeight: 1000, letterSpacing: '0.2em' }}>SIN VENTAS RECIENTES</h3>
                    </div>
                )}
            </div>

        </div>
    )
}

export default Dashboard
