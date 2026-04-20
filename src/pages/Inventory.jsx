import React, { useState, useEffect } from 'react'
import {
    Search, Plus, Edit2, Package, X, Filter, Layers, Camera, Trash2, Upload, CloudUpload, Image,
    Coffee, Pizza, Apple, Milk, Brush, Wrench, Hammer, Utensils, ShoppingBasket,
    Beer, Candy, IceCream, Wine, Carrot, Construction, Lightbulb, Pipette, Drill, Beef, Fish, Grape, Egg,
    Tv, Speaker, Laptop, Headphones, Printer, Book, Pencil, Gift, Shirt, Footprints, Trash, Droplets, Zap, ShowerHead, Stethoscope, Baby, Dog, Cat, Bike, Truck, Car, Smartphone, Database, Check, Loader
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../context/ToastContext'
import { useDatabase } from '../hooks/useDatabase'
import { useImageStorage } from '../hooks/useImageStorage'
import ImageLinker from '../components/ImageLinker'
import { CategoryDropdown } from '../components/CategoryDropdown'
import CategoryManager from '../components/CategoryManager'

const CATEGORY_ICONS = {
    Coffee, Pizza, Apple, Milk, Brush, Layers, Wrench, Hammer, Utensils, ShoppingBasket,
    Beer, Candy, IceCream, Wine, Carrot, Construction, Lightbulb, Pipette, Drill, Beef, Fish, Grape, Egg,
    Tv, Speaker, Laptop, Headphones, Printer, Book, Pencil, Gift, Shirt, Footprints, Trash, Droplets, Zap,
    ShowerHead, Stethoscope, Baby, Dog, Cat, Bike, Truck, Car, Smartphone, Camera, Database
}

const ICON_GALLERY = {
    'ALIMENTOS': [
        { name: 'Coffee', label: 'BEBIDAS' }, { name: 'Apple', label: 'FRUTAS' }, { name: 'Carrot', label: 'VERDURAS' },
        { name: 'Milk', label: 'LÁCTEOS' }, { name: 'Egg', label: 'HUEVOS' }, { name: 'Beef', label: 'CARNES' },
        { name: 'Fish', label: 'PESCADO' }, { name: 'Pizza', label: 'PANADERÍA' }, { name: 'Utensils', label: 'COMIDA' },
        { name: 'IceCream', label: 'CONGELADOS' }, { name: 'Candy', label: 'DULCES' }, { name: 'ShoppingBasket', label: 'ABARROTES' }
    ],
    'LIMPIEZA Y ASEO': [
        { name: 'Brush', label: 'LIMPIEZA' }, { name: 'Droplets', label: 'ASEO PERSONAL' }, { name: 'ShowerHead', label: 'BAÑO' },
        { name: 'Shirt', label: 'ROPA' }, { name: 'Trash', label: 'PAPELERÍA' }
    ],
    'OTROS': [
        { name: 'Baby', label: 'BEBÉ' }, { name: 'Dog', label: 'MASCOTAS' }, { name: 'Layers', label: 'VARIOS' }
    ]
}

const getIcon = (name = '', iconName = '') => {
    if (iconName && CATEGORY_ICONS[iconName]) {
        const IconComp = CATEGORY_ICONS[iconName]
        return <IconComp size={16} />
    }
    const n = String(name || '').toLowerCase()
    if (n.includes('bebida')) return <CATEGORY_ICONS.Coffee size={16} />
    if (n.includes('snack') || n.includes('dulce')) return <CATEGORY_ICONS.Candy size={16} />
    if (n.includes('fruta') || n.includes('verdura')) return <CATEGORY_ICONS.Apple size={16} />
    if (n.includes('lácteo') || n.includes('lacteo') || n.includes('huevo')) return <CATEGORY_ICONS.Milk size={16} />
    if (n.includes('carne') || n.includes('embutido')) return <CATEGORY_ICONS.Beef size={16} />
    if (n.includes('panader')) return <CATEGORY_ICONS.Pizza size={16} />
    if (n.includes('congelad')) return <CATEGORY_ICONS.IceCream size={16} />
    if (n.includes('limpieza')) return <CATEGORY_ICONS.Brush size={16} />
    if (n.includes('aseo') || n.includes('higiene')) return <CATEGORY_ICONS.Droplets size={16} />
    if (n.includes('mascota')) return <CATEGORY_ICONS.Dog size={16} />
    if (n.includes('bebé')) return <CATEGORY_ICONS.Baby size={16} />
    return <CATEGORY_ICONS.Layers size={16} />
}

const LoadingOverlay = ({ isVisible, message }) => {
    if (!isVisible) return null
    return (
        <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem'
        }}>
            <Loader size={40} style={{ color: 'var(--s-neon)', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--s-neon)', fontWeight: 900, letterSpacing: '0.1em' }}>{message || 'CARGANDO...'}</span>
        </div>
    )
}

const Inventory = () => {
    const { isReady, productos: dbProductos, categorias: dbCategorias, addProducto, updateProducto, deleteProducto, addCategory, deleteCategory, refresh } = useDatabase()
    const { uploadImage, uploading: isUploadingImage } = useImageStorage()
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [search, setSearch] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editForm, setEditForm] = useState({})
    const [formErrors, setFormErrors] = useState([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [editingCategory, setEditingCategory] = useState(null)
    const [categoryName, setCategoryName] = useState('')
    const [selectedIcon, setSelectedIcon] = useState('Layers')
    const [activeIconGroup, setActiveIconGroup] = useState('ALIMENTOS')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [showImageLinker, setShowImageLinker] = useState(false)
    const [showCategoryManager, setShowCategoryManager] = useState(false)
    const { showToast } = useToast()

    const TASA_BCV = 46.5

    useEffect(() => {
        if (isReady) {
            setProducts(dbProductos || [])
            const catsWithAll = [
                { id: 'all', nombre: 'TODAS', icono_nombre: 'Layers' },
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

    const handleEdit = (p) => {
        setIsAdding(false)
        setEditingId(p.id)
        setFormErrors([])
        setEditForm({
            ...p,
            precio_costo: p.precio_costo || 0,
            precio_usd: p.precio_usd || 0,
            stock: p.stock || 0,
            numero_unid: p.numero_unid || 1,
            tasa_bcv: p.tasa_bcv || TASA_BCV
        })
    }

    const handleNew = () => {
        setIsAdding(true)
        setEditingId('new')
        setFormErrors([])
        setEditForm({
            nombre: '',
            precio_costo: 0,
            precio_usd: 0,
            codigo_barras: '',
            categoria_id: categories[1]?.id || '',
            categoria: '',
            categoria_nombre: '',
            stock: 0,
            numero_unid: 1,
            unidad_medida: 'UNIDAD',
            descripcion_corta: '',
            tasa_bcv: TASA_BCV
        })
    }

    const handleImageChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        setEditForm(prev => ({ 
            ...prev, 
            imagen_url: null,
            _imageFile: file,
            _uploadingImage: true,
            _uploadProgress: 'COMPRIMIENDO...'
        }))

        const previewUrl = URL.createObjectURL(file)
        
        setEditForm(prev => ({ 
            ...prev, 
            imagen_url: previewUrl,
            _uploadingImage: false,
            _uploadProgress: null
        }))
    }

    const handleImageUpload = async () => {
        if (!editForm._imageFile) return false
        
        setEditForm(prev => ({ 
            ...prev, 
            _uploadingImage: true,
            _uploadProgress: 'SUBIENDO A GOOGLE DRIVE...'
        }))

        const result = await uploadImage(
            editForm._imageFile, 
            editingId === 'new' ? `prod_${Date.now()}` : editingId
        )

        if (result && result.success) {
            setEditForm(prev => ({ 
                ...prev, 
                imagen_url: result.url,
                _uploadingImage: false,
                _uploadProgress: null,
                _imageFile: null
            }))
            showToast('IMAGEN SUBIDA A GOOGLE DRIVE', 'success')
            return result.url
        } else {
            setEditForm(prev => ({ 
                ...prev, 
                _uploadingImage: false,
                _uploadProgress: null
            }))
            showToast(result?.error || 'FALLO AL SUBIR LA IMAGEN', 'error')
            return null
        }
    }

    const validateForm = (form) => {
        const errors = []
        if (!form.nombre?.trim()) errors.push('nombre')
        if (!form.precio_usd && form.precio_usd !== 0) errors.push('precio_usd')
        if (!form.stock && form.stock !== 0) errors.push('stock')
        return errors
    }

    const saveEdit = async () => {
        if (editForm._uploadingImage || isUploadingImage) {
            showToast('ESPERA A QUE TERMINE DE SUBIR LA IMAGEN', 'warning')
            return
        }

        setIsSaving(true)
        setFormErrors([])

        try {
            const currentErrors = validateForm(editForm)
            if (currentErrors.length > 0) {
                setFormErrors(currentErrors)
                throw new Error('COMPLETA LOS CAMPOS REQUERIDOS')
            }

            if (!editForm.nombre?.trim()) {
                throw new Error('EL NOMBRE ES OBLIGATORIO')
            }

            if (!editForm.precio_usd && editForm.precio_usd !== 0) {
                throw new Error('EL PRECIO DE VENTA ES OBLIGATORIO')
            }

            let finalImageUrl = editForm.imagen_url || ''
            
            if (editForm._imageFile) {
                const uploadResult = await handleImageUpload()
                if (uploadResult) {
                    finalImageUrl = uploadResult
                } else if (editForm._imageFile) {
                    throw new Error('FALLO AL SUBIR LA IMAGEN')
                }
            }

            const selectedCat = categories.find(c => c.id === editForm.categoria_id)
            let categoriaNombre = editForm.categoria_nombre || editForm.categoria || selectedCat?.nombre || ''

            if (!categoriaNombre.trim()) {
                showToast('DEBES SELECCIONAR UNA CATEGORÍA', 'error')
                return
            }

            const tasaBCV = parseFloat(editForm.tasa_bcv) || TASA_BCV

            const payload = {
                id: editingId === 'new' ? crypto.randomUUID() : editingId,
                nombre: String(editForm.nombre || '').trim().toUpperCase(),
                descripcion_corta: String(editForm.descripcion_corta || '').trim(),
                numero_unid: parseFloat(editForm.numero_unid) || 1,
                unidad_medida: String(editForm.unidad_medida || 'UNIDAD'),
                categoria: String(categoriaNombre).trim().toUpperCase(),
                categoria_nombre: String(categoriaNombre).trim().toUpperCase(),
                precio_usd: parseFloat(editForm.precio_usd) || 0,
                precio_costo: parseFloat(editForm.precio_costo) || 0,
                stock: parseInt(editForm.stock) || 0,
                stock_minimo: parseInt(editForm.stock_minimo) || 5,
                imagen_url: String(finalImageUrl || ''),
                codigo_barras: String(editForm.codigo_barras || ''),
                tasa_bcv: String(tasaBCV)
            }

            showToast('GUARDANDO EN GOOGLE SHEETS...', 'info')
            
            if (isAdding) {
                await addProducto(payload)
            } else {
                await updateProducto(payload)
            }

            setEditingId(null)
            showToast(isAdding ? '¡PRODUCTO CREADO CON ÉXITO!' : '¡PRODUCTO ACTUALIZADO!', 'success')
        } catch (error) {
            showToast(error.message || 'ERROR AL GUARDAR', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const deleteProduct = async (id, name) => {
        if (!confirm(`¿Eliminar "${name}"?`)) return
        setIsSaving(true)
        try {
            await deleteProducto(id)
            showToast('Producto eliminado')
            setEditingId(null)
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleCategoryAction = async () => {
        if (!categoryName.trim()) return
        setIsSaving(true)
        try {
            await addCategory({
                id: editingCategory?.id || crypto.randomUUID(),
                nombre: String(categoryName || '').trim().toUpperCase(),
                icono_nombre: selectedIcon,
                icono: { name: selectedIcon, color: '#808080' },
                orden: categories.length + 1
            })
            showToast(editingCategory ? 'Categoría actualizada' : 'Categoría creada')
            setCategoryName('')
            setSelectedIcon('Layers')
            setEditingCategory(null)
            setIsAddingCategory(false)
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const filtered = products.filter(p => {
        const q = String(search || '').toLowerCase()
        const nombre = String(p.nombre || '').toLowerCase()
        const codigo = String(p.codigo_barras || '').toLowerCase()
        const catName = String(p.categoria || p.categoria_nombre || '').toUpperCase()
        const selectedCatUpper = String(selectedCategory).toUpperCase()
        
        const matchesSearch = nombre.includes(q) || codigo.includes(q)
        const matchesCategory = selectedCategory === 'all' || selectedCategory === 'TODAS' || catName === selectedCatUpper
        
        return matchesSearch && matchesCategory
    })

    const getStockColor = (stock, stockMin = 5) => {
        if (stock < 5 || stock < stockMin * 0.1) return '#ff3131'
        if (stock < stockMin * 0.3) return '#ffc107'
        return 'var(--s-neon)'
    }

    const formatPrice = (precioUsd, tasaBcv) => {
        const precio = parseFloat(precioUsd) || 0
        const tasa = parseFloat(tasaBcv) || TASA_BCV
        const bs = precio * tasa
        return {
            usd: precio.toFixed(2),
            bs: bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--gap-3)', overflow: 'hidden', position: 'relative' }}>
            <LoadingOverlay isVisible={isSaving || (loading && products.length === 0)} message={isSaving ? "Guardando..." : "Sincronizando..."} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-3)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#fff' }}>CENTRO DE INVENTARIO</h2>
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--s-neon)', letterSpacing: '0.2em' }}>
                            {filtered.length} PRODUCTOS • GOOGLE SHEETS v8.0
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--gap-2)' }}>
                        <button className="s-btn s-btn-secondary" onClick={() => setShowImageLinker(true)} style={{ height: '3.5rem', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Image size={18} /> VINCULAR IMÁGENES
                        </button>
                        <button className="s-btn s-btn-primary" onClick={() => setIsAddingCategory(true)} style={{ height: '3.5rem', padding: '0 2rem' }}>
                            <Plus size={20} strokeWidth={3} /> CATEGORÍA
                        </button>
                        <button className="s-btn s-btn-primary" onClick={handleNew} style={{ height: '3.5rem', padding: '0 2.5rem' }}>
                            <Plus size={20} strokeWidth={3} /> PRODUCTO
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--gap-2)', alignItems: 'center' }}>
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
                        <input className="s-input" style={{ background: 'transparent', border: 'none', padding: 0, backdropFilter: 'none', fontSize: '1.2rem', color: 'var(--s-neon)', fontWeight: '800' }}
                            placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="s-liquid-header" style={{ flexShrink: 0 }}>
                <span /><span>PRODUCTO</span><span>DESCRIPCIÓN</span><span>CATEGORÍA</span>
                <span style={{ textAlign: 'center' }}>STOCK</span><span style={{ textAlign: 'right' }}>COSTO</span><span style={{ textAlign: 'right' }}>PRECIO</span><span />
            </div>

            <div className="s-scroll" style={{ flex: 1, paddingRight: '1rem' }}>
                <AnimatePresence mode="popLayout">
                    <motion.div initial="hidden" animate="visible" className="s-liquid-list">
                        {filtered.map((p, idx) => {
                            const stockMin = parseInt(p.stock_minimo) || 5
                            const stockActual = parseInt(p.stock) || 0
                            const stockColor = getStockColor(stockActual, stockMin)
                            const pct = Math.min(100, (stockActual / (stockMin * 4)) * 100)
                            
                            const catName = String(p.categoria || p.categoria_nombre || 'SIN CATEGORÍA')
                            const cat = categories.find(c => c.nombre === catName)
                            const prices = formatPrice(p.precio_usd, p.tasa_bcv)
                            const unidadMed = String(p.unidad_medida || 'UNIDAD')

                            return (
                                <motion.div key={String(p.id) || idx} layout variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { delay: idx * 0.04 } } }}
                                    className="s-liquid-row" onClick={() => handleEdit(p)}>
                                    <div className="s-liquid-row__img">
                                        {p.imagen_url ? (
                                            <img src={p.imagen_url} alt={String(p.nombre || '')} style={{ objectFit: 'cover' }} />
                                        ) : (
                                            <Package size={20} style={{ opacity: 0.1 }} />
                                        )}
                                    </div>
                                    <div className="s-liquid-row__info">
                                        <h4>{String(p.nombre || '').toUpperCase()}</h4>
                                        <p>{String(p.codigo_barras || 'SIN SKU')}</p>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
                                            {String(p.descripcion_corta || '—').toUpperCase()}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <div style={{ color: cat?.icono_nombre ? 'var(--s-neon)' : 'var(--s-text-dim)' }}>
                                            {getIcon(cat?.nombre, cat?.icono_nombre)}
                                        </div>
                                        <span className="s-badge s-badge-neon" style={{ fontSize: '0.6rem' }}>
                                            {catName}
                                        </span>
                                    </div>
                                    <div className="s-liquid-row__stock-bar">
                                        <span style={{ color: '#fff', fontSize: '0.7rem' }}>
                                            {stockActual} {unidadMed.toUpperCase()}
                                        </span>
                                        <div className="s-liquid-row__bar-track">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="s-liquid-row__bar-fill" style={{ background: stockColor }} />
                                        </div>
                                    </div>
                                    <div className="s-liquid-row__price" style={{ color: '#fff', opacity: 0.8 }}>
                                        ${parseFloat(p.precio_costo || 0).toFixed(2)}
                                    </div>
                                    <div className="s-liquid-row__price">
                                        ${prices.usd}
                                        <span style={{ display: 'block', fontSize: '0.55rem', color: '#888' }}>{prices.bs} BS</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button className="s-btn s-btn-secondary s-btn-icon" onClick={e => { e.stopPropagation(); handleEdit(p); }}>
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </motion.div>
                </AnimatePresence>

                {filtered.length === 0 && !loading && (
                    <div style={{ height: '60%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', opacity: 0.2 }}>
                        <Package size={120} strokeWidth={1} />
                        <h2 style={{ fontWeight: 1000, letterSpacing: '0.3em' }}>INVENTARIO VACÍO</h2>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {editingId && (
                    <div className="s-overlay" style={{ padding: '0.5rem' }}>
                        <motion.div className="s-overlay__backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingId(null)} />
                        <motion.div className="s-modal s-modal--crystal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ width: 'min(46rem, 98vw)' }}>
                            <div className="s-modal__header" style={{ padding: '0.875rem 1.5rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 1000, color: '#fff' }}>
                                        {isAdding ? 'REGISTRO DE PRODUCTO' : 'GESTIÓN DE PRODUCTO'}
                                    </h2>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--s-neon)' }}>GOOGLE SHEETS v8.0</span>
                                </div>
                                <button className="s-btn s-btn-secondary s-btn-icon" onClick={() => setEditingId(null)}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="s-modal__body" style={{ padding: '1rem 1.5rem', gap: '0.875rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <label className="s-modal__img-preview" style={{ width: '100px', height: '100px', cursor: 'pointer', position: 'relative' }}>
                                        <input type="file" hidden accept="image/*" onChange={handleImageChange} disabled={editForm._uploadingImage} />
                                        {(editForm._uploadingImage || isUploadingImage) ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', background: 'rgba(0,0,0,0.8)', borderRadius: '12px' }}>
                                                <Loader size={28} style={{ color: 'var(--s-neon)', animation: 'spin 1s linear infinite' }} />
                                                <span style={{ fontSize: '0.55rem', color: 'var(--s-neon)', textAlign: 'center' }}>
                                                    {editForm._uploadProgress || 'SUBIENDO...'}
                                                </span>
                                            </div>
                                        ) : editForm.imagen_url ? (
                                            <>
                                                <img src={editForm.imagen_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                                                {editForm._imageFile && (
                                                    <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,230,118,0.2)', border: '1px solid var(--s-neon)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.5rem', color: 'var(--s-neon)', whiteSpace: 'nowrap' }}>
                                                        PENDIENTE SUBIR
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem' }}>
                                                <CloudUpload size={28} style={{ color: '#fff' }} />
                                                <span style={{ fontSize: '0.6rem', color: '#fff' }}>SUBIR</span>
                                            </div>
                                        )}
                                    </label>
                                    {editForm._imageFile && (
                                        <button 
                                            className="s-btn s-btn-secondary" 
                                            onClick={handleImageUpload}
                                            disabled={isUploadingImage}
                                            style={{ fontSize: '0.6rem', height: '2rem', padding: '0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                        >
                                            {isUploadingImage ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={12} />}
                                            SUBIR AHORA
                                        </button>
                                    )}
                                    <span style={{ fontSize: '0.6rem', color: 'var(--s-text-dim)' }}>Click para seleccionar imagen</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>NOMBRE</label>
                                        <input 
                                            className={`s-input ${formErrors.includes('nombre') ? 's-input--error' : ''}`} 
                                            value={editForm.nombre || ''} 
                                            onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} 
                                        />
                                    </div>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>CATEGORÍA</label>
                                        <select 
                                            className="s-select" 
                                            value={editForm.categoria_id || ''} 
                                            onChange={e => {
                                                const cat = categories.find(c => c.id === e.target.value)
                                                setEditForm({ 
                                                    ...editForm, 
                                                    categoria_id: e.target.value,
                                                    categoria: cat?.nombre || '',
                                                    categoria_nombre: cat?.nombre || ''
                                                })
                                            }}
                                            style={{ flex: 1 }}
                                        >
                                            <option value="">-- SELECCIONAR --</option>
                                            {categories.filter(c => c.id !== 'all').map(c => (
                                                <option key={String(c.id)} value={String(c.id)}>
                                                    {String(c.nombre || '').toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="s-field">
                                    <label style={{ color: '#fff' }}>DESCRIPCIÓN</label>
                                    <input 
                                        className="s-input" 
                                        value={editForm.descripcion_corta || ''} 
                                        onChange={e => setEditForm({ ...editForm, descripcion_corta: e.target.value })} 
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>PRECIO (USD)</label>
                                        <input 
                                            className="s-input s-input--neon" 
                                            type="number" 
                                            step="0.01"
                                            value={editForm.precio_usd ?? ''} 
                                            onChange={e => setEditForm({ ...editForm, precio_usd: e.target.value })} 
                                            style={{ textAlign: 'center', fontSize: '1.2rem', color: 'var(--s-neon)' }}
                                        />
                                    </div>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>COSTO (USD)</label>
                                        <input 
                                            className="s-input" 
                                            type="number" 
                                            step="0.01"
                                            value={editForm.precio_costo ?? ''} 
                                            onChange={e => setEditForm({ ...editForm, precio_costo: e.target.value })} 
                                            style={{ textAlign: 'center' }}
                                        />
                                    </div>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>TASA BCV</label>
                                        <input 
                                            className="s-input" 
                                            type="number" 
                                            step="0.01"
                                            value={editForm.tasa_bcv || TASA_BCV} 
                                            onChange={e => setEditForm({ ...editForm, tasa_bcv: e.target.value })} 
                                            style={{ textAlign: 'center' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>STOCK</label>
                                        <input 
                                            className="s-input" 
                                            type="number" 
                                            value={editForm.stock ?? 0} 
                                            onChange={e => setEditForm({ ...editForm, stock: e.target.value })} 
                                            style={{ textAlign: 'center', fontSize: '1.2rem', color: 'var(--s-neon)' }}
                                        />
                                    </div>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>NÚMERO UNID.</label>
                                        <input 
                                            className="s-input" 
                                            type="number" 
                                            value={editForm.numero_unid ?? 1} 
                                            onChange={e => setEditForm({ ...editForm, numero_unid: e.target.value })} 
                                            style={{ textAlign: 'center' }}
                                        />
                                    </div>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>UNIDAD MED.</label>
                                        <select 
                                            className="s-select" 
                                            value={editForm.unidad_medida || 'UNIDAD'} 
                                            onChange={e => setEditForm({ ...editForm, unidad_medida: e.target.value })}
                                        >
                                            <option value="UNIDAD">UNIDAD</option>
                                            <option value="KILOGRAMO">KILOGRAMO</option>
                                            <option value="GRAMO">GRAMO</option>
                                            <option value="LITRO">LITRO</option>
                                            <option value="MILILITRO">MILILITRO</option>
                                            <option value="PAQUETE">PAQUETE</option>
                                            <option value="CAJA">CAJA</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>STOCK MÍNIMO</label>
                                        <input 
                                            className="s-input" 
                                            type="number" 
                                            value={editForm.stock_minimo ?? 5} 
                                            onChange={e => setEditForm({ ...editForm, stock_minimo: e.target.value })} 
                                            style={{ textAlign: 'center' }}
                                        />
                                    </div>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>CÓDIGO / SKU</label>
                                        <input 
                                            className="s-input" 
                                            value={editForm.codigo_barras || ''} 
                                            onChange={e => setEditForm({ ...editForm, codigo_barras: e.target.value })} 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="s-modal__footer" style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1.5rem' }}>
                                {!isAdding && (
                                    <button 
                                        className="s-btn s-btn-secondary" 
                                        onClick={() => deleteProduct(editingId, editForm.nombre)} 
                                        style={{ width: '3rem', color: '#ff3131', borderColor: 'rgba(255,49,49,0.3)' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <button className="s-btn s-btn-secondary" onClick={() => setEditingId(null)} style={{ flex: 1 }}>
                                    CANCELAR
                                </button>
                                <button className="s-btn s-btn-primary" onClick={saveEdit} disabled={isSaving} style={{ flex: 1 }}>
                                    {isSaving ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'GUARDAR'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isAddingCategory && (
                    <div className="s-overlay" style={{ padding: '0.5rem' }}>
                        <motion.div className="s-overlay__backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingCategory(false)} />
                        <motion.div className="s-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ width: 'min(36rem, 98vw)' }}>
                            <div className="s-modal__header">
                                <h2 style={{ fontSize: '1rem', fontWeight: 1000, color: '#fff' }}>NUEVA CATEGORÍA</h2>
                                <button className="s-btn s-btn-secondary s-btn-icon" onClick={() => setIsAddingCategory(false)}>
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="s-modal__body">
                                <div className="s-field">
                                    <label style={{ color: '#fff' }}>NOMBRE</label>
                                    <input className="s-input" value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="EJ: ALIMENTOS" />
                                </div>
                                <div className="s-field">
                                    <label style={{ color: '#fff' }}>ICONO</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                        {Object.keys(CATEGORY_ICONS).slice(0, 12).map(iconName => {
                                            const IconComp = CATEGORY_ICONS[iconName]
                                            return (
                                                <button
                                                    key={iconName}
                                                    onClick={() => setSelectedIcon(iconName)}
                                                    style={{
                                                        width: '2.5rem', height: '2.5rem', borderRadius: '8px',
                                                        background: selectedIcon === iconName ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.05)',
                                                        border: selectedIcon === iconName ? '1px solid var(--s-neon)' : '1px solid transparent',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', color: selectedIcon === iconName ? 'var(--s-neon)' : '#888'
                                                    }}
                                                >
                                                    <IconComp size={18} />
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="s-modal__footer">
                                <button className="s-btn s-btn-secondary" onClick={() => setIsAddingCategory(false)} style={{ flex: 1 }}>CANCELAR</button>
                                <button className="s-btn s-btn-primary" onClick={handleCategoryAction} disabled={isSaving} style={{ flex: 1 }}>
                                    {isSaving ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'CREAR'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showImageLinker && <ImageLinker onClose={() => setShowImageLinker(false)} />}
            {showCategoryManager && <CategoryManager onClose={() => setShowCategoryManager(false)} />}
        </div>
    )
}

export default Inventory