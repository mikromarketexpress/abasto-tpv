import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, Plus, Minus, Smartphone, Package, ShoppingBag, Trash2, X, AlertTriangle, RefreshCw, Database } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../context/ToastContext'
import { useDatabase } from '../hooks/useDatabase'
import { CategoryDropdown } from '../components/CategoryDropdown'
import CategoryManager from '../components/CategoryManager'
import BCVRateMonitor from '../components/BCVRateMonitor'
import { gsService } from '../lib/googleSheetsService'

const POS = () => {
    const { isReady, productos: dbProductos, categorias: dbCategorias, refresh, updateStock } = useDatabase()
    
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem('mme_pos_cart')
            return saved ? JSON.parse(saved) : []
        } catch { return [] }
    })
    const [tasaBcv, setTasaBcv] = useState(() => {
        const saved = localStorage.getItem('mme_tasa_bcv')
        return saved ? parseFloat(saved) : 46.5
    })
    const [loading, setLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [showCategoryManager, setShowCategoryManager] = useState(false)
    
    const searchRef = useRef(null)
    const { showToast } = useToast()

    useEffect(() => {
        if (isReady) {
            setProducts(dbProductos || [])
            const catsWithAll = [
                { id: 'all', nombre: 'TODAS LAS CATEGORÍAS', icono_nombre: 'Layers' },
                ...(dbCategorias || []).map(c => ({
                    id: c.id,
                    nombre: c.nombre,
                    icono_nombre: c.icono_nombre || 'Layers'
                }))
            ]
            setCategories(catsWithAll)
            setLoading(false)
        }
    }, [isReady, dbProductos, dbCategorias])

    useEffect(() => {
        try {
            localStorage.setItem('mme_pos_cart', JSON.stringify(cart))
        } catch {}
    }, [cart])

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'F1') {
                e.preventDefault()
                searchRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [])

    const addToCart = useCallback((product) => {
        const stock = parseInt(product.stock) || 0
        if (stock <= 0) return

        const existingItem = cart.find(i => i.id === product.id)
        if (existingItem && existingItem.cantidad >= stock) {
            showToast(`SÓLO HAY ${stock} DISPONIBLES`, 'error')
            return
        }

        setCart(prev => {
            const ex = prev.find(i => i.id === product.id)
            if (ex) {
                return prev.map(i => i.id === product.id ? { ...i, cantidad: i.cantidad + 1 } : i)
            }
            return [...prev, { ...product, cantidad: 1 }]
        })
    }, [cart, showToast])

    const updateQty = useCallback((id, delta) => {
        const item = cart.find(i => i.id === id)
        if (!item) return

        const stock = parseInt(item.stock) || 0

        if (delta < 0) {
            setCart(prev => prev.map(i => i.id === id ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i))
            return
        }

        if (item.cantidad + delta > stock) {
            showToast(`LÍMITE DE STOCK ALCANZADO`, 'error')
            return
        }

        setCart(prev => prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad + delta } : i))
    }, [cart, showToast])

    const removeItem = useCallback((id) => setCart(prev => prev.filter(i => i.id !== id)), [])

    const subtotal = cart.reduce((s, i) => s + (parseFloat(i.precio_usd) || 0) * i.cantidad, 0)
    const iva = subtotal * 0.16
    const total = subtotal + iva
    const totalBs = total * tasaBcv

    const handleCheckout = useCallback(async () => {
        if (!cart.length || isProcessing) return
        setIsProcessing(true)
        try {
            const tasaActual = parseFloat(tasaBcv) || 46.5
            
            await gsService.saveSale({
                productos: cart.map(item => ({
                    id: item.id,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio_costo: item.precio_costo || 0,
                    precio_usd: item.precio_usd
                })),
                tasa_bcv: tasaActual,
                fecha: new Date().toISOString()
            })
            
            for (const item of cart) {
                const nuevoStock = (parseInt(item.stock) || 0) - item.cantidad
                await updateStock(item.id, Math.max(0, nuevoStock))
            }
            
            showToast(`VENTA REGISTRADA - TASA: BS ${tasaActual.toFixed(2)}`)
            setCart([])
        } catch (err) {
            showToast('ERROR AL PROCESAR VENTA', 'error')
        } finally {
            setIsProcessing(false)
        }
    }, [cart, isProcessing, tasaBcv])

    const filtered = useMemo(() => {
        const q = String(searchQuery || '').toLowerCase()
        const selectedCatUpper = String(selectedCategory || '').toUpperCase()
        
        return products.filter(p => {
            const nombre = String(p.nombre || '').toLowerCase()
            const codigo = String(p.codigo_barras || '').toLowerCase()
            const catName = String(p.categoria || p.categoria_nombre || '').toUpperCase()
            
            const matchSearch = nombre.includes(q) || codigo.includes(q)
            const matchCategory = !selectedCategory || selectedCategory === 'all' || selectedCategory === 'TODAS LAS CATEGORÍAS' || catName === selectedCatUpper
            
            return matchSearch && matchCategory
        })
    }, [products, searchQuery, selectedCategory])

    return (
        <div style={{ display: 'flex', height: '100%', gap: 'var(--gap-2)', overflow: 'hidden', position: 'relative' }}>
            <LoadingOverlay isVisible={loading} message="Sincronizando Terminal..." />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--gap-2)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-2)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 1000, color: '#fff' }}>PUNTO DE VENTA</h2>
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--s-neon)', letterSpacing: '0.1em' }}>
                                {filtered.length} PRODUCTOS • GS v8.0
                            </span>
                        </div>
<button
                            onClick={async () => { await refresh() }}
                            className="s-btn s-btn-secondary"
                            style={{ height: '3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Database size={18} /> SYNC
                        </button>
                        <BCVRateMonitor onTasaChange={setTasaBcv} />
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--gap-2)' }}>
                        <CategoryDropdown
                            categories={categories}
                            products={products}
                            selectedCategory={selectedCategory}
                            onSelectCategory={setSelectedCategory}
                            onManageCategories={() => setShowCategoryManager(true)}
                            isDropdownOpen={isDropdownOpen}
                            setIsDropdownOpen={setIsDropdownOpen}
                        />

                        <div className="s-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 1.5rem', height: '3.8rem', borderColor: 'rgba(0, 230, 118, 0.2)' }}>
                            <Search size={22} style={{ color: 'var(--s-neon)' }} />
                            <input
                                ref={searchRef}
                                className="s-input"
                                style={{
                                    background: 'transparent', border: 'none', padding: 0,
                                    backdropFilter: 'none', fontSize: '1.2rem', color: 'var(--s-neon)', fontWeight: '800'
                                }}
                                placeholder="Escanee código o busque... (F1)"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <div style={{ fontSize: '0.65rem', fontWeight: 1000, color: 'var(--s-neon)', padding: '0.4rem 0.8rem', background: 'rgba(0, 230, 118, 0.1)', borderRadius: '6px', border: '1px solid rgba(0, 230, 118, 0.2)' }}>F1</div>
                        </div>
                    </div>
                </div>

                <div className="s-scroll" style={{ flex: 1, paddingRight: '0.5rem' }}>
                    <AnimatePresence mode="popLayout">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            className="s-grid-inventory"
                            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
                        >
                            {filtered.map((p, idx) => {
                                const stock = parseInt(p.stock) || 0
                                const stockMin = parseInt(p.stock_minimo) || 5
                                const isLowStock = stock <= stockMin
                                const isOutOfStock = stock <= 0
                                const precioUsd = parseFloat(p.precio_usd) || 0
                                const precioBs = precioUsd * tasaBcv
                                const imagenUrl = String(p.imagen_url || '')

                                return (
                                    <motion.div
                                        key={String(p.id) || idx}
                                        layout
                                        variants={{
                                            hidden: { opacity: 0, y: 20, scale: 0.9 },
                                            visible: { opacity: 1, y: 0, scale: 1, transition: { delay: idx * 0.02 } }
                                        }}
                                        className="s-product-card"
                                        onClick={() => !isOutOfStock && addToCart(p)}
                                        style={{
                                            opacity: isOutOfStock ? 0.6 : 1,
                                            cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                                            borderColor: isOutOfStock ? '#ff3131' : 'transparent'
                                        }}
                                    >
                                        <div className="s-product-card__img" style={{ aspectRatio: '1/1' }}>
                                            {imagenUrl ? (
                                                <img src={imagenUrl.startsWith('http') ? imagenUrl : `https://drive.google.com/uc?id=${imagenUrl}&export=download`} alt={String(p.nombre || '')} style={{ objectFit: 'cover' }} />
                                            ) : (
                                                <Package size={40} style={{ opacity: 0.1 }} />
                                            )}
                                            <div
                                                className="s-product-card__stock"
                                                style={{
                                                    borderColor: isOutOfStock ? '#ff3131' : isLowStock ? '#ffc107' : 'var(--s-neon)',
                                                    background: 'rgba(0,0,0,0.85)'
                                                }}
                                            >
                                                {isOutOfStock ? <X size={10} color="#ff3131" /> : isLowStock ? <AlertTriangle size={10} color="#ffc107" /> : <Plus size={10} color="var(--s-neon)" />}
                                                {isOutOfStock ? 'AGOTADO' : `${stock} DISP.`}
                                            </div>
                                        </div>

                                        <div className="s-product-card__info" style={{ padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {String(p.nombre || '').toUpperCase()}
                                            </h3>

                                            <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#fff', opacity: 0.6, textTransform: 'uppercase' }}>
                                                {String(p.descripcion_corta || '—').toUpperCase()}
                                            </p>

                                            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff', opacity: 0.5, textTransform: 'uppercase' }}>
                                                {String(p.codigo_barras || 'SIN SKU')}
                                            </p>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.25rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <div className="s-product-card__price" style={{ fontSize: '0.95rem', fontWeight: 900, lineHeight: 1.1 }}>
                                                        ${precioUsd.toFixed(2)}
                                                    </div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff', marginTop: '0.15rem' }}>
                                                        BS {precioBs.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                    </div>
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
                        <div style={{ height: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', opacity: 0.2 }}>
                            <Package size={80} strokeWidth={1} />
                            <h2 style={{ fontWeight: 1000, letterSpacing: '0.2em' }}>SIN COINCIDENCIAS</h2>
                        </div>
                    )}
                </div>
            </div>

            <div className="s-panel" style={{ width: '22rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid var(--s-glass-border)' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--s-glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>ORDEN ACTUAL</h2>
                        <span style={{ fontSize: '0.6rem', color: 'var(--s-neon)', fontWeight: 900, background: 'rgba(0,230,118,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0,230,118,0.2)' }}>
                            TASA: {Number(tasaBcv).toFixed(2)} BS
                        </span>
                    </div>
                    <button
                        className="s-btn s-btn-secondary"
                        onClick={() => setCart([])}
                        style={{ height: '2.2rem', width: '2.2rem', padding: 0, color: '#ff3131', borderColor: 'rgba(255, 49, 49, 0.2)' }}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                <div className="s-scroll" style={{ flex: 1, padding: '1rem' }}>
                    {cart.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                            <ShoppingBag size={50} strokeWidth={1} />
                            <span style={{ fontWeight: 800, marginTop: '0.5rem', fontSize: '0.8rem' }}>CARRITO VACÍO</span>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {cart.map(item => {
                                const precioUsd = parseFloat(item.precio_usd) || 0
                                const precioBs = precioUsd * tasaBcv
                                
                                return (
                                    <motion.div 
                                        key={String(item.id)} 
                                        layout 
                                        initial={{ opacity: 0, x: 20 }} 
                                        animate={{ opacity: 1, x: 0 }} 
                                        className="s-panel" 
                                        style={{ padding: '0.75rem', marginBottom: '0.5rem', display: 'flex', gap: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}
                                    >
                                        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', overflow: 'hidden', flexShrink: 0 }}>
                                            {item.imagen_url ? (
                                                <img src={item.imagen_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Package size={14} style={{ margin: 'auto', opacity: 0.1 }} />
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                            <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {String(item.nombre || '').toUpperCase()}
                                            </p>
                                            <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#fff', opacity: 0.5 }}>
                                                {String(item.codigo_barras || 'SIN SKU')}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.15rem 0.4rem' }}>
                                                    <button onClick={() => updateQty(item.id, -1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}><Minus size={10} /></button>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 900, minWidth: '0.8rem', textAlign: 'center' }}>{item.cantidad}</span>
                                                    <button onClick={() => updateQty(item.id, 1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}><Plus size={10} /></button>
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--s-neon)' }}>${(precioUsd * item.cantidad).toFixed(2)}</span>
                                                <span style={{ fontSize: '0.65rem', color: '#888' }}>BS {(precioBs * item.cantidad).toLocaleString('es-VE', { minimumFractionDigits: 0 })}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => removeItem(item.id)} style={{ alignSelf: 'center', background: 'none', border: 'none', color: 'var(--s-text-dim)', cursor: 'pointer', padding: 0 }}><X size={14} /></button>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    )}
                </div>

                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--s-glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#fff', opacity: 0.7 }}>
                            <span>SUBTOTAL</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#fff', opacity: 0.7 }}>
                            <span>I.V.A (16%)</span>
                            <span>${iva.toFixed(2)}</span>
                        </div>
                        <div style={{ height: '1px', background: 'var(--s-glass-border)', margin: '0.25rem 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 1000, color: '#fff' }}>TOTAL</span>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 1000, color: 'var(--s-neon)', lineHeight: 1.1 }}>${total.toFixed(2)}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 1000, color: '#fff', lineHeight: 1.1 }}>BS {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 0 })}</div>
                            </div>
                        </div>
                    </div>

                    <button
                        className="s-btn s-btn-primary"
                        onClick={handleCheckout}
                        disabled={!cart.length || isProcessing}
                        style={{ width: '100%', height: '3.5rem', fontSize: '1rem', letterSpacing: '0.1em' }}
                    >
                        <Smartphone size={18} />
                        {isProcessing ? 'PROCESANDO...' : 'PAGAR'}
                    </button>
                </div>
            </div>

            <CategoryManager
                isOpen={showCategoryManager}
                onClose={() => setShowCategoryManager(false)}
                categories={categories.filter(c => c.id !== 'all')}
                products={products}
                onToast={showToast}
            />
        </div>
    )
}

const LoadingOverlay = ({ isVisible, message }) => {
    if (!isVisible) return null
    return (
        <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '1rem', zIndex: 1000
        }}>
            <div style={{
                width: '40px', height: '40px', border: '3px solid rgba(0,230,118,0.2)',
                borderTopColor: 'var(--s-neon)', borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }} />
            <span style={{ color: 'var(--s-neon)', fontWeight: 800 }}>{message}</span>
        </div>
    )
}

export default POS