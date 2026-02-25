import React, { useState, useEffect } from 'react'
import { ShoppingCart, BarChart3, Layers, Settings, Coffee, Pizza, Apple, Milk, Brush, ChevronRight, HelpCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const NAV = [
    { id: 'pos', label: 'TPV', Icon: ShoppingCart },
    { id: 'dashboard', label: 'Estadísticas', Icon: BarChart3 },
    { id: 'inventory', label: 'Inventario', Icon: Layers },
]

const getIcon = (name = '') => {
    const n = name.toLowerCase()
    if (n.includes('bebida')) return <Coffee size={16} />
    if (n.includes('snack')) return <Pizza size={16} />
    if (n.includes('fruta')) return <Apple size={16} />
    if (n.includes('lácteo') || n.includes('lacteo')) return <Milk size={16} />
    if (n.includes('limpieza')) return <Brush size={16} />
    return <Layers size={16} />
}

const Sidebar = ({ activePage, setActivePage }) => {
    const [categories, setCategories] = useState([])
    const [activeCategory, setActiveCategory] = useState(null)

    useEffect(() => {
        supabase.from('categorias').select('*').order('orden').then(({ data }) => {
            if (data) setCategories(data)
        })
    }, [])

    const handleCategory = (id) => {
        const next = activeCategory === id ? null : id
        setActiveCategory(next)
        window.dispatchEvent(new CustomEvent('filter-category', { detail: next }))
    }

    return (
        <aside className="s-layout__sidebar">
            {/* Main nav panel */}
            <div className="s-panel s-scroll" style={{ flex: 1, padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
                <span className="s-label" style={{ padding: '0.25rem var(--sp-3)', marginBottom: 'var(--sp-2)' }}>Menú Principal</span>

                {NAV.map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        className={`s-nav-item ${activePage === id ? (id === 'inventory' ? 'active-green' : 'active') : ''}`}
                        onClick={() => setActivePage(id)}
                    >
                        <Icon size={16} />
                        {label}
                    </button>
                ))}

                {/* Divider */}
                <div className="s-divider" style={{ margin: 'var(--sp-3) 0' }} />

                <span className="s-label" style={{ padding: '0.25rem var(--sp-3)', marginBottom: 'var(--sp-2)' }}>Categorías</span>

                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`s-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => handleCategory(cat.id)}
                    >
                        {getIcon(cat.nombre)}
                        {cat.nombre}
                    </button>
                ))}
            </div>

            {/* Help button */}
            <button
                className="s-panel s-btn-ghost"
                style={{ width: '100%', justifyContent: 'center', padding: 'var(--sp-4)', gap: 'var(--sp-3)' }}
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-help'))}
            >
                <HelpCircle size={16} />
                AYUDA (F5)
            </button>
        </aside>
    )
}

export default Sidebar
