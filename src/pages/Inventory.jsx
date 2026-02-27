import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Plus, Minus, Edit2, ChevronRight, AlertTriangle, Package, X, Smartphone, Filter, Hash, Coffee, Pizza, Apple, Milk, Brush, Layers, Camera, Upload, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LoadingOverlay from '../components/LoadingOverlay'
import { useToast } from '../context/ToastContext'
import { productSchema } from '../lib/schemas'
import { logAudit } from '../lib/audit'

const getIcon = (name = '') => {
    const n = (name || '').toLowerCase()
    if (n.includes('bebida')) return <Coffee size={16} />
    if (n.includes('snack')) return <Pizza size={16} />
    if (n.includes('fruta')) return <Apple size={16} />
    if (n.includes('lácteo') || n.includes('lacteo')) return <Milk size={16} />
    if (n.includes('limpieza')) return <Brush size={16} />
    return <Layers size={16} />
}

const Inventory = () => {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [search, setSearch] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editForm, setEditForm] = useState({})
    const [formErrors, setFormErrors] = useState([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [imageFile, setImageFile] = useState(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [productToDelete, setProductToDelete] = useState(null)
    const { showToast } = useToast()

    useEffect(() => {
        fetchInitialData()
        const channel = supabase
            .channel('inventory-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => fetchProducts())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        try {
            const { data: cats, error: errCats } = await supabase.from('categorias').select('*').order('orden')
            if (errCats) throw errCats
            setCategories(cats || [])
            await fetchProducts()
        } catch (err) {
            console.error('Error in initial data fetch:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase.from('productos_con_precios').select('*')
            if (error) throw error
            setProducts(data || [])
        } catch (err) {
            console.error('Error fetching products:', err)
        }
    }

    const handleEdit = (p) => {
        setIsAdding(false)
        setEditingId(p.id)
        setFormErrors([])
        setEditForm({
            ...p,
            precio_costo: p.precio_costo || 0,
            precio_unitario: p.precio_venta_usd || 0
        })
        setImageFile(null)
    }

    const handleNew = () => {
        setIsAdding(true)
        setEditingId('new')
        setFormErrors([])
        setEditForm({
            nombre: '',
            precio_costo: 0,
            precio_unitario: 0,
            codigo_barras: '',
            categoria_id: categories[0]?.id || '',
            stock_actual: 0,
            numero_unidades: 1,
            unidad_medida: 'UND',
            descripcion_corta: ''
        })
        setImageFile(null)
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
            setEditForm(prev => ({ ...prev, imagen_url: event.target.result }))
            setImageFile(file)
        }
        reader.readAsDataURL(file)
    }

    const validateForm = (form) => {
        const errors = []
        if (!form.nombre?.trim()) errors.push('nombre')
        if (form.precio_costo === null || form.precio_costo === undefined || form.precio_costo === '') errors.push('precio_costo')
        if (form.precio_unitario === null || form.precio_unitario === undefined || form.precio_unitario === '') errors.push('precio_unitario')
        if (form.numero_unidades === null || form.numero_unidades === undefined || form.numero_unidades === '') errors.push('numero_unidades')
        if (form.stock_actual === null || form.stock_actual === undefined || form.stock_actual === '') errors.push('stock_actual')
        if (!form.unidad_medida?.trim()) errors.push('unidad_medida')
        return errors
    }

    const saveEdit = async () => {
        setIsSaving(true)
        try {
            const currentErrors = validateForm(editForm)
            if (currentErrors.length > 0) {
                setFormErrors(currentErrors)
                throw new Error('Faltan datos requeridos. Por favor, complete los campos remarcados en rojo.')
            }
            setFormErrors([])

            // Verificar si el SKU o código de barras ya existe (solo si estamos añadiendo y hay código)
            if (isAdding && editForm.codigo_barras?.trim()) {
                const { data: existing, error: existError } = await supabase
                    .from('productos')
                    .select('id')
                    .eq('codigo_barras', editForm.codigo_barras.trim())
                    .single()

                if (existing) {
                    setFormErrors(['codigo_barras'])
                    showToast('El Producto existe, cambie el código o ingrese uno nuevo', 'warning')
                    setIsSaving(false)
                    return
                }
            }

            const rawData = {
                nombre: editForm.nombre,
                precio_costo: parseFloat(editForm.precio_costo) || 0,
                precio_unitario: parseFloat(editForm.precio_unitario) || 0,
                codigo_barras: editForm.codigo_barras || '',
                categoria_id: editForm.categoria_id,
                stock_actual: parseInt(editForm.stock_actual) || 0,
                numero_unidades: parseFloat(editForm.numero_unidades) || 1,
                unidad_medida: editForm.unidad_medida || 'UNIDAD',
                descripcion_corta: editForm.descripcion_corta || '',
                imagen_url: editForm.imagen_url || null
            }

            const validated = productSchema.safeParse(rawData)
            if (!validated.success) {
                const firstError = validated.error.errors[0].message
                throw new Error(firstError)
            }

            const payload = {
                nombre: validated.data.nombre,
                precio_costo: validated.data.precio_costo,
                precio_venta_usd: validated.data.precio_unitario, // Mapeado al Campo 'PRECIO DE VENTA (UDS)'
                codigo_barras: validated.data.codigo_barras,  // Mapeado al Campo 'CÓDIGO DE BARRAS / SKU'
                categoria_id: validated.data.categoria_id,
                stock_actual: parseInt(validated.data.stock_actual) || 0, // Mapeado directamente a stock_actual
                numero_unid: validated.data.numero_unidades,  // Mapeado al Campo 'NÚMERO UNID.'
                unidad_medida: validated.data.unidad_medida,  // Mapeado al Campo 'UNIDAD MED.'
                descripcion_corta: validated.data.descripcion_corta, // Mapeado al Campo 'DESCRIPCIÓN CORTA'
                imagen_url: validated.data.imagen_url
            }

            if (isAdding) {
                payload.stock_minimo = 5
                payload.esta_activo = true
            }

            console.log("-> PAYLOAD A ENVIAR A SUPABASE (Tabla: productos):", payload)

            let newProductId = editingId;

            if (isAdding) {
                const { data: newProd, error: insertError } = await supabase
                    .from('productos')
                    .insert([payload])
                    .select('id')
                    .single()

                if (insertError) throw insertError
                newProductId = newProd.id

                // Sincronización con Lotes
                // Registramos el valor del stock en el primer lote de 'lotes_inventario'
                if (payload.stock_actual > 0) {
                    const { error: loteError } = await supabase
                        .from('lotes_inventario')
                        .insert([{
                            producto_id: newProductId,
                            cantidad_inicial: payload.stock_actual,
                            cantidad_actual: payload.stock_actual,
                            costo_unitario: payload.precio_costo,
                            fecha_ingreso: new Date().toISOString()
                        }])
                    if (loteError) {
                        console.warn("Error insertando el lote inicial:", loteError)
                        // No interrumpimos la creación principal pero se notifica a consola
                    }
                }
            } else {
                const { error: updateError } = await supabase
                    .from('productos')
                    .update(payload)
                    .eq('id', editingId)
                if (updateError) throw updateError
            }

            await logAudit(
                isAdding ? 'CREATE_PRODUCT' : 'UPDATE_PRODUCT',
                'INVENTORY',
                { nombre: payload.nombre, id: newProductId }
            )

            showToast(isAdding ? 'Producto registrado exitosamente' : 'Cambios guardados')
            setEditingId(null)
            fetchProducts()

        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const deleteProduct = (id, name) => {
        setProductToDelete({ id, name })
    }

    const confirmDeleteProduct = async () => {
        if (!productToDelete) return
        setIsSaving(true)
        try {
            const { error } = await supabase.from('productos').delete().eq('id', productToDelete.id)
            if (error) throw error
            await logAudit('DELETE_PRODUCT', 'INVENTORY', { id: productToDelete.id, nombre: productToDelete.name })
            showToast('Producto eliminado', 'success')
            setEditingId(null)
            setProductToDelete(null)
            fetchProducts()
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const saveCategory = async () => {
        if (!newCategoryName.trim()) return
        setIsSaving(true)
        try {
            const { error } = await supabase.from('categorias').insert([{
                nombre: newCategoryName.trim(),
                orden: categories.length + 1
            }])
            if (error) throw error
            showToast('Categoría creada exitosamente')
            setIsAddingCategory(false)
            setNewCategoryName('')
            fetchInitialData()
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const filtered = products.filter(p => {
        const q = (search || '').toLowerCase()
        const nombre = (p.nombre || '').toLowerCase()
        const codigo = (p.codigo_barras || '').toLowerCase()
        return (nombre.includes(q) || (codigo && codigo.includes(q)))
            && (selectedCategory === 'all' || p.categoria_id === selectedCategory)
    })

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--gap-3)', overflow: 'hidden', position: 'relative' }}>

            <LoadingOverlay isVisible={isSaving || (loading && products.length === 0)} message={isSaving ? "Guardando..." : "Sincronizando Inventario..."} />

            {/* HEADER AREA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-3)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#fff' }}>CENTRO DE INVENTARIO</h2>
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--s-neon)', letterSpacing: '0.2em' }}>
                            {filtered.length} PRODUCTOS EN VISTA
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--gap-2)' }}>
                        <button className="s-btn s-btn-primary" onClick={() => setIsAddingCategory(true)} style={{ height: '3.5rem', padding: '0 2rem' }}>
                            <Plus size={20} strokeWidth={3} />
                            NUEVA CATEGORÍA
                        </button>
                        <button className="s-btn s-btn-primary" onClick={handleNew} style={{ height: '3.5rem', padding: '0 2.5rem' }}>
                            <Plus size={20} strokeWidth={3} />
                            NUEVO PRODUCTO
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--gap-2)', alignItems: 'center' }}>
                    {/* Modern Category Dropdown */}
                    <div className="s-custom-select" style={{ width: '18rem' }}>
                        <div
                            className="s-custom-select__trigger"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <Filter size={18} style={{ position: 'absolute', left: '1.2rem', color: 'var(--s-neon)' }} />
                            <span>
                                {selectedCategory === 'all'
                                    ? 'TODAS LAS CATEGORÍAS'
                                    : categories.find(c => c.id === selectedCategory)?.nombre.toUpperCase() || 'FILTRAR POR...'}
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
                                        className={`s-custom-select__option ${selectedCategory === 'all' ? 'active' : ''}`}
                                        onClick={() => { setSelectedCategory('all'); setIsDropdownOpen(false); }}
                                    >
                                        <Layers size={16} />
                                        TODAS LAS CATEGORÍAS
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

                    {/* Search Input */}
                    <div className="s-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 1.5rem', height: '3.8rem', borderColor: 'rgba(0, 230, 118, 0.2)', boxShadow: 'inset 0 0 20px rgba(0, 230, 118, 0.05)' }}>
                        <Search size={22} style={{ color: 'var(--s-neon)', filter: 'drop-shadow(0 0 5px var(--s-neon-glow))' }} />
                        <input
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
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <div style={{ fontSize: '0.65rem', fontWeight: 1000, color: 'var(--s-neon)', padding: '0.4rem 0.8rem', background: 'rgba(0, 230, 118, 0.1)', borderRadius: '6px', border: '1px solid rgba(0, 230, 118, 0.2)' }}>F1</div>
                    </div>
                </div>
            </div>

            {/* LIQUID LIST AREA */}
            <div className="s-scroll" style={{ flex: 1, paddingRight: '1rem' }}>
                <div className="s-liquid-header">
                    <span />
                    <span>PRODUCTO</span>
                    <span>CATEGORÍA</span>
                    <span style={{ textAlign: 'center' }}>STOCK ACTUAL</span>
                    <span style={{ textAlign: 'right' }}>VALOR UNIT.</span>
                    <span />
                </div>

                <AnimatePresence mode="popLayout">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        className="s-liquid-list"
                    >
                        {filtered.map((p, idx) => {
                            const isLowStock = p.stock_actual <= (p.stock_minimo || 5)
                            const catName = categories.find(c => c.id === p.categoria_id)?.nombre || '—'
                            const pct = Math.min(100, (p.stock_actual / ((p.stock_minimo || 5) * 4)) * 100)

                            return (
                                <motion.div
                                    key={p.id}
                                    layout
                                    variants={{
                                        hidden: { opacity: 0, x: -20 },
                                        visible: {
                                            opacity: 1, x: 0,
                                            transition: { delay: idx * 0.04, duration: 0.3 }
                                        }
                                    }}
                                    className="s-liquid-row"
                                    onClick={() => handleEdit(p)}
                                >
                                    {/* Thumbnail */}
                                    <div className="s-liquid-row__img">
                                        {p.imagen_url ? (
                                            <img src={p.imagen_url} alt={p.nombre} />
                                        ) : (
                                            <Package size={20} style={{ opacity: 0.1 }} />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="s-liquid-row__info">
                                        <h4>{p.nombre.toUpperCase()}</h4>
                                        <p>{p.codigo_barras || 'SIN SKU'}</p>
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <span className="s-badge s-badge-neon">{catName}</span>
                                    </div>

                                    {/* Stock Barra */}
                                    <div className="s-liquid-row__stock-bar">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 1000 }}>
                                            <span style={{ color: isLowStock ? '#ff9100' : 'var(--s-neon)' }}>{p.stock_actual} DISPONIBLES</span>
                                            <span style={{ opacity: 0.3 }}>{p.unidad_medida}</span>
                                        </div>
                                        <div className="s-liquid-row__bar-track">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                className="s-liquid-row__bar-fill"
                                                style={{
                                                    background: isLowStock ? '#ff9100' : 'var(--s-neon)',
                                                    boxShadow: isLowStock ? 'none' : '0 0 10px var(--s-neon-glow)'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="s-liquid-row__price">
                                        ${(p.precio_venta_usd || 0).toFixed(2)}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button className="s-btn s-btn-secondary s-btn-icon" style={{ borderRadius: '8px' }}>
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

            {/* CRYSTAL MODAL (Drawer refactored as Center Modal) */}
            <AnimatePresence>
                {editingId && (
                    <div className="s-overlay" style={{ padding: '0.5rem' }}>
                        <motion.div
                            className="s-overlay__backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditingId(null)}
                        />
                        <motion.div
                            className="s-modal s-modal--crystal"
                            initial={{ scale: 0.9, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 40 }}
                            style={{ width: 'min(46rem, 98vw)', maxHeight: '98vh' }}
                        >
                            <div className="s-modal__header" style={{ padding: '0.875rem 1.5rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 1000, color: '#fff' }}>
                                        {isAdding ? 'REGISTRO DE PRODUCTO' : 'GESTIÓN DE PRODUCTO'}
                                    </h2>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--s-neon)', letterSpacing: '0.12em' }}>
                                        NIVEL DE ACCESO: ADMIN MASTER
                                    </span>
                                </div>
                                <button className="s-btn s-btn-secondary s-btn-icon" onClick={() => setEditingId(null)} style={{ border: 'none', width: '2rem', height: '2rem' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="s-modal__body" style={{ padding: '1rem 1.5rem', gap: '0.875rem', overflow: 'visible' }}>

                                {/* Sección Imagen: Interactiva y Compactada */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
                                    <label className="s-modal__img-preview" style={{ width: '80px', height: '80px', flexShrink: 0, borderRadius: '12px', position: 'relative' }} title="Haga clic para subir foto">
                                        <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                                        {editForm.imagen_url ? (
                                            <img src={editForm.imagen_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Camera size={28} style={{ color: '#fff', filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))' }} />
                                        )}
                                    </label>

                                    {editForm.imagen_url && (
                                        <button
                                            className="s-btn s-btn-secondary s-btn-icon"
                                            onClick={(e) => { e.preventDefault(); setEditForm(prev => ({ ...prev, imagen_url: null })); setImageFile(null); }}
                                            style={{ color: '#ff3131', borderColor: 'rgba(255,49,49,0.5)', width: '2.5rem', height: '2.5rem', boxShadow: '0 0 8px rgba(255,49,49,0.2)' }}
                                            title="Eliminar Foto"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Fila 1: Nombre + Categoría */}
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>NOMBRE COMERCIAL</label>
                                        <input
                                            className={`s-input ${formErrors.includes('nombre') ? 's-input--error' : ''}`}
                                            placeholder="Ingrese el nombre del producto"
                                            value={editForm.nombre || ''}
                                            onChange={e => {
                                                setEditForm({ ...editForm, nombre: e.target.value })
                                                if (formErrors.includes('nombre')) setFormErrors(formErrors.filter(err => err !== 'nombre'))
                                            }}
                                        />
                                    </div>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>CATEGORÍA</label>
                                        <select className="s-select" value={editForm.categoria_id || ''} onChange={e => setEditForm({ ...editForm, categoria_id: e.target.value })}>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.nombre.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Nueva Fila: Descripción Corta */}
                                <div className="s-field">
                                    <label style={{ color: '#fff' }}>DESCRIPCIÓN CORTA</label>
                                    <input
                                        className="s-input"
                                        placeholder="Ingrese descripción"
                                        value={editForm.descripcion_corta || ''}
                                        onChange={e => setEditForm({ ...editForm, descripcion_corta: e.target.value })}
                                    />
                                </div>

                                {/* Fila 2: Costo + Precio Venta */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>COSTO (USD)</label>
                                        <input
                                            className={`s-input s-input--neon ${formErrors.includes('precio_costo') ? 's-input--error' : ''}`}
                                            type="number" step="0.01" min="0" placeholder="0.00"
                                            value={editForm.precio_costo ?? ''}
                                            onChange={e => {
                                                setEditForm({ ...editForm, precio_costo: e.target.value })
                                                if (formErrors.includes('precio_costo')) setFormErrors(formErrors.filter(err => err !== 'precio_costo'))
                                            }}
                                            style={{ textAlign: 'center' }}
                                        />
                                    </div>
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>PRECIO VENTA (USD)</label>
                                        <input
                                            className={`s-input s-input--neon ${formErrors.includes('precio_unitario') ? 's-input--error' : ''}`}
                                            type="number" step="0.01" min="0" placeholder="0.00"
                                            value={editForm.precio_unitario ?? ''}
                                            onChange={e => {
                                                setEditForm({ ...editForm, precio_unitario: e.target.value })
                                                if (formErrors.includes('precio_unitario')) setFormErrors(formErrors.filter(err => err !== 'precio_unitario'))
                                            }}
                                            style={{ textAlign: 'center' }}
                                        />
                                    </div>
                                </div>

                                {/* Fila 3: Existencia, Unidades y Medida en 3 columnas proporcionales */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
                                    {/* Existencia en Tienda */}
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>STOCK</label>
                                        <input
                                            className={`s-input ${formErrors.includes('stock_actual') ? 's-input--error' : ''}`}
                                            type="number" min="0" step="1"
                                            value={editForm.stock_actual ?? 0}
                                            onChange={e => {
                                                setEditForm({ ...editForm, stock_actual: e.target.value })
                                                if (formErrors.includes('stock_actual')) setFormErrors(formErrors.filter(err => err !== 'stock_actual'))
                                            }}
                                            style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 900, color: 'var(--s-neon)', height: '3.8rem' }}
                                        />
                                    </div>

                                    {/* Número de unidades */}
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>NÚMERO UNID.</label>
                                        <input
                                            className={`s-input ${formErrors.includes('numero_unidades') ? 's-input--error' : ''}`}
                                            type="number" min="0" step="0.01"
                                            value={editForm.numero_unidades ?? 1}
                                            onChange={e => {
                                                setEditForm({ ...editForm, numero_unidades: e.target.value })
                                                if (formErrors.includes('numero_unidades')) setFormErrors(formErrors.filter(err => err !== 'numero_unidades'))
                                            }}
                                            style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 900, color: '#fff', height: '3.8rem' }}
                                        />
                                    </div>

                                    {/* Unidad de medida */}
                                    <div className="s-field">
                                        <label style={{ color: '#fff' }}>UNIDAD MED.</label>
                                        <select
                                            className={`s-select ${formErrors.includes('unidad_medida') ? 's-input--error' : ''}`}
                                            value={editForm.unidad_medida || 'UNIDAD'}
                                            onChange={e => {
                                                setEditForm({ ...editForm, unidad_medida: e.target.value })
                                                if (formErrors.includes('unidad_medida')) setFormErrors(formErrors.filter(err => err !== 'unidad_medida'))
                                            }}
                                            style={{ height: '3.8rem', fontSize: '1rem', fontWeight: 800 }}
                                        >
                                            <option value="UNIDAD">UNIDAD</option>
                                            <option value="KILOGRAMO">KILOGRAMO</option>
                                            <option value="GRAMO">GRAMO</option>
                                            <option value="LITRO">LITRO</option>
                                            <option value="MILILITRO">MILILITRO</option>
                                            <option value="BULTO">BULTO</option>
                                            <option value="PAQUETE">PAQUETE</option>
                                            <option value="CAJA">CAJA</option>
                                            <option value="SACO">SACO</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Fila 5: Código / SKU */}
                                <div className="s-field">
                                    <label style={{ color: '#fff' }}>CÓDIGO DE BARRAS / SKU</label>
                                    <input
                                        className={`s-input ${formErrors.includes('codigo_barras') ? 's-input--error' : ''}`}
                                        placeholder="Opcional"
                                        value={editForm.codigo_barras || ''}
                                        onChange={e => {
                                            setEditForm({ ...editForm, codigo_barras: e.target.value })
                                            if (formErrors.includes('codigo_barras')) setFormErrors(formErrors.filter(err => err !== 'codigo_barras'))
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="s-modal__footer" style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1.5rem' }}>
                                {!isAdding && (
                                    <button
                                        className="s-btn s-btn-secondary"
                                        onClick={() => deleteProduct(editingId, editForm.nombre)}
                                        style={{ width: '3rem', height: '3rem', padding: 0, color: '#ff3131', borderColor: 'rgba(255,49,49,0.3)' }}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button className="s-btn s-btn-primary" onClick={saveEdit} style={{ flex: 1, height: '3rem', fontSize: '0.85rem' }}>
                                    {isAdding ? 'REGISTRAR EN BASE DE DATOS' : 'CONFIRMAR ACTUALIZACIÓN'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* CATEGORY MODAL */}
            <AnimatePresence>
                {isAddingCategory && (
                    <div className="s-overlay">
                        <motion.div
                            className="s-overlay__backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddingCategory(false)}
                        />
                        <motion.div
                            className="s-modal s-modal--crystal"
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            style={{ width: '28rem' }}
                        >
                            <div className="s-modal__header">
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 1000, color: '#fff' }}>NUEVA CATEGORÍA</h2>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--s-neon)', letterSpacing: '0.1em' }}>SISTEMA DE CLASIFICACIÓN</span>
                                </div>
                                <button className="s-btn s-btn-secondary s-btn-icon" onClick={() => setIsAddingCategory(false)} style={{ border: 'none' }}><X size={20} /></button>
                            </div>
                            <div className="s-modal__body">
                                <div className="s-field">
                                    <label style={{ color: '#fff' }}>NOMBRE DE LA CATEGORÍA</label>
                                    <input
                                        className="s-input"
                                        autoFocus
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        placeholder="Ej. Bebidas Energéticas"
                                        onKeyDown={e => e.key === 'Enter' && saveCategory()}
                                    />
                                </div>
                            </div>
                            <div className="s-modal__footer">
                                <button className="s-btn s-btn-primary" onClick={saveCategory} style={{ width: '100%', height: '3.5rem' }}>
                                    CREAR CATEGORÍA
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DELETE CONFIRMATION MODAL */}
            <AnimatePresence>
                {productToDelete && (
                    <div className="s-overlay">
                        <motion.div
                            className="s-overlay__backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setProductToDelete(null)}
                        />
                        <motion.div
                            className="s-modal s-modal--crystal"
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            style={{ width: '28rem', border: '1px solid rgba(255, 49, 49, 0.4)', boxShadow: '0 0 20px rgba(255, 49, 49, 0.15)' }}
                        >
                            <div className="s-modal__header" style={{ borderBottomColor: 'rgba(255,49,49,0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <AlertTriangle size={24} style={{ color: '#ff3131', filter: 'drop-shadow(0 0 8px rgba(255,49,49,0.6))' }} />
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 1000, color: '#ff3131', filter: 'drop-shadow(0 0 5px rgba(255,49,49,0.4))' }}>ELIMINAR PRODUCTO</h2>
                                </div>
                                <button className="s-btn s-btn-secondary s-btn-icon" onClick={() => setProductToDelete(null)} style={{ border: 'none' }}>
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="s-modal__body" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                <p style={{ color: 'var(--s-text-primary)' }}>¿Estás seguro de que deseas eliminar permanentemente el producto <strong>{productToDelete.name}</strong>?</p>
                                <p style={{ color: 'var(--s-text-dim)', fontSize: '0.85rem', marginTop: '0.75rem' }}>Esta acción no se puede deshacer y borrará permanentemente todo su historial de inventario y lotes relacionados.</p>
                            </div>
                            <div className="s-modal__footer" style={{ borderTopColor: 'rgba(255,49,49,0.2)' }}>
                                <button className="s-btn s-btn-secondary" onClick={() => setProductToDelete(null)}>CANCELAR</button>
                                <button
                                    className="s-btn"
                                    onClick={confirmDeleteProduct}
                                    style={{ background: 'rgba(255,49,49,0.15)', color: '#ff3131', borderColor: '#ff3131', boxShadow: '0 0 10px rgba(255,49,49,0.3)', fontWeight: 800 }}
                                >
                                    {isSaving ? 'ELIMINANDO...' : 'SÍ, ELIMINAR PRODUCTO'}
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
