import React, { useState, useMemo } from 'react'
import { Search, UserPlus, FileText, DollarSign, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { getEstadoVencimiento, formatCurrency } from '../lib/vencimientoUtils'

const CUENTAS_EJEMPLO = [
    { id: 1, nombre: 'Juan Pérez', fecha: '2026-04-15', fechaVencimiento: '2026-04-25', montoOriginal: 150.00, saldoPendiente: 75.00 },
    { id: 2, nombre: 'María Gómez', fecha: '2026-04-20', fechaVencimiento: '2026-05-01', montoOriginal: 200.00, saldoPendiente: 200.00 },
    { id: 3, nombre: 'Carlos Rodríguez', fecha: '2026-04-10', fechaVencimiento: '2026-04-20', montoOriginal: 500.00, saldoPendiente: 0 },
    { id: 4, nombre: 'Ana Martínez', fecha: '2026-04-01', fechaVencimiento: '2026-04-26', montoOriginal: 300.00, saldoPendiente: 180.00 },
    { id: 5, nombre: 'Pedro López', fecha: '2026-04-22', fechaVencimiento: '2026-05-05', montoOriginal: 100.00, saldoPendiente: 100.00 },
    { id: 6, nombre: 'Laura Díaz', fecha: '2026-04-18', fechaVencimiento: '2026-04-27', montoOriginal: 250.00, saldoPendiente: 250.00 },
    { id: 7, nombre: 'Roberto Sánchez', fecha: '2026-04-12', fechaVencimiento: '2026-04-24', montoOriginal: 400.00, saldoPendiente: 400.00 },
]

const CuentasPorCobrar = () => {
    const [search, setSearch] = useState('')
    const [cuentas] = useState(CUENTAS_EJEMPLO)

    const cuentasConEstado = useMemo(() => {
        return cuentas.map(cuenta => ({
            ...cuenta,
            ...getEstadoVencimiento(cuenta.fechaVencimiento, cuenta.saldoPendiente)
        }))
    }, [cuentas])

    const filteredCuentas = useMemo(() => {
        return cuentasConEstado.filter(c =>
            c.saldoPendiente > 0 && c.nombre.toLowerCase().includes(search.toLowerCase())
        )
    }, [cuentasConEstado, search])

    const resumen = useMemo(() => {
        return {
            critico: filteredCuentas.filter(c => c.estado === 'critico').length,
            proximo: filteredCuentas.filter(c => c.estado === 'proximo').length,
            totalPendiente: filteredCuentas.reduce((sum, c) => sum + c.saldoPendiente, 0)
        }
    }, [filteredCuentas])

    const renderBadge = (cuenta) => {
        const { clasificacion, diasRestantes, estado } = cuenta
        
        if (estado === 'pagado') {
            return (
                <span style={{ ...badgeStyle, ...clasificacion }}>
                    <CheckCircle size={12} />
                    PAGADO
                </span>
            )
        }

        const showDias = diasRestantes !== null && diasRestantes !== undefined
        const diasLabel = showDias 
            ? diasRestantes < 0 
                ? `${Math.abs(diasRestantes)} DÍAS VENCIDO` 
                : `${diasRestantes} DÍAS`
            : ''
        
        return (
            <span style={{ ...badgeStyle, background: clasificacion.bg, color: clasificacion.color, borderColor: clasificacion.border }}>
                {estado === 'critico' ? <AlertCircle size={12} /> : <Clock size={12} />}
                {clasificacion.label}
                {showDias && diasRestantes <= 7 && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', opacity: 0.8 }}>
                        ({diasLabel})
                    </span>
                )}
            </span>
        )
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1rem' }}>
            <div className="s-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <UserPlus size={28} style={{ color: 'var(--s-neon)' }} />
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '0.05em' }}>
                        CUENTAS POR COBRAR
                    </h1>
                </div>
            </div>

            <div className="s-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--s-neon)' }} />
                        <input
                            name="buscar"
                            id="cobrar-buscar"
                            type="text"
                            className="s-input"
                            placeholder="Buscar deudor..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: '3rem' }}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="s-panel" style={{ padding: '0.75rem 1rem', minWidth: '140px' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--s-text-dim)', display: 'block' }}>TOTAL PENDIENTE</span>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--s-neon)' }}>{formatCurrency(resumen.totalPendiente)}</span>
                    </div>
                    <div className="s-panel" style={{ padding: '0.75rem 1rem', minWidth: '140px', borderColor: 'rgba(255,49,49,0.3)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--s-text-dim)', display: 'block' }}>CRÍTICOS</span>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: '#ff3131' }}>{resumen.critico}</span>
                    </div>
                    <div className="s-panel" style={{ padding: '0.75rem 1rem', minWidth: '140px', borderColor: 'rgba(255,193,7,0.3)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--s-text-dim)', display: 'block' }}>PRÓXIMOS</span>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: '#ffc107' }}>{resumen.proximo}</span>
                    </div>
                </div>
            </div>

            <div className="s-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="s-scroll" style={{ flex: 1, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#0d121c', zIndex: 1 }}>
                            <tr>
                                <th style={thStyle}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserPlus size={14} /> NOMBRE</div></th>
                                <th style={thStyle}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14} /> FECHA</div></th>
                                <th style={thStyle}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14} /> VENCE</div></th>
                                <th style={thStyle}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DollarSign size={14} /> MONTO</div></th>
                                <th style={thStyle}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={14} /> SALDO</div></th>
                                <th style={thStyle}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={14} /> ESTADO</div></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCuentas.map((cuenta) => (
                                <tr key={cuenta.id} style={{ 
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    background: cuenta.estado === 'critico' ? 'rgba(255,49,49,0.05)' : cuenta.estado === 'proximo' ? 'rgba(255,193,7,0.03)' : 'transparent'
                                }}>
                                    <td style={tdStyle}>{cuenta.nombre}</td>
                                    <td style={tdStyle}>{cuenta.fecha}</td>
                                    <td style={{ ...tdStyle, color: cuenta.estado === 'critico' ? '#ff3131' : cuenta.estado === 'proximo' ? '#ffc107' : 'var(--s-text-primary)' }}>
                                        {cuenta.fechaVencimiento}
                                    </td>
                                    <td style={tdStyle}>{formatCurrency(cuenta.montoOriginal)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--s-neon)' }}>{formatCurrency(cuenta.saldoPendiente)}</td>
                                    <td style={tdStyle}>{renderBadge(cuenta)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

const thStyle = {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.7rem',
    fontWeight: 900,
    color: 'var(--s-text-dim)',
    borderBottom: '1px solid var(--s-glass-border)',
}

const tdStyle = {
    padding: '1rem',
    fontSize: '0.85rem',
    color: 'var(--s-text-primary)'
}

const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.35rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: 800,
    border: '1px solid'
}

export default CuentasPorCobrar