import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, Plus, Minus, Smartphone, Package, ShoppingBag, Trash2, X, AlertTriangle, Database, CreditCard, Wallet, QrCode, ArrowLeftRight, DollarSign, User, Copy } from 'lucide-react'
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
    { id: 'debito', nombre: 'DÉBITO (PUNTO DE VENTA)', icon: CreditCard, color: '#ffffff', prefix: 'Bs', type: 'bs' },
    { id: 'pago_movil', nombre: 'PAGO MÓVIL', icon: Smartphone, color: '#ffffff', prefix: 'Bs', type: 'bs' },
    { id: 'bio_pago', nombre: 'BIO PAGO', icon: QrCode, color: '#ffffff', prefix: 'Bs', type: 'bs' },
    { id: 'transferencia', nombre: 'TRANSFERENCIA', icon: ArrowLeftRight, color: '#ffffff', prefix: 'Bs', type: 'bs' }
]

const pluralizarMedida = (medida, cantidad) => {
    const med = String(medida || 'UNIDAD').toUpperCase()
    const cant = parseFloat(cantidad) || 0
    if (cant === 1) {
        if (med === 'CENTIMETRO_CUBICO' || med === 'CENTIMETRO CUBICO') return 'CENTÍMETRO CÚBICO'
        return med
    }
    if (med === 'UNIDAD') return 'UNIDADES'
    if (med === 'KILOGRAMO') return 'KILOGRAMOS'
    if (med === 'GRAMO') return 'GRAMOS'
    if (med === 'MILIGRAMO') return 'MILIGRAMOS'
    if (med === 'LITRO') return 'LITROS'
    if (med === 'MILILITRO') return 'MILILITROS'
    if (med === 'CENTIMETRO_CUBICO' || med === 'CENTIMETRO CUBICO') return 'CENTÍMETROS CÚBICOS'
    if (med === 'PAQUETE') return 'PAQUETES'
    if (med === 'CAJA') return 'CAJAS'
    return med + 'S'
}

const formatDescripcionTecnica = (p) => {
    const desc = String(p.descripcion_corta || '').trim().toUpperCase()
    const numUnid = parseFloat(p.numero_unid) || 1
    const unidadMed = String(p.unidad_medida || 'UNIDAD').toUpperCase()
    
    const unitFormatted = pluralizarMedida(unidadMed, numUnid)
    const showUnidades = numUnid > 1 || ['KILOGRAMO', 'GRAMO', 'MILIGRAMO', 'LITRO', 'MILILITRO', 'CENTIMETRO_CUBICO', 'CENTIMETRO CUBICO'].includes(unidadMed)
    
    if (showUnidades) {
        const unidStr = `${numUnid} ${unitFormatted}`
        return desc ? `${desc} - ${unidStr}` : unidStr
    }
    
    return desc || '—'
}

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
    
    const [clienteTipo, setClienteTipo] = useState('Persona Natural')
    const [clientePrefix, setClientePrefix] = useState('V-')
    const [clienteNombre, setClienteNombre] = useState('')
    const [clienteIdentificacion, setClienteIdentificacion] = useState('')
    const [clienteCelular, setClienteCelular] = useState('')
    const [clienteDireccion, setClienteDireccion] = useState('')

    const resetClienteData = useCallback(() => {
        setClienteTipo('Persona Natural')
        setClientePrefix('V-')
        setClienteNombre('')
        setClienteIdentificacion('')
        setClienteCelular('')
        setClienteDireccion('')
    }, [])

    const handleClosePaymentModal = useCallback(() => {
        setCart([])
        resetClienteData()
        setShowPaymentModal(false)
    }, [resetClienteData])
    
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
            const { pagos, vuelto_entregado_usd, vuelto_entregado_bs, vuelto_efectivo_bs, vuelto_pago_movil, vuelto_transferencia, cliente_tipo, cliente_nombre, cliente_identificacion, cliente_celular, cliente_direccion } = payload
            const tasaActual = parseFloat(tasaBCV) || 46.5
            const totalCosto = cart.reduce((s, i) => s + (parseFloat(i.precio_costo) || 0) * i.cantidad, 0)
            const saleId = crypto.randomUUID()
            const saleFecha = new Date().toISOString()

            // Enviar la venta a Google Sheets en segundo plano (no bloquea la UI)
            saveVenta({
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
                fecha: saleFecha,
                cliente_tipo: cliente_tipo || 'Persona Natural',
                cliente_nombre: String(cliente_nombre || '').toUpperCase(),
                cliente_identificacion: String(cliente_identificacion || '').toUpperCase(),
                cliente_celular: String(cliente_celular || '').toUpperCase(),
                cliente_direccion: String(cliente_direccion || '').toUpperCase()
            }).then(result => {
                if (result && !result.success) {
                    showToast(`⚠️ NO SINCRONIZÓ EN GOOGLE SHEETS: ${result.error || 'FALLO'}`, 'warning')
                } else {
                    showToast(`✅ VENTA SINCRONIZADA CON ÉXITO`, 'success')
                }
            }).catch(err => {
                showToast(`⚠️ ERROR DE CONEXIÓN AL SINCRONIZAR VENTA`, 'warning')
            })

            // Inmediatamente abrir ticket, limpiar carrito y cerrar modal
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
                clienteTipo: cliente_tipo || 'Persona Natural',
                clienteNombre: String(cliente_nombre || '').toUpperCase(),
                clienteIdentificacion: String(cliente_identificacion || '').toUpperCase(),
                clienteCelular: String(cliente_celular || '').toUpperCase(),
                clienteDireccion: String(cliente_direccion || '').toUpperCase()
            })

            // Decrementar optimistamente el stock local
            setProducts(prevProducts => {
                return prevProducts.map(p => {
                    const cartItem = cart.find(item => item.id === p.id)
                    if (cartItem) {
                        const currentStock = parseInt(p.stock) || 0
                        const soldQty = cartItem.cantidad
                        return { ...p, stock: Math.max(0, currentStock - soldQty) }
                    }
                    return p
                })
            })

            showToast(`VENTA REGISTRADA - TASA: BS ${formatBS(tasaActual)}`)
            setCart([])
            resetClienteData()
            setShowPaymentModal(false)
        } catch (err) {
            showToast('ERROR AL PROCESAR VENTA', 'error')
        } finally {
            setIsProcessing(false)
        }
    }, [cart, isProcessing, tasaBCV, total, totalBs, sesionActiva, saveVenta, showToast, resetClienteData])

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
                                const stockOriginal = parseInt(p.stock) || 0
                                const cartItem = cart.find(item => item.id === p.id)
                                const cartQty = cartItem ? cartItem.cantidad : 0
                                const stock = Math.max(0, stockOriginal - cartQty)
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
                                                {formatDescripcionTecnica(p)}
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
                        clienteTipo={clienteTipo}
                        setClienteTipo={setClienteTipo}
                        clientePrefix={clientePrefix}
                        setClientePrefix={setClientePrefix}
                        clienteNombre={clienteNombre}
                        setClienteNombre={setClienteNombre}
                        clienteIdentificacion={clienteIdentificacion}
                        setClienteIdentificacion={setClienteIdentificacion}
                        clienteCelular={clienteCelular}
                        setClienteCelular={setClienteCelular}
                        clienteDireccion={clienteDireccion}
                        setClienteDireccion={setClienteDireccion}
                        onSubmit={processPayment}
                        onClose={handleClosePaymentModal}
                        onEditOrder={() => setShowPaymentModal(false)}
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

const PaymentModal = ({
    total,
    totalBs,
    tasaBcv,
    clienteTipo,
    setClienteTipo,
    clientePrefix,
    setClientePrefix,
    clienteNombre,
    setClienteNombre,
    clienteIdentificacion,
    setClienteIdentificacion,
    clienteCelular,
    setClienteCelular,
    clienteDireccion,
    setClienteDireccion,
    onSubmit,
    onClose,
    onEditOrder
}) => {
    const tipoCliente = clienteTipo
    const setTipoCliente = setClienteTipo
    const prefixSeleccionado = clientePrefix
    const setPrefixSeleccionado = setClientePrefix
    const nombreCliente = clienteNombre
    const setNombreCliente = setClienteNombre
    const identificacionCliente = clienteIdentificacion
    const setIdentificacionCliente = setClienteIdentificacion
    const celularCliente = clienteCelular
    const setCellularCliente = setClienteCelular
    const direccionCliente = clienteDireccion
    const setDireccionCliente = setClienteDireccion

    const [pagos, setPagos] = useState(() => {
        const init = {}
        METODOS_PAGO.forEach(m => init[m.id] = '')
        return init
    })
    const [showCustomerModal, setShowCustomerModal] = useState(false)
    const [vueltoAsignado, setVueltoAsignado] = useState({
        usd: '',
        bs: '',
        pago_movil: '',
        transferencia: ''
    })
    const [loading, setLoading] = useState(false)
    const { showToast } = useToast()

    const handleCopy = (amount) => {
        const textToCopy = formatBS(amount);
        navigator.clipboard.writeText(textToCopy);
        showToast(`COPIADO: Bs ${textToCopy}`, 'success');
    }

    const totalPagadoUSD = useMemo(() => {
        const tasaValida = tasaBcv > 0 ? tasaBcv : 1
        return METODOS_PAGO.reduce((sum, m) => {
            const val = parseFloat(String(pagos[m.id] || '0').replace(',', '.')) || 0
            return sum + (m.type === 'usd' ? val : val / tasaValida)
        }, 0)
    }, [pagos, tasaBcv])

    const totalVueltoUSD = useMemo(() => {
        const tasaValida = tasaBcv > 0 ? tasaBcv : 1
        const usdVal = parseFloat(String(vueltoAsignado.usd || '0').replace(',', '.')) || 0
        const bsVal = parseFloat(String(vueltoAsignado.bs || '0').replace(',', '.')) || 0
        const pmVal = parseFloat(String(vueltoAsignado.pago_movil || '0').replace(',', '.')) || 0
        const tfVal = parseFloat(String(vueltoAsignado.transferencia || '0').replace(',', '.')) || 0
        return usdVal + ((bsVal + pmVal + tfVal) / tasaValida)
    }, [vueltoAsignado, tasaBcv])

    // El vuelto teórico total que el cliente debe recibir en USD
    const vueltoTeoricoUSD = Math.max(0, totalPagadoUSD - total)
    const vueltoTeoricoBS = vueltoTeoricoUSD * tasaBcv

    // El monto que falta por pagar (si lo pagado es menor al total)
    const falta = Math.max(0, total - totalPagadoUSD)

    // Si pagó de más, debemos validar que la suma declarada de los vueltos (USD/BS/PM/TF) coincida exactamente con el vuelto teórico.
    // Damos una tolerancia de 0.01 USD para evitar problemas de redondeo de punto flotante.
    const tieneVuelto = totalPagadoUSD > total + 0.005
    const vueltoCuadrado = !tieneVuelto || Math.abs(totalVueltoUSD - vueltoTeoricoUSD) < 0.015

    // El botón se habilita si se pagó lo suficiente, el vuelto ha sido desglosado exactamente, y se llenaron los datos obligatorios del cliente.
    const tieneCliente = String(nombreCliente).trim() !== '' && String(identificacionCliente).trim() !== ''
    const puedeConfirmar = totalPagadoUSD >= total - 0.015 && vueltoCuadrado && tieneCliente

    const handleChange = (id, value) => setPagos(prev => ({ ...prev, [id]: String(value) }))
    const handleVueltoChange = (key, value) => setVueltoAsignado(prev => ({ ...prev, [key]: String(value) }))

    const handleNoData = () => {
        setTipoCliente('Persona Natural')
        setPrefixSeleccionado('V-')
        setNombreCliente('SIN DATOS')
        setIdentificacionCliente('SIN DATOS')
        setCellularCliente('SIN DATOS')
        setDireccionCliente('SIN DATOS')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!puedeConfirmar || loading) return
        setLoading(true)
        try {
            // Clean up any manually typed prefix to avoid double prefixes
            const cleanId = String(identificacionCliente).replace(/^[vjgeVJGE]-?/, '').trim()
            await onSubmit({
                pagos,
                vuelto_entregado_usd: parseFloat(String(vueltoAsignado.usd || '0').replace(',', '.')) || 0,
                vuelto_entregado_bs: parseFloat(String(vueltoAsignado.bs || '0').replace(',', '.')) || 0,
                vuelto_efectivo_bs: parseFloat(String(vueltoAsignado.bs || '0').replace(',', '.')) || 0,
                vuelto_pago_movil: parseFloat(String(vueltoAsignado.pago_movil || '0').replace(',', '.')) || 0,
                vuelto_transferencia: parseFloat(String(vueltoAsignado.transferencia || '0').replace(',', '.')) || 0,
                cliente_tipo: tipoCliente,
                cliente_nombre: nombreCliente,
                cliente_identificacion: prefixSeleccionado + cleanId,
                cliente_celular: celularCliente,
                cliente_direccion: direccionCliente
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
                    width: tieneVuelto ? "90rem" : "55rem",
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#1a1a1a',
                    borderRadius: '24px',
                    border: '2px solid var(--s-neon)',
                    boxShadow: '0 0 60px rgba(0,230,118,0.2)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <div style={{ padding: '1.25rem 2.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: '2.2rem', fontWeight: 1000, color: '#fff', margin: 0 }}>DESGLOSE DE PAGO</h2>
                            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--s-neon)', margin: '0.2rem 0 0 0' }}>MULTIMÉTODO</p>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '0.5rem' }}>
                            <X size={36} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem 2.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: tieneVuelto ? 'row' : 'column', gap: '2.5rem' }}>
                        {/* SUB-MODAL PARA INGRESAR DATOS DEL CLIENTE */}
                        <AnimatePresence>
                            {showCustomerModal && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowCustomerModal(false)}
                                    style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        width: '100vw',
                                        height: '100vh',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        background: 'rgba(0,0,0,0.75)',
                                        zIndex: 10000,
                                        backdropFilter: 'blur(4px)'
                                    }}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                            width: '38rem',
                                            background: '#1a1a1a',
                                            borderRadius: '20px',
                                            border: '2px solid var(--s-neon)',
                                            boxShadow: '0 0 40px rgba(0,230,118,0.15)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {/* Header */}
                                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--s-neon)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                <User size={22} />
                                                DATOS DEL CLIENTE
                                            </h3>
                                            <button type="button" onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                                                <X size={26} />
                                            </button>
                                        </div>
                                        {/* Body */}
                                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ccc', letterSpacing: '0.05em' }}>TIPO DE CLIENTE</label>
                                                <select 
                                                    value={tipoCliente} 
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setTipoCliente(val);
                                                        setIdentificacionCliente('');
                                                        setPrefixSeleccionado(val === 'Persona Natural' ? 'V-' : 'J-');
                                                    }}
                                                    className="s-input"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        color: '#fff',
                                                        padding: '0.7rem 1rem',
                                                        borderRadius: '10px',
                                                        fontSize: '1.1rem',
                                                        fontWeight: '800',
                                                        width: '100%',
                                                        outline: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="Persona Natural" style={{ background: '#1a1a1a' }}>Persona Natural</option>
                                                    <option value="Persona Juridica" style={{ background: '#1a1a1a' }}>Persona Jurídica</option>
                                                </select>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ccc', letterSpacing: '0.05em' }}>NOMBRE DEL CLIENTE</label>
                                                <input 
                                                    type="text"
                                                    value={nombreCliente}
                                                    onChange={e => setNombreCliente(e.target.value)}
                                                    placeholder="Ingrese Nombre o Razón Social"
                                                    className="s-input"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        color: '#fff',
                                                        padding: '0.7rem 1rem',
                                                        borderRadius: '10px',
                                                        fontSize: '1.1rem',
                                                        fontWeight: '800',
                                                        width: '100%',
                                                        outline: 'none'
                                                    }}
                                                    required
                                                 />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <label style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ccc', letterSpacing: '0.05em' }}>
                                                        {tipoCliente === 'Persona Natural' ? 'CÉDULA DE IDENTIDAD' : 'RIF'}
                                                    </label>
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        {tipoCliente === 'Persona Natural' ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPrefixSeleccionado('V-')}
                                                                    style={{
                                                                        padding: '0.25rem 0.6rem',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.85rem',
                                                                        fontWeight: '800',
                                                                        border: '1px solid',
                                                                        borderColor: prefixSeleccionado === 'V-' ? 'var(--s-neon)' : 'rgba(255,255,255,0.1)',
                                                                        background: prefixSeleccionado === 'V-' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                        color: prefixSeleccionado === 'V-' ? 'var(--s-neon)' : '#ccc',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    Venezolano (V-)
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPrefixSeleccionado('E-')}
                                                                    style={{
                                                                        padding: '0.25rem 0.6rem',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.85rem',
                                                                        fontWeight: '800',
                                                                        border: '1px solid',
                                                                        borderColor: prefixSeleccionado === 'E-' ? 'var(--s-neon)' : 'rgba(255,255,255,0.1)',
                                                                        background: prefixSeleccionado === 'E-' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                        color: prefixSeleccionado === 'E-' ? 'var(--s-neon)' : '#ccc',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    Extranjero (E-)
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPrefixSeleccionado('J-')}
                                                                    style={{
                                                                        padding: '0.25rem 0.6rem',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.85rem',
                                                                        fontWeight: '800',
                                                                        border: '1px solid',
                                                                        borderColor: prefixSeleccionado === 'J-' ? 'var(--s-neon)' : 'rgba(255,255,255,0.1)',
                                                                        background: prefixSeleccionado === 'J-' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                        color: prefixSeleccionado === 'J-' ? 'var(--s-neon)' : '#ccc',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    Jurídico (J-)
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPrefixSeleccionado('G-')}
                                                                    style={{
                                                                        padding: '0.25rem 0.6rem',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.85rem',
                                                                        fontWeight: '800',
                                                                        border: '1px solid',
                                                                        borderColor: prefixSeleccionado === 'G-' ? 'var(--s-neon)' : 'rgba(255,255,255,0.1)',
                                                                        background: prefixSeleccionado === 'G-' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                        color: prefixSeleccionado === 'G-' ? 'var(--s-neon)' : '#ccc',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    Gubernamental (G-)
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
                                                    {prefixSeleccionado && (
                                                        <div style={{
                                                            background: 'rgba(255,255,255,0.05)',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRight: 'none',
                                                            borderTopLeftRadius: '10px',
                                                            borderBottomLeftRadius: '10px',
                                                            color: '#ffffff',
                                                            fontWeight: '900',
                                                            fontSize: '1.1rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            padding: '0 1rem',
                                                            userSelect: 'none'
                                                        }}>
                                                            {prefixSeleccionado}
                                                        </div>
                                                    )}
                                                    <input 
                                                        type="text"
                                                        value={identificacionCliente}
                                                        onChange={e => setIdentificacionCliente(e.target.value)}
                                                        placeholder={tipoCliente === 'Persona Natural' ? '12345678' : '12345678-9'}
                                                        className="s-input"
                                                        style={{
                                                            background: 'rgba(255,255,255,0.03)',
                                                            border: '1px solid rgba(255,255,255,0.08)',
                                                            color: '#fff',
                                                            padding: '0.7rem 1rem',
                                                            borderRadius: '10px',
                                                            borderTopLeftRadius: prefixSeleccionado ? '0' : '10px',
                                                            borderBottomLeftRadius: prefixSeleccionado ? '0' : '10px',
                                                            fontSize: '1.1rem',
                                                            fontWeight: '800',
                                                            flex: 1,
                                                            outline: 'none'
                                                        }}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ccc', letterSpacing: '0.05em' }}>NÚMERO CELULAR</label>
                                                <input 
                                                    type="tel"
                                                    value={celularCliente}
                                                    onChange={e => setCellularCliente(e.target.value)}
                                                    placeholder="Ej: 0412-1234567"
                                                    className="s-input"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        color: '#fff',
                                                        padding: '0.7rem 1rem',
                                                        borderRadius: '10px',
                                                        fontSize: '1.1rem',
                                                        fontWeight: '800',
                                                        width: '100%',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ccc', letterSpacing: '0.05em' }}>DIRECCIÓN CORTA</label>
                                                <input 
                                                    type="text"
                                                    value={direccionCliente}
                                                    onChange={e => setDireccionCliente(e.target.value)}
                                                    placeholder="Ingresar Dirección"
                                                    className="s-input"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        color: '#fff',
                                                        padding: '0.7rem 1rem',
                                                        borderRadius: '10px',
                                                        fontSize: '1.1rem',
                                                        fontWeight: '800',
                                                        width: '100%',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        {/* Footer */}
                                        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'flex-end' }}>
                                            <button 
                                                type="button" 
                                                onClick={() => setShowCustomerModal(false)} 
                                                className="s-btn s-btn-primary" 
                                                style={{ height: '3.2rem', fontSize: '1.1rem', fontWeight: 900, padding: '0 2rem', borderRadius: '10px' }}
                                            >
                                                ✓ CONFIRMAR DATOS
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* COLUMNA IZQUIERDA: SECCIÓN DE VUELTO (Solo cuando tieneVuelto es true) */}
                        {tieneVuelto && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                style={{
                                    flex: 1,
                                    borderRight: '1px solid rgba(255,255,255,0.06)',
                                    paddingRight: '2.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.25rem'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--s-neon)' }}>DESGLOSE DE VUELTO</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>
                                        TEÓRICO: ${vueltoTeoricoUSD.toFixed(2)} {tasaBcv > 0 ? `(BS ${formatBS(vueltoTeoricoBS)})` : ''}
                                    </span>
                                </div>

                                {vueltoCuadrado ? (
                                    <div style={{ 
                                        background: 'rgba(0,230,118,0.05)', 
                                        border: '1px solid rgba(0,230,118,0.15)', 
                                        borderRadius: '10px', 
                                        padding: '1.25rem', 
                                        textAlign: 'center' 
                                    }}>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 1000, color: 'var(--s-neon)', lineHeight: 1.1 }}>
                                            ✓ MONTO DE VUELTO CUADRADO EXACTAMENTE
                                        </div>
                                    </div>
                                ) : (
                                    (() => {
                                        const diff = vueltoTeoricoUSD - totalVueltoUSD;
                                        const isExcedido = diff < 0;
                                        const absDiffUSD = Math.abs(diff);
                                        const absDiffBS = absDiffUSD * tasaBcv;
                                        
                                        return (
                                            <div style={{ 
                                                background: isExcedido ? 'rgba(255,145,0,0.05)' : 'rgba(255,49,49,0.05)', 
                                                border: `1px solid ${isExcedido ? 'rgba(255,145,0,0.15)' : 'rgba(255,49,49,0.15)'}`, 
                                                borderRadius: '10px', 
                                                padding: '1.25rem', 
                                                textAlign: 'center' 
                                            }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ccc', letterSpacing: '0.15em', marginBottom: '0.35rem' }}>
                                                    {isExcedido ? 'EXCESO A ENTREGAR (REDUCIR MONTOS)' : 'DIFERENCIA POR ASIGNAR'}
                                                </div>
                                                <div style={{ fontSize: '3rem', fontWeight: 1000, color: isExcedido ? '#ff9100' : '#ff3131', lineHeight: 1.1 }}>
                                                    {isExcedido ? '-' : ''}${absDiffUSD.toFixed(2)}
                                                </div>
                                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: '0.35rem' }}>
                                                    {tasaBcv > 0 ? `${isExcedido ? '-' : ''}BS ${formatBS(absDiffBS)}` : 'BS 0,00'}
                                                </div>
                                            </div>
                                        );
                                    })()
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00e676', display: 'block', marginBottom: '0.5rem' }}>VUELTO EN EFECTIVO (USD)</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#00e676', fontWeight: 900, fontSize: '1.4rem' }}>$</div>
                                            <CurrencyInput
                                                currency="USD"
                                                value={vueltoAsignado.usd}
                                                onChange={v => handleVueltoChange('usd', v)}
                                                placeholder="0.00"
                                                color="#00e676"
                                                style={{ fontSize: '1.2rem', padding: '1rem 1.25rem 1rem 3rem' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2196f3', display: 'block', marginBottom: '0.5rem' }}>VUELTO EN EFECTIVO (BS)</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#2196f3', fontWeight: 900, fontSize: '1.4rem' }}>Bs</div>
                                            <BsInput
                                                value={vueltoAsignado.bs}
                                                onChange={v => handleVueltoChange('bs', v)}
                                                placeholder="0,00"
                                                color="#2196f3"
                                                disabled={tasaBcv === 0}
                                                style={{ fontSize: '1.2rem', padding: '1rem 1.25rem 1rem 3rem' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ff9800', display: 'block', marginBottom: '0.5rem' }}>VUELTO PAGO MÓVIL (BS)</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#ff9800', fontWeight: 900, fontSize: '1.4rem' }}>Bs</div>
                                            <BsInput
                                                value={vueltoAsignado.pago_movil}
                                                onChange={v => handleVueltoChange('pago_movil', v)}
                                                placeholder="0,00"
                                                color="#ff9800"
                                                disabled={tasaBcv === 0}
                                                style={{ fontSize: '1.2rem', padding: '1rem 1.25rem 1rem 3rem' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00bcd4', display: 'block', marginBottom: '0.5rem' }}>VUELTO TRANSFERENCIA (BS)</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#00bcd4', fontWeight: 900, fontSize: '1.4rem' }}>Bs</div>
                                            <BsInput
                                                value={vueltoAsignado.transferencia}
                                                onChange={v => handleVueltoChange('transferencia', v)}
                                                placeholder="0,00"
                                                color="#00bcd4"
                                                disabled={tasaBcv === 0}
                                                style={{ fontSize: '1.2rem', padding: '1rem 1.25rem 1rem 3rem' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* COLUMNA DERECHA: DESGLOSE DE PAGO */}
                        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                {/* TOTAL A PAGAR CARD */}
                                <div style={{ background: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.15)', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#888', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>TOTAL A PAGAR</div>
                                    <div style={{ fontSize: '3rem', fontWeight: 1000, color: 'var(--s-neon)', lineHeight: 1.1 }}>${formatUSD(total)}</div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        {tasaBcv > 0 ? `BS ${formatBS(totalBs)}` : 'BS 0,00'}
                                        {tasaBcv > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(totalBs)}
                                                style={{ background: 'none', border: 'none', padding: '0.2rem', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--s-neon)'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                                                title="Copiar monto en Bs"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ESTA FALTANDO CARD */}
                                <div style={{ 
                                    background: falta > 0.005 ? 'rgba(255,49,49,0.05)' : 'rgba(0,230,118,0.05)', 
                                    border: falta > 0.005 ? '1px solid rgba(255,49,49,0.15)' : '1px solid rgba(0,230,118,0.15)', 
                                    borderRadius: '14px', 
                                    padding: '1rem', 
                                    textAlign: 'center',
                                    transition: 'all 0.3s'
                                }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: falta > 0.005 ? '#ff4f4f' : '#888', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>
                                        {falta > 0.005 ? 'ESTÁ FALTANDO' : 'PAGO COMPLETO'}
                                    </div>
                                    <div style={{ fontSize: '3rem', fontWeight: 1000, color: falta > 0.005 ? '#ff3131' : 'var(--s-neon)', lineHeight: 1.1 }}>
                                        ${formatUSD(falta)}
                                    </div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        {tasaBcv > 0 ? `BS ${formatBS(falta * tasaBcv)}` : 'BS 0,00'}
                                        {tasaBcv > 0 && falta > 0.005 && (
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(falta * tasaBcv)}
                                                style={{ background: 'none', border: 'none', padding: '0.2rem', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = '#ff3131'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                                                title="Copiar monto en Bs"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.25rem" }}>
                                {METODOS_PAGO.map(({ id, nombre, icon: Icon, color, prefix, type: pType }) => {
                                    const isBsDisabled = tasaBcv === 0 && pType === 'bs'
                                    return (
                                        <div key={id}>
                                            <label style={{ fontSize: '1.3rem', fontWeight: 800, color, letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <Icon size={20} style={{ color }} />
                                                {nombre}
                                            </label>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <div style={{ position: 'relative', flex: 1 }}>
                                                    <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color, fontWeight: 900, fontSize: '1.5rem', zIndex: 1 }}>{prefix}</div>
                                                    {pType === 'bs' ? (
                                                        <BsInput
                                                            value={pagos[id]}
                                                            onChange={v => handleChange(id, v)}
                                                            disabled={isBsDisabled}
                                                            placeholder="0,00"
                                                            color={color}
                                                            style={{ fontSize: '1.3rem', padding: '1rem 1.25rem 1rem 3.2rem' }}
                                                        />
                                                    ) : (
                                                        <CurrencyInput
                                                            currency="USD"
                                                            value={pagos[id]}
                                                            onChange={v => handleChange(id, v)}
                                                            placeholder="0.00"
                                                            disabled={isBsDisabled}
                                                            color={color}
                                                            style={{ fontSize: '1.3rem', padding: '1rem 1.25rem 1rem 3.2rem' }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                        </div>
                    </div>

                    <div style={{ padding: '1.25rem 2.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', gap: '1.25rem' }}>
                            <button
                                type="button"
                                onClick={onEditOrder}
                                className="s-btn s-btn-secondary"
                                style={{
                                    flex: 1,
                                    height: '4.2rem',
                                    fontSize: '1.2rem',
                                    fontWeight: 900,
                                    borderRadius: '12px',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                ← EDITAR PEDIDO
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCustomerModal(true)}
                                className="s-btn"
                                style={{
                                    flex: 1.2,
                                    height: '4.2rem',
                                    fontSize: '1.2rem',
                                    fontWeight: 900,
                                    borderRadius: '12px',
                                    letterSpacing: '0.05em',
                                    background: tieneCliente ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                    border: tieneCliente ? '1px solid var(--s-neon)' : '1px solid rgba(255,255,255,0.1)',
                                    color: tieneCliente ? 'var(--s-neon)' : '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <User size={18} />
                                {tieneCliente ? 'DATOS: REGISTRADO ✓' : 'DATOS DEL CLIENTE'}
                            </button>
                            <button
                                type="button"
                                onClick={handleNoData}
                                className="s-btn"
                                style={{
                                    flex: 1,
                                    height: '4.2rem',
                                    fontSize: '1.2rem',
                                    fontWeight: 900,
                                    borderRadius: '12px',
                                    letterSpacing: '0.05em',
                                    background: 'rgba(255, 49, 49, 0.08)',
                                    border: '1px solid rgba(255, 49, 49, 0.3)',
                                    color: '#ff4f4f',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <User size={18} />
                                SIN DATOS
                            </button>
                            <button
                                type="submit"
                                disabled={!puedeConfirmar || loading}
                                style={{
                                    flex: 1.5,
                                    height: '4.2rem',
                                    fontSize: '1.2rem',
                                    fontWeight: 900,
                                    borderRadius: '12px',
                                    cursor: (!puedeConfirmar || loading) ? 'not-allowed' : 'pointer',
                                    border: 'none',
                                    background: puedeConfirmar ? 'linear-gradient(135deg, var(--s-neon), #00b248)' : 'rgba(255,255,255,0.05)',
                                    color: puedeConfirmar ? '#000' : '#555',
                                    opacity: loading ? 0.7 : 1,
                                    letterSpacing: '0.05em'
                                }}
                            >
                                {loading ? 'PROCESANDO...' : '✓ CONFIRMAR PAGO'}
                            </button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    )
}

export default POS