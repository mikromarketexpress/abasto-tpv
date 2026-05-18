import React from 'react'
import { ShoppingCart, BarChart3, Layers, HelpCircle, UserPlus, UserMinus, ClipboardList } from 'lucide-react'

const NAV = [
    { id: 'pos', label: 'TERMINAL DE VENTA', Icon: ShoppingCart },
    { id: 'dashboard', label: 'ESTADÍSTICAS', Icon: BarChart3 },
    { id: 'inventory', label: 'INVENTARIO', Icon: Layers },
    { id: 'cuentas-por-cobrar', label: 'CUENTAS POR COBRAR', Icon: UserPlus },
    { id: 'cuentas-por-pagar', label: 'CUENTAS POR PAGAR', Icon: UserMinus },
    { id: 'reportes', label: 'REPORTES', Icon: ClipboardList },
]

const Sidebar = ({ activePage, setActivePage }) => {
    return (
        <aside className="s-sidebar no-print" style={{ width: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column', gap: 'var(--gap-2)', flexShrink: 0 }}>
            <div className="s-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
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

                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                    <button
                        className="s-nav-btn"
                        onClick={() => window.dispatchEvent(new CustomEvent('toggle-help'))}
                    >
                        <HelpCircle size={18} style={{ color: 'var(--s-neon)' }} />
                        AYUDA (F1)
                    </button>
                </div>
            </div>
        </aside>
    )
}

export default Sidebar