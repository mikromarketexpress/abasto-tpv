import React, { useState, useEffect, useRef } from 'react'
import { Search, Plus, Minus, Smartphone, Package, ShoppingBag, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { saveOfflineSale } from '../lib/db'
import { motion, AnimatePresence } from 'framer-motion'

const POS = () => {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [cart, setCart] = useState([])
    const [tasaBcv, setTasaBcv] = useState(46.5)
    const [loading, setLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const searchRef = useRef(null)

    useEffect(() => {
        fetchInitialData()
        const onSearch = () => searchRef.current?.focus()
        const onFilter = (e) => setSelectedCategory(e.detail)
        window.addEventListener('focus-search', onSearch)
        window.addEventListener('filter-category', onFilter)
        return () => {
            window.removeEventListener('focus-search', onSearch)
            window.removeEventListener('filter-category', onFilter)
        }
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        const [{ data: cats }, { data: prods }, { data: cfg }] = await Promise.all([
            supabase.from('categorias').select('*').order('orden'),
            supabase.from('productos_con_precios').select('*'),
            supabase.from('configuracion').select('tasa_bcv').single(),
        ])
        setCategories(cats || [])
        setProducts(prods || [])
        if (cfg) setTasaBcv(cfg.tasa_bcv)
        setLoading(false)
    }

    const addToCart = (product) => {
        if (product.stock_actual <= 0) return
        setCart(prev => {
            const ex = prev.find(i => i.id === product.id)
            if (ex) return prev.map(i => i.id === product.id ? { ...i, cantidad: i.cantidad + 1 } : i)
            return [...prev, { ...product, cantidad: 1 }]
        })
    }

    const updateQty = (id, delta) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i))
    }

    const removeItem = (id) => setCart(prev => prev.filter(i => i.id !== id))

    const subtotal = cart.reduce((s, i) => s + i.precio_venta_usd * i.cantidad, 0)
    const iva = subtotal * 0.16
    const total = subtotal + iva
    const totalBs = total * tasaBcv

    const handleCheckout = async () => {
        if (!cart.length || isProcessing) return
        setIsProcessing(true)
        const payload = {
            p_total_usd: total,
            p_tasa_bcv: tasaBcv,
            p_productos: cart.map(i => ({ id: i.id, cantidad: i.cantidad, precio_unitario_usd: i.precio_venta_usd })),
            p_pagos: [{ metodo: 'efectivo', monto_usd: total, monto_bs: totalBs }]
        }
        try {
            const { error } = await supabase.rpc('finalizar_venta_v2', payload)
            if (error) throw error
        } catch {
            await saveOfflineSale({ ...payload, total_usd: total, tasa_bcv: tasaBcv, productos: payload.p_productos, pagos: payload.p_pagos })
        }
        setCart([])
        setIsProcessing(false)
    }

    const filtered = products.filter(p => {
        const q = searchQuery.toLowerCase()
        const matchSearch = p.nombre.toLowerCase().includes(q) || (p.codigo_barras && p.codigo_barras.includes(q))
        const matchCat = !selectedCategory || p.categoria_id === selectedCategory
        return matchSearch && matchCat
    })

    return (
        <div style={{ display: 'flex', height: '100%', gap: '0.75rem', overflow: 'hidden' }}>

            {/* ── Left: Search + Grid ─────────────────────────── */}
            <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden', minWidth: 0 }}>

                {/* Search bar */}
                <div className="s-panel" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', padding: '0 var(--sp-5)', height: '3rem', flexShrink: 0 }}>
                    <Search size={16} style={{ color: 'var(--stitch-text-3)', flexShrink: 0 }} />
                    <input
                        ref={searchRef}
                        className="s-input"
                        style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 'var(--fs-base)', flex: 1 }}
                        placeholder="Buscar productos... (F1)"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {selectedCategory && (
                        <button className="s-badge s-badge-blue" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={() => { setSelectedCategory(null); window.dispatchEvent(new CustomEvent('filter-category', { detail: null })) }}>
                            Filtro <X size={10} />
                        </button>
                    )}
                    <span className="s-badge s-badge-dim">F1</span>
                </div>

                {/* Product grid */}
                <div className="s-no-scroll" style={{
                    flex: 1, overflowY: 'auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))',
                    gap: '0.75rem',
                    paddingBottom: '0.5rem',
                    alignContent: 'start'
                }}>
                    {loading ? (
                        [...Array(8)].map((_, i) => (
                            <div key={i} className="s-product-card" style={{ opacity: 0.4 }}>
                                <div className="s-product-card__img" style={{ aspectRatio: 1 }} />
                                <div style={{ height: '0.75rem', background: 'var(--stitch-surface-3)', borderRadius: 'var(--r-sm)', marginBottom: 'var(--sp-2)', width: '70%' }} />
                                <div style={{ height: '0.75rem', background: 'var(--stitch-surface-3)', borderRadius: 'var(--r-sm)', width: '40%' }} />
                            </div>
                        ))
                    ) : filtered.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '16rem', gap: '1rem', opacity: 0.15 }}>
                            <Package size={64} strokeWidth={1} />
                            <span className="s-label">Sin resultados</span>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {filtered.map(p => (
                                <motion.div
                                    layout
                                    key={p.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="s-product-card"
                                    onClick={() => addToCart(p)}
                                    style={{ cursor: p.stock_actual > 0 ? 'pointer' : 'not-allowed', opacity: p.stock_actual > 0 ? 1 : 0.4 }}
                                >
                                    <div className="s-product-card__img">
                                        {p.imagen_url
                                            ? <img src={p.imagen_url} alt={p.nombre} onError={(e) => e.target.style.display = 'none'} />
                                            : <Package size={32} style={{ color: 'var(--stitch-text-4)' }} />
                                        }
                                        <span className="s-badge s-badge-blue" style={{ position: 'absolute', top: '0.4rem', left: '0.4rem' }}>
                                            {p.stock_actual > 0 ? 'DISPONIBLE' : 'AGOTADO'}
                                        </span>
                                    </div>
                                    <p className="s-product-card__name">{p.nombre}</p>
                                    <div className="s-product-card__footer">
                                        <span className="s-product-card__price">${p.precio_venta_usd.toFixed(2)}</span>
                                        <button
                                            className="s-btn-icon"
                                            onClick={e => { e.stopPropagation(); addToCart(p) }}
                                            style={{ borderRadius: '50%', color: 'var(--stitch-green)', borderColor: 'rgba(0,230,118,0.2)', background: 'rgba(0,230,118,0.08)' }}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* ── Right: Cart panel ───────────────────────────── */}
            <div className="s-panel" style={{ width: '22rem', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Cart header */}
                <div style={{ padding: 'var(--sp-5) var(--sp-6) var(--sp-4)', borderBottom: '1px solid var(--stitch-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                    <div>
                        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--stitch-text-1)', letterSpacing: '-0.02em' }}>Orden Actual</h2>
                        <span className="s-badge s-badge-dim" style={{ marginTop: '0.4rem', display: 'inline-block' }}>ID: #88291</span>
                    </div>
                    <button className="s-btn-icon" onClick={() => setCart([])} style={{ color: 'var(--stitch-text-3)' }}>
                        <Trash2 size={14} />
                    </button>
                </div>

                {/* Cart items */}
                <div className="s-scroll" style={{ flex: 1, padding: '0 var(--sp-6)', overflowY: 'auto' }}>
                    {cart.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', opacity: 0.1 }}>
                            <ShoppingBag size={56} strokeWidth={1} />
                            <span className="s-label">Carrito vacío</span>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {cart.map(item => (
                                <motion.div
                                    layout
                                    key={item.id}
                                    initial={{ opacity: 0, x: 12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -12 }}
                                    className="s-cart-item"
                                >
                                    <div className="s-cart-item__thumb">
                                        {item.imagen_url ? <img src={item.imagen_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} /> : <Package size={20} style={{ margin: 'auto', color: 'var(--stitch-text-4)' }} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--stitch-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nombre}</p>
                                        <div className="s-cart-item__qty" style={{ marginTop: 'var(--sp-2)', display: 'inline-flex' }}>
                                            <button className="s-qty-btn" onClick={() => updateQty(item.id, -1)}><Minus size={10} /></button>
                                            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 800, color: 'var(--stitch-text-1)', minWidth: '1.5rem', textAlign: 'center' }}>{item.cantidad}</span>
                                            <button className="s-qty-btn" onClick={() => updateQty(item.id, 1)}><Plus size={10} /></button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                                        <span style={{ fontSize: 'var(--fs-base)', fontWeight: 800, color: 'var(--stitch-text-1)' }}>${(item.precio_venta_usd * item.cantidad).toFixed(2)}</span>
                                        <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--stitch-text-4)', fontSize: 'var(--fs-xs)', fontWeight: 700 }}>
                                            <X size={12} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>

                {/* Totals + Pay */}
                <div style={{ padding: 'var(--sp-5) var(--sp-6)', borderTop: '1px solid var(--stitch-border)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="s-caption">Subtotal</span>
                            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--stitch-text-2)' }}>${subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="s-caption">Impuestos (IVA)</span>
                            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--stitch-text-2)' }}>${iva.toFixed(2)}</span>
                        </div>
                        <div className="s-divider" />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 800, color: 'var(--stitch-text-1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Total a Pagar</span>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 900, color: 'var(--stitch-text-1)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                                    ${total.toFixed(2)}
                                </div>
                                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--stitch-green)', marginTop: '0.2rem' }}>
                                    ≈ {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} BSV
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        className="s-btn-pay"
                        onClick={handleCheckout}
                        disabled={!cart.length || isProcessing}
                    >
                        <Smartphone size={18} />
                        {isProcessing ? 'PROCESANDO...' : 'PAGAR'}
                    </button>

                    <button
                        onClick={() => setCart([])}
                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', marginTop: 'var(--sp-3)', color: 'var(--stitch-text-3)', fontSize: 'var(--fs-xs)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                    >
                        CANCELAR ORDEN
                    </button>
                </div>
            </div>
        </div>
    )
}

export default POS
