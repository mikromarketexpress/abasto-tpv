import React, { useState, useEffect } from 'react'
import { ShoppingCart, BarChart3, Layers, Coffee, Pizza, Apple, Milk, Brush, HelpCircle } from 'lucide-react'
import { useDatabase } from '../hooks/useDatabase'

const NAV = [
    { id: 'pos', label: 'TERMINAL DE VENTA', Icon: ShoppingCart },
    { id: 'dashboard', label: 'ESTADÍSTICAS', Icon: BarChart3 },
    { id: 'inventory', label: 'INVENTARIO', Icon: Layers },
]

const getCatIcon = (name = '') => {
    const n = String(name || '').toLowerCase()
    if (n.includes('bebida')) return <Coffee size={16} />
    if (n.includes('snack')) return <Pizza size={16} />
    if (n.includes('fruta')) return <Apple size={16} />
    if (n.includes('lácteo') || n.includes('lacteo')) return <Milk size={16} />
    if (n.includes('limpieza')) return <Brush size={16} />
    return <Layers size={16} />
}

const Sidebar = ({ activePage, setActivePage }) => {
    const { isReady, getCategorias } = useDatabase()
    const [categories, setCategories] = useState([])
    const [activeCategory, setActiveCategory] = useState(null)

    useEffect(() => {
        if (isReady) {
            setCategories(getCategorias())
        }
    }, [isReady, getCategorias])

    const handleCategory = (id) => {
        const next = activeCategory === id ? null : id
        setActiveCategory(next)
        window.dispatchEvent(new CustomEvent('filter-category', { detail: next }))
    }

    return (
        <aside style={{ width: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column', gap: 'var(--gap-2)', flexShrink: 0 }}>
            <div className="s-panel s-scroll" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <span className="s-section-label">Menú Principal</span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {NAV.map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            className={`s-nav-btn ${activePage === id ? 'active' : ''}`}
                            onClick={() => setActivePage(id)}
                        >
                            <Icon size={18} style={{ color: activePage === id ? '#000' : 'var(--s-neon)' }} />
                            {label}
                        </button>
                    ))}
                </div>

                <div className="s-divider" />

                <span className="s-section-label">Categorías</span>
                <div className="s-scroll" style={{ flex: 1 }}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`s-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                            onClick={() => handleCategory(cat.id)}
                        >
                            {getCatIcon(cat.nombre)}
                            {cat.nombre?.toUpperCase() || 'CATEGORÍA'}
                        </button>
                    ))}
                </div>

                <div className="s-divider" />

                <button
                    className="s-nav-btn"
                    onClick={() => window.dispatchEvent(new CustomEvent('toggle-help'))}
                    style={{ marginTop: 'auto' }}
                >
                    <HelpCircle size={18} style={{ color: 'var(--s-neon)' }} />
                    AYUDA (F1)
                </button>
            </div>
        </aside>
    )
}

export default Sidebar
