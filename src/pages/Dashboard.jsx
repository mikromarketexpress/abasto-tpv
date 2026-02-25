import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { TrendingUp, Users, ShoppingBag, DollarSign, ArrowUpRight, ArrowDownRight, Package, Calculator, Clock, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const Dashboard = ({ cajaSession }) => {
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
        const today = dayjs().startOf('day').toISOString()

        // Total Ventas Hoy
        const { data: salesToday } = await supabase
            .from('ventas')
            .select('total_usd, id, fecha')
            .gte('fecha', today)
            .order('fecha', { ascending: false })

        const total = salesToday?.reduce((acc, s) => acc + Number(s.total_usd), 0) || 0
        const count = salesToday?.length || 0
        const recientes = salesToday?.slice(0, 6) || []

        // Mock History Data
        const mockHistory = [
            { name: '08:00', ventes: 120 }, { name: '10:00', ventes: 450 },
            { name: '12:00', ventes: 890 }, { name: '14:00', ventes: 560 },
            { name: '16:00', ventes: 720 }, { name: '18:00', ventes: 1100 },
            { name: '20:00', ventes: 400 },
        ]

        // Mock Top Products
        const mockTop = [
            { id: 1, name: 'Coca Cola 1.5L', sales: 45, grow: 12, color: '#FF4D4D' },
            { id: 2, name: 'Harina P.A.N', sales: 38, grow: 8, color: '#FFD700' },
            { id: 3, name: 'Arroz Primor', sales: 32, grow: -2, color: '#3B82F6' },
            { id: 4, name: 'Leche Carabobo', sales: 28, grow: 15, color: '#10B981' },
        ]

        setStats({
            ventasHoy: total,
            ticketPromedio: count > 0 ? total / count : 0,
            clientes: count,
            productosHoy: count * 2.5,
            recientes: recientes
        })
        setHistoryData(mockHistory)
        setTopProducts(mockTop)

        setCategorySales([
            { name: 'Alimentos', value: 65, color: '#1A56DB' },
            { name: 'Bebidas', value: 25, color: '#00F59B' },
            { name: 'Limpieza', value: 10, color: '#6366F1' },
        ])

        setLoading(false)
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    }

    const KPI = ({ label, value, trend, icon: Icon, colorClass = "from-blue-600 to-blue-700" }) => (
        <motion.div
            variants={itemVariants}
            className="bg-white rounded-[2rem] p-6 border border-gray-100 flex items-center gap-6 shadow-sm hover:shadow-xl hover:border-blue-500/20 transition-all duration-500 group relative overflow-hidden"
        >
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500`}>
                <Icon size={28} />
            </div>
            <div className="flex-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">{label}</span>
                <div className="flex items-center gap-3">
                    <h3 className="text-3xl font-black text-gray-800 tracking-tighter">{value}</h3>
                    {trend && (
                        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${trend > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {Math.abs(trend)}%
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="h-full flex flex-col gap-8 overflow-y-auto pr-4 pb-12 custom-scrollbar"
        >
            {/* Header Performance Section */}
            <header className="flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-1 bg-blue-600 rounded-full" />
                        <h2 className="text-4xl font-black text-gray-800 tracking-tighter">Performance Hub</h2>
                    </div>
                    <p className="text-gray-400 text-sm font-bold ml-11 italic">Análisis en tiempo real de tu tienda</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 flex items-center gap-4 text-xs font-black text-gray-500 uppercase tracking-widest shadow-sm">
                        <Clock size={16} className="text-blue-600" />
                        Ult. Sync: {dayjs().format('HH:mm:ss A')}
                    </div>
                    <button className="bg-[#1F2937] text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-3">
                        Configurar Metas
                        <ChevronRight size={14} />
                    </button>
                </div>
            </header>

            {/* Premium KPIs Grid */}
            <div className="grid grid-cols-4 gap-6">
                <KPI label="Ingresos de Hoy" value={`$${stats.ventasHoy.toLocaleString()}`} trend={12.5} icon={DollarSign} />
                <KPI label="Ticket Promedio" value={`$${stats.ticketPromedio.toFixed(2)}`} trend={5.2} icon={Calculator} colorClass="from-emerald-500 to-teal-600" />
                <KPI label="Total Clientes" value={stats.clientes} trend={-2.4} icon={Users} colorClass="from-orange-500 to-amber-600" />
                <KPI label="Artículos Vendidos" value={stats.productosHoy} trend={18.1} icon={ShoppingBag} colorClass="from-indigo-500 to-purple-600" />
            </div>

            {/* Main Insights Grid */}
            <div className="grid grid-cols-12 gap-8 flex-1 min-h-[500px]">
                {/* Revenue Overview */}
                <motion.div
                    variants={itemVariants}
                    className="col-span-8 bg-white rounded-[2.5rem] border border-gray-100 p-10 flex flex-col relative overflow-hidden shadow-sm"
                >
                    <div className="flex justify-between items-start mb-12">
                        <div>
                            <h3 className="text-2xl font-black text-gray-800 tracking-tight">Flujo de Caja</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[4px] mt-2">Ventas Proyectadas vs Reales</p>
                        </div>
                        <div className="flex gap-3 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                            {['Día', 'Semana', 'Mes'].map(t => (
                                <button key={t} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${t === 'Día' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={historyData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1A56DB" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#1A56DB" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="8 8" stroke="#F1F5F9" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#CBD5E1"
                                    fontSize={10}
                                    fontWeight="bold"
                                    tickLine={false}
                                    axisLine={false}
                                    dy={15}
                                />
                                <YAxis hide domain={['auto', 'auto']} />
                                <Tooltip
                                    cursor={{ stroke: '#1A56DB', strokeWidth: 2, strokeDasharray: '4 4' }}
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        borderRadius: '16px',
                                        border: 'none',
                                        padding: '12px 16px',
                                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                                    }}
                                    itemStyle={{ color: '#FFF', fontWeight: '900', fontSize: '14px' }}
                                    labelStyle={{ color: '#9CA3AF', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="ventes"
                                    stroke="#1A56DB"
                                    strokeWidth={5}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                    animationDuration={2500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Right Sidebar: Top Products & Distribution */}
                <div className="col-span-4 flex flex-col gap-8">
                    {/* Distribution Donut */}
                    <motion.div
                        variants={itemVariants}
                        className="bg-white rounded-[2.5rem] border border-gray-100 p-8 flex flex-col items-center shadow-sm"
                    >
                        <h3 className="text-[11px] font-black text-gray-300 uppercase tracking-[4px] self-start mb-8">Composición</h3>
                        <div className="relative w-full aspect-square max-h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categorySales}
                                        innerRadius={75}
                                        outerRadius={95}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={12}
                                    >
                                        {categorySales.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-gray-800 text-4xl font-black font-mono leading-none tracking-tighter">84%</span>
                                <span className="text-blue-600 text-[9px] font-black uppercase tracking-widest mt-2">Eficiencia</span>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-8 w-full">
                            {categorySales.map(c => (
                                <div key={c.name} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                    <span className="text-[8px] font-bold text-gray-400 uppercase">{c.name}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Top Products List */}
                    <motion.div
                        variants={itemVariants}
                        className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm flex-1"
                    >
                        <h3 className="text-[11px] font-black text-gray-300 uppercase tracking-[4px] mb-8">Productos Elite</h3>
                        <div className="flex flex-col gap-6">
                            {topProducts.map(prod => (
                                <div key={prod.id} className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                        <Package size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-gray-800 leading-none">{prod.name}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="flex-1 h-1.5 bg-gray-50 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${prod.sales}%` }}
                                                    transition={{ duration: 1.5, delay: 0.5 }}
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: prod.color }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-gray-400">{prod.sales} uds</span>
                                        </div>
                                    </div>
                                    <div className={`text-[10px] font-black ${prod.grow > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {prod.grow > 0 ? '+' : ''}{prod.grow}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Recent Transactions Section */}
            <motion.div
                variants={itemVariants}
                className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm overflow-hidden"
            >
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className="text-2xl font-black text-gray-800 tracking-tight">Actividad Reciente</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[4px] mt-2">Últimas transacciones procesadas</p>
                    </div>
                    <button className="text-xs font-black text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-xl transition-all border border-blue-50">Explorar Todo</button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <AnimatePresence>
                        {stats.recientes.length > 0 ? stats.recientes.map((s, idx) => (
                            <motion.div
                                key={s.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center justify-between p-4 rounded-[1.5rem] border border-gray-50 hover:bg-gray-50 transition-all group"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-300 group-hover:scale-110 group-hover:text-blue-600 group-hover:border-blue-100 transition-all shadow-sm">
                                        <DollarSign size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-black text-gray-800 text-sm">Transacción #{s.id.slice(0, 8)}</h4>
                                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase">Verifiacda</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sincronizado vía Supabase Cloud</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-12 text-right">
                                    <div>
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-[2px] mb-1">Horario</p>
                                        <p className="text-xs font-black text-gray-800">{dayjs(s.fecha).format('HH:mm [hrs]')}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-[2px] mb-1">Importe</p>
                                        <p className="text-lg font-black text-blue-600">${Number(s.total_usd).toFixed(2)}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-300 group-hover:text-blue-600 transition-colors">
                                        <ChevronRight size={24} />
                                    </div>
                                </div>
                            </motion.div>
                        )) : (
                            <div className="text-center py-20 bg-gray-50/50 rounded-[2.5rem] border border-dashed border-gray-200">
                                <ShoppingBag size={64} className="mx-auto mb-4 text-gray-200" />
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-[5px]">Esperando actividad...</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    )
}

export default Dashboard
