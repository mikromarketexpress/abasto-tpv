import React, { useState, useEffect, useRef } from 'react'
import { Search, Plus, Minus, Smartphone, Package, ShoppingBag, Trash2, X, AlertTriangle, Filter, ChevronRight, Coffee, Pizza, Apple, Milk, Brush, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { saveOfflineSale } from '../lib/db'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../context/ToastContext'
import LoadingOverlay from '../components/LoadingOverlay'

const POS = () => {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem('mme_pos_cart')
        return saved ? JSON.parse(saved) : []
    })
    const [tasaBcv, setTasaBcv] = useState(46.5)
    const [loading, setLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const searchRef = useRef(null)

    useEffect(() => {
        localStorage.setItem('mme_pos_cart', JSON.stringify(cart))
    }, [cart])

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
        try {
            const [{ data: cats, error: errCats }, { data: prods, error: errProds }, { data: cfg, error: errCfg }] = await Promise.all([
                supabase.from('categorias').select('*').order('orden'),
                supabase.from('productos_con_precios').select('*'),
                supabase.from('configuracion').select('tasa_bcv').single(),
            ])

            if (errCats) console.error('Error fetching categories:', errCats)
            if (errProds) console.error('Error fetching products:', errProds)
            if (errCfg) console.error('Error fetching config:', errCfg)

            setCategories(cats || [])
            setProducts(prods || [])
            if (cfg) setTasaBcv(cfg.tasa_bcv)
        } catch (err) {
            console.error('Critical error in POS init:', err)
        } finally {
            setLoading(false)
        }
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

    const { showToast } = useToast()

    const handleCheckout = async () => {
        if (!cart.length || isProcessing) return
        setIsProcessing(true)
        const payload = {
            p_total_usd: total,
            p_tasa_bcv: tasaBcv,
            p_productos: cart.map(i => ({ id: i.id, cantidad: i.cantidad, precio: i.precio_venta_usd })),
            p_pagos: [{ metodo: 'efectivo', monto: total }]
        }
        try {
            const { error } = await supabase.rpc('finalizar_venta_v2', payload)
            if (error) throw error
            showToast('VENTA FINALIZADA EXITOSAMENTE')
        } catch {
            await saveOfflineSale({ ...payload, total_usd: total, tasa_bcv: tasaBcv, productos: payload.p_productos, pagos: payload.p_pagos })
            showToast('VENTA GUARDADA EN MODO OFFLINE', 'warning')
        }
        setCart([])
        setIsProcessing(false)
    }

    const getIcon = (name = '') => {
        const n = (name || '').toLowerCase()
        if (n.includes('bebida')) return <Coffee size={16} />
        if (n.includes('snack')) return <Pizza size={16} />
        if (n.includes('fruta')) return <Apple size={16} />
        if (n.includes('lácteo') || n.includes('lacteo')) return <Milk size={16} />
        if (n.includes('limp')) return <Brush size={16} />
        if (n.includes('otros')) return <Layers size={16} />
        return <Package size={16} />
    }

    const filtered = products.filter(p => {
        const q = (searchQuery || '').toLowerCase()
        const nombre = (p.nombre || '').toLowerCase()
        const codigo = (p.codigo_barras || '').toLowerCase()
        const matchSearch = nombre.includes(q) || (codigo && codigo.includes(q))
        const matchCat = !selectedCategory || p.categoria_id === selectedCategory
        return matchSearch && matchCat
    })

    return (
        <div style={{ display: 'flex', height: '100%', gap: 'var(--gap-2)', overflow: 'hidden', position: 'relative' }}>

            <LoadingOverlay isVisible={loading} message="Sincronizando Terminal..." />

            {/* PRODUCT PANEL */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--gap-3)', overflow: 'hidden', minWidth: 0 }}>

                {/* Header Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-3)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: 'var(--gap-2)' }}>
                        {/* Modern Category Dropdown */}
                        <div className="s-custom-select" style={{ width: '15rem' }}>
                            <div
                                className="s-custom-select__trigger"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <Filter size={18} style={{ position: 'absolute', left: '1.2rem', color: 'var(--s-neon)' }} />
                                <span>
                                    {!selectedCategory
                                        ? 'TODOS'
                                        : categories.find(c => c.id === selectedCategory)?.nombre.toUpperCase() || 'FILTRAR...'}
                                </span>
                                <ChevronRight size={18} style={{ transform: isDropdownOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                            </div>

                            <AnimatePresence>
                                {isDropdownOpen && (
                                    <motion.div
                                        className="s-custom-select__options"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <div
                                            className={`s-custom-select__option ${!selectedCategory ? 'active' : ''}`}
                                            onClick={() => { setSelectedCategory(null); setIsDropdownOpen(false); }}
                                        >
                                            <Layers size={16} />
                                            TODOS
                                        </div>
                                        {categories.map(cat => (
                                            <div
                                                key={cat.id}
                                                className={`s-custom-select__option ${selectedCategory === cat.id ? 'active' : ''}`}
                                                onClick={() => { setSelectedCategory(cat.id); setIsDropdownOpen(false); }}
                                            >
                                                {getIcon(cat.nombre)}
                                                {cat.nombre.toUpperCase()}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="s-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 1.5rem', height: '3.8rem', borderColor: 'rgba(0, 230, 118, 0.2)', boxShadow: 'inset 0 0 20px rgba(0, 230, 118, 0.05)' }}>
                            <Search size={22} style={{ color: 'var(--s-neon)', filter: 'drop-shadow(0 0 5px var(--s-neon-glow))' }} />
                            <input
                                ref={searchRef}
                                className="s-input"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: 0,
                                    backdropFilter: 'none',
                                    fontSize: '1.2rem',
                                    color: 'var(--s-neon)',
                                    fontWeight: '800',
                                    textShadow: '0 0 10px rgba(0, 230, 118, 0.3)'
                                }}
                                placeholder="Escanee código o escriba nombre del producto... (F1)"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <div style={{ fontSize: '0.65rem', fontWeight: 1000, color: 'var(--s-neon)', padding: '0.4rem 0.8rem', background: 'rgba(0, 230, 118, 0.1)', borderRadius: '6px', border: '1px solid rgba(0, 230, 118, 0.2)' }}>F1</div>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="s-scroll" style={{ flex: 1, paddingRight: '0.5rem' }}>
                    <AnimatePresence mode="popLayout">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            className="s-grid-inventory"
                            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}
                        >
                            {filtered.map((p, idx) => {
                                const isLowStock = p.stock_actual <= (p.stock_minimo || 5)
                                const isOutOfStock = p.stock_actual <= 0

                                return (
                                    <motion.div
                                        key={p.id}
                                        layout
                                        variants={{
                                            hidden: { opacity: 0, y: 20, scale: 0.9 },
                                            visible: {
                                                opacity: 1, y: 0, scale: 1,
                                                transition: { delay: idx * 0.03, duration: 0.4 }
                                            }
                                        }}
                                        className="s-product-card"
                                        onClick={() => !isOutOfStock && addToCart(p)}
                                        style={{ opacity: isOutOfStock ? 0.4 : 1, cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
                                    >
                                        <div className="s-product-card__img" style={{ aspectRatio: '1.2/1' }}>
                                            {p.imagen_url ? (
                                                <img src={p.imagen_url} alt={p.nombre} />
                                            ) : (
                                                <Package size={40} style={{ opacity: 0.1 }} />
                                            )}

                                            <div
                                                className="s-product-card__stock"
                                                style={{
                                                    borderColor: isOutOfStock ? '#ff3131' : isLowStock ? '#ff9100' : 'var(--s-neon)',
                                                    background: 'rgba(0,0,0,0.8)'
                                                }}
                                            >
                                                {isOutOfStock ? <X size={10} color="#ff3131" /> : isLowStock ? <AlertTriangle size={10} color="#ff9100" /> : <Plus size={10} color="var(--s-neon)" />}
                                                {isOutOfStock ? 'AGOTADO' : `${p.stock_actual} DISP.`}
                                            </div>
                                        </div>

                                        <div className="s-product-card__info" style={{ padding: '0.75rem' }}>
                                            <h3 style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {p.nombre.toUpperCase()}
                                            </h3>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                                                <div className="s-product-card__price" style={{ fontSize: '1rem' }}>
                                                    ${(p.precio_venta_usd || 0).toFixed(2)}
                                                </div>
                                                <div className="s-btn s-btn-secondary s-btn-icon" style={{ width: '1.8rem', height: '1.8rem' }}>
                                                    <Plus size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </motion.div>
                    </AnimatePresence>

                    {filtered.length === 0 && !loading && (
                        <div style={{ height: '60%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', opacity: 0.2 }}>
                            <Package size={100} strokeWidth={1} />
                            <h2 style={{ fontWeight: 1000, letterSpacing: '0.2em' }}>SIN COINCIDENCIAS</h2>
                        </div>
                    )}
                </div>
            </div>

            {/* CART PANEL */}
            <div className="s-panel" style={{ width: '24rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid var(--s-glass-border)' }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--s-glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>ORDEN ACTUAL</h2>
                        <span style={{ fontSize: '0.65rem', color: 'var(--s-text-dim)', fontWeight: 800 }}>MME-POS-V5</span>
                    </div>
                    <button
                        className="s-btn s-btn-secondary"
                        onClick={() => setCart([])}
                        style={{ height: '2.5rem', width: '2.5rem', padding: 0, color: '#ff3131', borderColor: 'rgba(255, 49, 49, 0.2)' }}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                <div className="s-scroll" style={{ flex: 1, padding: '1.5rem' }}>
                    {cart.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                            <ShoppingBag size={60} strokeWidth={1} />
                            <span style={{ fontWeight: 800, marginTop: '1rem' }}>CARRITO VACÍO</span>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {cart.map(item => (
                                <motion.div key={item.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="s-panel" style={{ padding: '1rem', marginBottom: '0.75rem', display: 'flex', gap: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ width: '3rem', height: '3rem', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', overflow: 'hidden', flexShrink: 0 }}>
                                        {item.imagen_url ? <img src={item.imagen_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} style={{ margin: 'auto', opacity: 0.1 }} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nombre?.toUpperCase() || 'PRODUCTO'}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.2rem 0.5rem' }}>
                                                <button onClick={() => updateQty(item.id, -1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><Minus size={12} /></button>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 900, minWidth: '1rem', textAlign: 'center' }}>{item.cantidad}</span>
                                                <button onClick={() => updateQty(item.id, 1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><Plus size={12} /></button>
                                            </div>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--s-neon)' }}>${(item.precio_venta_usd * item.cantidad).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => removeItem(item.id)} style={{ alignSelf: 'center', background: 'none', border: 'none', color: 'var(--s-text-dim)', cursor: 'pointer' }}><X size={18} /></button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>

                <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--s-glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, color: '#fff', opacity: 0.8 }}>
                            <span>SUBTOTAL</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, color: '#fff', opacity: 0.8 }}>
                            <span>I.V.A (16%)</span>
                            <span>${iva.toFixed(2)}</span>
                        </div>
                        <div style={{ height: '1px', background: 'var(--s-glass-border)', margin: '0.25rem 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 1000, color: '#fff' }}>TOTAL</span>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 1000, color: 'var(--s-neon)', lineHeight: 1.1 }}>${total.toFixed(2)}</div>
                                <div style={{ fontSize: '2rem', fontWeight: 1000, color: '#fff', lineHeight: 1.1, marginTop: '0.25rem' }}>BS {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                    </div>

                    <button
                        className="s-btn s-btn-primary"
                        onClick={handleCheckout}
                        disabled={!cart.length || isProcessing}
                        style={{ width: '100%', height: '4rem', fontSize: '1.2rem', letterSpacing: '0.15em' }}
                    >
                        <Smartphone size={20} />
                        {isProcessing ? 'PROCESANDO...' : 'PAGAR AHORA'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default POS
