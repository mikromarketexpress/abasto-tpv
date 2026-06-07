import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, Plus, Minus, Smartphone, Package, ShoppingBag, Trash2, X, AlertTriangle, Database, CreditCard, Wallet, QrCode, ArrowLeftRight, DollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../context/ToastContext'
import { useDatabase } from '../hooks/useDatabase'
import { useCaja } from '../context/CajaContext'
import { CategoryDropdown } from '../components/CategoryDropdown'
import CategoryManager from '../components/CategoryManager'
import BCVRateMonitor from '../components/BCVRateMonitor'
import BsInput from '../components/BsInput'
import CurrencyInput from '../components/CurrencyInput'
import { formatUSD, formatBS, parseUSDNumber, parseVENumber } from '../lib/financialUtils'
import { getProductImageUrl } from '../lib/imageUtils'
import defaultPlaceholderImg from '../../assets/img/subir_imagen.png'
import { abrirTicketImpresion } from '../lib/ticketPrinter'

const METODOS_PAGO = [
    { id: 'efectivo_usd', nombre: 'EFECTIVO (USD)', icon: DollarSign, color: '#00e676', prefix: '$', type: 'usd' },
    { id: 'efectivo_bs', nombre: 'EFECTIVO (BS)', icon: Wallet, color: '#2196f3', prefix: 'Bs', type: 'bs' },
    { id: 'debito', nombre: 'DÉBITO (PUNTO DE VENTA)', icon: CreditCard, color: '#9c27b0', prefix: 'Bs', type: 'bs' },
    { id: 'pago_movil', nombre: 'PAGO MÓVIL', icon: Smartphone, color: '#ff9800', prefix: 'Bs', type: 'bs' },
    { id: 'bio_pago', nombre: 'BIO PAGO', icon: QrCode, color: '#e91e63', prefix: 'Bs', type: 'bs' },
    { id: 'transferencia', nombre: 'TRANSFERENCIA', icon: ArrowLeftRight, color: '#00bcd4', prefix: 'Bs', type: 'bs' }
]

const POS = () => {
    const { isReady, productos: dbProductos, categorias: dbCategorias, refresh, saveVenta } = useDatabase()
    const { sesionActiva, tasaBCV, isCajaAbierta, setTasaBCV } = useCaja()
    
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
    const [loading, setLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [showCategoryManager, setShowCategoryManager] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    
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
        if (!isCajaAbierta && cart.length > 0) {
            setCart([])
            showToast('CAJA CERRADA - CARRITO LIMPIADO', 'error')
        }
    }, [isCajaAbierta])

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
    const totalBs = total * tasaBCV

    const handleCheckout = useCallback(() => {
        if (!cart.length || isProcessing) return
        if (!isCajaAbierta) {
            showToast('DEBE ABRIR CAJA PARA INICIAR LA VENTA', 'error')
            return
        }
        setShowPaymentModal(true)
    }, [cart.length, isProcessing, isCajaAbierta, showToast])

    const processPayment = useCallback(async (payload) => {
        if (!cart.length || isProcessing) return
        setIsProcessing(true)
        try {
            const { pagos, vuelto_entregado_usd, vuelto_entregado_bs, vuelto_efectivo_bs, vuelto_pago_movil, vuelto_transferencia } = payload
            const tasaActual = parseFloat(tasaBCV) || 46.5
            const totalCosto = cart.reduce((s, i) => s + (parseFloat(i.precio_costo) || 0) * i.cantidad, 0)
            const saleId = crypto.randomUUID()
            const saleFecha = new Date().toISOString()

            const result = await saveVenta({
                id: saleId,
                productos: cart.map(item => ({
                    id: item.id,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio_costo: item.precio_costo || 0,
                    precio_usd: item.precio_usd
                })),
                pago_efectivo_usd: parseUSDNumber(pagos.efectivo_usd),
                pago_efectivo_bs: parseVENumber(pagos.efectivo_bs),
                pago_debito: parseVENumber(pagos.debito),
                pago_pago_movil: parseVENumber(pagos.pago_movil),
                pago_bio_pago: parseVENumber(pagos.bio_pago),
                pago_transferencia: parseVENumber(pagos.transferencia),
                vuelto_entregado_usd: Number(vuelto_entregado_usd) || 0,
                vuelto_entregado_bs: Number(vuelto_entregado_bs) || 0,
                vuelto_efectivo_bs: Number(vuelto_efectivo_bs) || 0,
                vuelto_pago_movil: Number(vuelto_pago_movil) || 0,
                vuelto_transferencia: Number(vuelto_transferencia) || 0,
                total_venta_usd: total,
                total_bs: totalBs,
                total_costo_usd: totalCosto,
                tasa_bcv: tasaActual,
                sesion_caja_id: sesionActiva?.id || null,
                fecha: saleFecha
            })

            if (result && !result.success) {
                throw new Error(result.error || 'FALLO EN EL SERVIDOR AL REGISTRAR LA VENTA')
            }

            abrirTicketImpresion({
                idVenta: saleId,
                fecha: saleFecha,
                sesionCajaId: sesionActiva?.id || null,
                productos: cart,
                pagos,
                vueltoUSD: Number(vuelto_entregado_usd) || 0,
                vueltoBS: Number(vuelto_entregado_bs) || 0,
                subtotalUSD: subtotal,
                ivaUSD: iva,
                totalUSD: total,
                totalBS: totalBs,
                tasaBCV: tasaActual,
            })

            showToast(`VENTA REGISTRADA - TASA: BS ${formatBS(tasaActual)}`)
            setCart([])
            setShowPaymentModal(false)
        } catch (err) {
            showToast('ERROR AL PROCESAR VENTA', 'error')
        } finally {
            setIsProcessing(false)
        }
    }, [cart, isProcessing, tasaBCV, total, totalBs, sesionActiva, saveVenta, showToast])

    const filtered = useMemo(() => {
        const q = String(searchQuery || '').trim().toLowerCase()
        const noFilter = !selectedCategory || selectedCategory === 'all' || selectedCategory === 'TODAS LAS CATEGORÍAS'

        const selectedCat = noFilter ? null : categories.find(c => c.id === selectedCategory)
        const selectedCatName = selectedCat
            ? String(selectedCat.nombre || '').trim().toUpperCase()
            : noFilter ? null : String(selectedCategory || '').trim().toUpperCase()

        return products.filter(p => {
            const nombre = String(p.nombre || '').trim().toLowerCase()
            const codigo = String(p.codigo_barras || '').trim().toLowerCase()
            const productCat = String(p.categoria || p.categoria_nombre || '').trim().toUpperCase()
            const matchSearch = nombre.includes(q) || codigo.includes(q)
            const matchCategory = noFilter || (selectedCatName && productCat === selectedCatName)
            return matchSearch && matchCategory
        })
    }, [products, searchQuery, selectedCategory, categories])

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
                        {isCajaAbierta && <BCVRateMonitor onTasaChange={setTasaBCV} />}
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
                                name="buscar"
                                id="pos-buscar"
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
                                const precioBs = precioUsd * tasaBCV
                                const imagenUrl = getProductImageUrl(p)

                                return (
                                    <motion.div
                                        key={String(p.id) || idx}
                                        layout
                                        variants={{
                                            hidden: { opacity: 0, y: 20, scale: 0.9 },
                                            visible: { opacity: 1, y: 0, scale: 1, transition: { delay: idx * 0.02 } }
                                        }}
                                        className="s-product-card"
                                        onClick={() => {
                                            if (!isCajaAbierta) {
                                                showToast('ACCIÓN BLOQUEADA: DEBE ABRIR CAJA PARA INICIAR UNA ORDEN', 'error')
                                                return
                                            }
                                            !isOutOfStock && addToCart(p)
                                        }}
                                        style={{
                                            opacity: isOutOfStock || !isCajaAbierta ? 0.6 : 1,
                                            cursor: isOutOfStock || !isCajaAbierta ? 'not-allowed' : 'pointer',
                                            borderColor: isOutOfStock ? '#ff3131' : 'transparent'
                                        }}
                                    >
                                        <div className="s-product-card__img" style={{ aspectRatio: '1/1' }}>
                                            {imagenUrl ? (
                                                <img 
                                                    src={imagenUrl} 
                                                    alt={String(p.nombre || '')} 
                                                    style={{ objectFit: 'cover' }}
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => { e.target.src = defaultPlaceholderImg }}
                                                />
                                            ) : (
                                                <img 
                                                    src={defaultPlaceholderImg} 
                                                    alt="Sin imagen"
                                                    style={{ objectFit: 'cover', opacity: 0.5 }}
                                                    referrerPolicy="no-referrer"
                                                />
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
                                                        ${formatUSD(precioUsd)}
                                                    </div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff', marginTop: '0.15rem' }}>
                                                        {isCajaAbierta && tasaBCV > 0 ? `BS ${formatBS(precioBs)}` : 'BS 0,00'}
                                                    </div>
                                                </div>
                                                {isCajaAbierta ? (
                                                    <div className="s-btn s-btn-secondary s-btn-icon" style={{ width: '1.8rem', height: '1.8rem' }}>
                                                        <Plus size={14} />
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '0.5rem', fontWeight: 900, color: '#ff5252', whiteSpace: 'nowrap', padding: '0.2rem 0.4rem', border: '1px solid rgba(255,82,82,0.3)', borderRadius: '4px', background: 'rgba(255,82,82,0.08)' }}>
                                                        CAJA CERRADA
                                                    </div>
                                                )}
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
                        {!isCajaAbierta && cart.length > 0 && (
                            <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#ff5252', background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                BLOQUEADA
                            </span>
                        )}
                        <span style={{ fontSize: '0.6rem', color: 'var(--s-neon)', fontWeight: 900, background: 'rgba(0,230,118,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0,230,118,0.2)' }}>
                            TASA: {formatBS(tasaBCV)} BS
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
                                const precioBs = precioUsd * tasaBCV
                                
                                return (
                                    <motion.div 
                                        key={String(item.id)} 
                                        layout 
                                        initial={{ opacity: 0, x: 20 }} 
                                        animate={{ opacity: 1, x: 0 }} 
                                        className="s-panel" 
                                        style={{ padding: '0.75rem', marginBottom: '0.5rem', display: 'flex', gap: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}
                                    >
                                        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <img 
                                                src={getProductImageUrl(item)} 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                referrerPolicy="no-referrer"
                                                onError={(e) => { e.target.src = defaultPlaceholderImg }} 
                                            />
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
                                                    <button onClick={() => updateQty(item.id, -1)} disabled={!isCajaAbierta} style={{ background: 'none', border: 'none', color: isCajaAbierta ? '#fff' : '#555', cursor: isCajaAbierta ? 'pointer' : 'not-allowed', padding: 0 }}><Minus size={10} /></button>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 900, minWidth: '0.8rem', textAlign: 'center' }}>{item.cantidad}</span>
                                                    <button onClick={() => updateQty(item.id, 1)} disabled={!isCajaAbierta} style={{ background: 'none', border: 'none', color: isCajaAbierta ? '#fff' : '#555', cursor: isCajaAbierta ? 'pointer' : 'not-allowed', padding: 0 }}><Plus size={10} /></button>
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--s-neon)' }}>${formatUSD(precioUsd * item.cantidad)}</span>
                                                <span style={{ fontSize: '0.65rem', color: '#888' }}>{isCajaAbierta && tasaBCV > 0 ? `BS ${formatBS(precioBs * item.cantidad)}` : 'BS 0,00'}</span>
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
                            <span>${formatUSD(subtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#fff', opacity: 0.7 }}>
                            <span>I.V.A (16%)</span>
                            <span>${formatUSD(iva)}</span>
                        </div>
                        <div style={{ height: '1px', background: 'var(--s-glass-border)', margin: '0.25rem 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 1000, color: '#fff' }}>TOTAL</span>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 1000, color: 'var(--s-neon)', lineHeight: 1.1 }}>${formatUSD(total)}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 1000, color: '#fff', lineHeight: 1.1 }}>{isCajaAbierta && tasaBCV > 0 ? `BS ${formatBS(totalBs)}` : 'BS 0,00'}</div>
                            </div>
                        </div>
                    </div>

                    <button
                        className="s-btn s-btn-primary"
                        onClick={handleCheckout}
                        disabled={!cart.length || isProcessing || !isCajaAbierta}
                        style={{
                            width: '100%', height: '3.5rem', fontSize: '1rem', letterSpacing: '0.1em',
                            opacity: !isCajaAbierta ? 0.5 : 1
                        }}
                        title={!isCajaAbierta ? 'Debe abrir caja para iniciar la venta' : ''}
                    >
                        <Smartphone size={18} />
                        {!isCajaAbierta ? 'CAJA CERRADA' : isProcessing ? 'PROCESANDO...' : 'PAGAR'}
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

            <AnimatePresence>
                {showPaymentModal && (
                    <PaymentModal
                        key="payment-modal"
                        total={total}
                        totalBs={totalBs}
                        tasaBcv={tasaBCV}
                        onSubmit={processPayment}
                        onClose={() => setShowPaymentModal(false)}
                    />
                )}
            </AnimatePresence>
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

const PaymentModal = ({ total, totalBs, tasaBcv, onSubmit, onClose }) => {
    const [pagos, setPagos] = useState(() => {
        const init = {}
        METODOS_PAGO.forEach(m => init[m.id] = '')
        return init
    })
    const [loading, setLoading] = useState(false)

    const totalPagadoUSD = useMemo(() => {
        const tasaValida = tasaBcv > 0 ? tasaBcv : 1
        return METODOS_PAGO.reduce((sum, m) => {
            const val = parseFloat(String(pagos[m.id] || '0').replace(',', '.')) || 0
            return sum + (m.type === 'usd' ? val : val / tasaValida)
        }, 0)
    }, [pagos, tasaBcv])

    const falta = Math.max(0, total - totalPagadoUSD)
    const puedeConfirmar = totalPagadoUSD >= total - 0.01

    const handleChange = (id, value) => setPagos(prev => ({ ...prev, [id]: String(value) }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!puedeConfirmar || loading) return
        setLoading(true)
        try {
            await onSubmit({
                pagos,
                vuelto_entregado_usd: falta > 0 ? 0 : Math.max(0, totalPagadoUSD - total),
                vuelto_entregado_bs: 0,
                vuelto_efectivo_bs: 0,
                vuelto_pago_movil: 0,
                vuelto_transferencia: 0
            })
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.85)',
                zIndex: 9998
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '30rem',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#1a1a1a',
                    borderRadius: '16px',
                    border: '1px solid var(--s-neon)',
                    boxShadow: '0 0 40px rgba(0,230,118,0.15)',
                    zIndex: 1000,
                    overflow: 'hidden'
                }}
            >
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 1000, color: '#fff' }}>DESGLOSE DE PAGO</h2>
                            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--s-neon)' }}>MULTIMÉTODO</p>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '0.5rem' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
                    <div style={{ background: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.15)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#666', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>TOTAL A PAGAR</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 1000, color: 'var(--s-neon)', lineHeight: 1.1 }}>${formatUSD(total)}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginTop: '0.25rem' }}>{tasaBcv > 0 ? `BS ${formatBS(totalBs)}` : 'BS 0,00'}</div>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {METODOS_PAGO.map(({ id, nombre, icon: Icon, color, prefix, type: pType }) => {
                            const isBsDisabled = tasaBcv === 0 && pType === 'bs'
                            return (
                                <div key={id}>
                                    <label style={{ fontSize: '0.55rem', fontWeight: 800, color, letterSpacing: '0.1em', display: 'block', marginBottom: '0.3rem' }}>{nombre}</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color, fontWeight: 900, fontSize: '1.1rem', zIndex: 1 }}>{prefix}</div>
                                            {pType === 'bs' ? (
                                                <BsInput
                                                    value={pagos[id]}
                                                    onChange={v => handleChange(id, v)}
                                                    disabled={isBsDisabled}
                                                    placeholder="0,00"
                                                    color={color}
                                                />
                                            ) : (
                                                <CurrencyInput
                                                    currency="USD"
                                                    value={pagos[id]}
                                                    onChange={v => handleChange(id, v)}
                                                    placeholder="0.00"
                                                    disabled={isBsDisabled}
                                                    color={color}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        <button
                            type="submit"
                            disabled={!puedeConfirmar || loading}
                            style={{
                                height: '3.5rem',
                                fontSize: '0.9rem',
                                fontWeight: 900,
                                borderRadius: '10px',
                                cursor: (!puedeConfirmar || loading) ? 'not-allowed' : 'pointer',
                                border: 'none',
                                background: puedeConfirmar ? 'linear-gradient(135deg, var(--s-neon), #00b248)' : 'rgba(255,255,255,0.05)',
                                color: puedeConfirmar ? '#000' : '#555',
                                opacity: loading ? 0.7 : 1,
                                letterSpacing: '0.1em'
                            }}
                        >
                            {loading ? 'PROCESANDO...' : '✓ CONFIRMAR PAGO'}
                        </button>
                    </form>
                </div>
            </motion.div>
        </motion.div>
    )
}

export default POS