import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Plus, Edit2, ChevronRight, AlertTriangle, Package, X, Smartphone, Filter, Hash } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const Inventory = () => {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [search, setSearch] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editForm, setEditForm] = useState({})
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)

    useEffect(() => {
        fetchInitialData()
        const channel = supabase
            .channel('inventory-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, fetchProducts)
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        const { data: cats } = await supabase.from('categorias').select('*').order('orden')
        setCategories(cats || [])
        await fetchProducts()
        setLoading(false)
    }

    const fetchProducts = async () => {
        const { data } = await supabase.from('productos_con_precios').select('*')
        setProducts(data || [])
    }

    const handleEdit = (p) => { setIsAdding(false); setEditingId(p.id); setEditForm({ ...p }) }

    const handleNew = () => {
        setIsAdding(true)
        setEditingId('new')
        setEditForm({ nombre: '', stock_actual: 0, stock_minimo: 5, precio_venta_usd: 0, categoria_id: categories[0]?.id || '', codigo_barras: '' })
    }

    const saveEdit = async () => {
        if (!editForm.nombre || editForm.precio_venta_usd <= 0) return alert('Complete nombre y precio')
        const op = isAdding
            ? supabase.from('productos').insert([editForm])
            : supabase.from('productos').update({ stock_actual: editForm.stock_actual, precio_venta_usd: editForm.precio_venta_usd, nombre: editForm.nombre, codigo_barras: editForm.codigo_barras, categoria_id: editForm.categoria_id }).eq('id', editingId)
        const { error } = await op
        if (!error) { setEditingId(null); fetchProducts() }
        else alert('Error: ' + error.message)
    }

    const filtered = products.filter(p => {
        const q = search.toLowerCase()
        return (p.nombre.toLowerCase().includes(q) || (p.codigo_barras && p.codigo_barras.includes(q)))
            && (selectedCategory === 'all' || p.categoria_id === selectedCategory)
    })

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden', position: 'relative' }}>

            {/* Top controls */}
            <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                {/* Search */}
                <div className="s-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: '0 var(--sp-5)', height: '3rem' }}>
                    <Search size={16} style={{ color: 'var(--stitch-text-3)', flexShrink: 0 }} />
                    <input
                        className="s-input"
                        style={{ background: 'transparent', border: 'none', padding: 0, flex: 1, fontSize: 'var(--fs-base)' }}
                        placeholder="Buscar producto o código de barras..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Filter */}
                <div className="s-panel" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: '0 var(--sp-4)', height: '3rem' }}>
                    <Filter size={14} style={{ color: 'var(--stitch-text-3)' }} />
                    <select
                        className="s-input"
                        style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 'var(--fs-sm)', cursor: 'pointer', appearance: 'none', color: 'var(--stitch-text-2)' }}
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                    >
                        <option value="all" className="bg-slate-900">Filtros</option>
                        {categories.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.nombre}</option>)}
                    </select>
                </div>

                {/* New product */}
                <button className="s-btn-add" style={{ height: '3rem', padding: '0 1.5rem', borderRadius: 'var(--r-full)', fontSize: 'var(--fs-sm)' }} onClick={handleNew}>
                    <Plus size={14} strokeWidth={3} />
                    NUEVO PRODUCTO
                </button>
            </div>

            {/* Table */}
            <div className="s-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header row */}
                <div className="s-inv-header s-label">
                    <span>Producto</span>
                    <span>Categoría</span>
                    <span style={{ textAlign: 'center' }}>Nivel de Stock</span>
                    <span style={{ textAlign: 'right' }}>Precio USD</span>
                    <span />
                </div>

                {/* Body */}
                <div className="s-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                            <div className="s-spinner" />
                            <span className="s-label">Cargando inventario...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', opacity: 0.1 }}>
                            <Package size={80} strokeWidth={1} />
                            <span className="s-label">Sin resultados</span>
                        </div>
                    ) : filtered.map(p => {
                        const isCrit = p.stock_actual <= p.stock_minimo
                        const catName = categories.find(c => c.id === p.categoria_id)?.nombre || '—'
                        const pct = Math.min(100, (p.stock_actual / ((p.stock_minimo || 1) * 4)) * 100)

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key={p.id}
                                className="s-inv-row"
                            >
                                {/* Product */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', minWidth: 0 }}>
                                    <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: 'var(--r-sm)', background: 'var(--stitch-surface-2)', border: '1px solid var(--stitch-border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {p.imagen_url ? <img src={p.imagen_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} /> : <Package size={16} style={{ color: 'var(--stitch-text-4)' }} />}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--stitch-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                                        <div className="s-caption" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                                            <Hash size={8} /> {p.codigo_barras || 'SIN SKU'}
                                        </div>
                                    </div>
                                </div>

                                {/* Category */}
                                <span className="s-badge s-badge-dim">{catName}</span>

                                {/* Stock */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                        <span style={{ fontSize: 'var(--fs-base)', fontWeight: 800, color: isCrit ? 'var(--stitch-red)' : 'var(--stitch-text-1)' }}>{p.stock_actual}</span>
                                        {isCrit && <AlertTriangle size={12} style={{ color: 'var(--stitch-red)' }} />}
                                    </div>
                                    <div className="s-stock-bar">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            className={`s-stock-bar__fill ${isCrit ? 'bad' : pct < 50 ? 'warn' : 'good'}`}
                                        />
                                    </div>
                                </div>

                                {/* Price */}
                                <span style={{ fontSize: 'var(--fs-md)', fontWeight: 800, color: 'var(--stitch-text-1)', textAlign: 'right' }}>
                                    ${p.precio_venta_usd.toFixed(2)}
                                </span>

                                {/* Edit btn */}
                                <button className="s-btn-icon" onClick={() => handleEdit(p)} style={{ marginLeft: 'auto' }}>
                                    <Edit2 size={14} />
                                </button>
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            {/* Drawer */}
            <AnimatePresence>
                {editingId && (
                    <div className="s-drawer">
                        <motion.div
                            className="s-drawer__overlay"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setEditingId(null)}
                        />
                        <motion.div
                            className="s-drawer__panel"
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                        >
                            {/* Drawer header */}
                            <div style={{ padding: 'var(--sp-6) var(--sp-8)', borderBottom: '1px solid var(--stitch-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                                <div>
                                    <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--stitch-text-1)' }}>
                                        {isAdding ? 'Nuevo Producto' : 'Edición Rápida'}
                                    </h2>
                                    <p className="s-caption" style={{ marginTop: '0.3rem' }}>Gestión de inventario activo</p>
                                </div>
                                <button className="s-btn-icon" onClick={() => setEditingId(null)}><X size={16} /></button>
                            </div>

                            {/* Drawer body */}
                            <div className="s-scroll" style={{ flex: 1, padding: 'var(--sp-6) var(--sp-8)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)', overflowY: 'auto' }}>

                                {/* Product image preview */}
                                {!isAdding && editForm.imagen_url && (
                                    <div style={{ width: '5rem', height: '5rem', borderRadius: 'var(--r-md)', background: 'var(--stitch-surface-2)', border: '2px solid var(--stitch-green)', overflow: 'hidden', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img src={editForm.imagen_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                                    <label className="s-label">Nombre del Producto</label>
                                    <input className="s-input" value={editForm.nombre || ''} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} placeholder="Ej. Coca-Cola Zero 500ml" />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                                    <label className="s-label">Código de Barras (SKU)</label>
                                    <input className="s-input" value={editForm.codigo_barras || ''} onChange={e => setEditForm({ ...editForm, codigo_barras: e.target.value })} placeholder="MME-DRNK-001" />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                                    <label className="s-label">Categoría</label>
                                    <div style={{ position: 'relative' }}>
                                        <select className="s-input" value={editForm.categoria_id || ''} onChange={e => setEditForm({ ...editForm, categoria_id: e.target.value })} style={{ appearance: 'none', cursor: 'pointer' }}>
                                            {categories.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.nombre}</option>)}
                                        </select>
                                        <ChevronRight size={14} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: 'var(--stitch-text-3)', pointerEvents: 'none' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                                    <label className="s-label">Stock Actual</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', background: 'var(--stitch-surface-2)', border: '1px solid var(--stitch-border)', borderRadius: 'var(--r-md)', padding: 'var(--sp-2)' }}>
                                        <button className="s-qty-btn" onClick={() => setEditForm(f => ({ ...f, stock_actual: Math.max(0, (f.stock_actual || 0) - 1) }))}>-</button>
                                        <input
                                            type="number"
                                            value={editForm.stock_actual || 0}
                                            onChange={e => setEditForm({ ...editForm, stock_actual: parseInt(e.target.value) || 0 })}
                                            style={{ background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'var(--stitch-green)', flex: 1, width: 0 }}
                                        />
                                        <button className="s-qty-btn" onClick={() => setEditForm(f => ({ ...f, stock_actual: (f.stock_actual || 0) + 1 }))}>+</button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                                    <label className="s-label">Precio Unitario (USD)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'var(--stitch-blue)' }}>$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editForm.precio_venta_usd || 0}
                                            onChange={e => setEditForm({ ...editForm, precio_venta_usd: parseFloat(e.target.value) || 0 })}
                                            className="s-input"
                                            style={{ paddingLeft: '2.5rem', fontSize: 'var(--fs-2xl)', fontWeight: 900, color: 'var(--stitch-text-1)', height: '4.5rem' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Drawer footer */}
                            <div style={{ padding: 'var(--sp-5) var(--sp-8)', flexShrink: 0, borderTop: '1px solid var(--stitch-border)' }}>
                                <button className="s-btn-pay" onClick={saveEdit} style={{ gap: 'var(--sp-3)' }}>
                                    <Smartphone size={16} />
                                    {isAdding ? 'REGISTRAR PRODUCTO' : 'CONFIRMAR CAMBIOS'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default Inventory
