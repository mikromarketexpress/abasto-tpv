import React, { useState } from 'react'
import { X, Lock, Unlock, DollarSign, Calculator, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

const CajaModal = ({ type, onClose, onSessionUpdate, terminalId }) => {
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const numAmount = parseFloat(amount.toString().replace(',', '.')) || 0;
        if (isNaN(numAmount)) {
            setError('Por favor ingrese un monto válido')
            setLoading(false)
            return
        }

        try {
            console.log(`PROCESANDO ${type.toUpperCase()}:`, { numAmount, terminalId });

            if (type === 'abrir') {
                const { data, error: err } = await supabase
                    .from('sesiones_caja')
                    .insert([
                        {
                            monto_apertura: numAmount,
                            terminal_id: terminalId || "DEFAULT-TERM",
                            estado: 'abierta',
                            fecha_apertura: new Date().toISOString(),
                            monto_ventas_usd: 0
                        }
                    ])
                    .select()

                if (err) {
                    console.error('ERROR SUPABASE:', err);
                    alert(`Error al abrir caja: ${err.message}`);
                    throw err;
                }

                if (!data || data.length === 0) {
                    throw new Error('La base de datos no devolvió la nueva sesión');
                }

                console.log('SESION CREADA:', data[0]);
                onSessionUpdate(data[0]);
            } else {
                // Fetch current session first
                const { data: openSessions, error: fetchErr } = await supabase
                    .from('sesiones_caja')
                    .select('*')
                    .eq('terminal_id', terminalId)
                    .eq('estado', 'abierta')
                    .limit(1);

                if (fetchErr) throw fetchErr;
                const currentSession = openSessions?.[0];

                if (currentSession) {
                    const { data, error: err } = await supabase
                        .from('sesiones_caja')
                        .update({
                            monto_cierre: numAmount,
                            estado: 'cerrada',
                            fecha_cierre: new Date().toISOString()
                        })
                        .eq('id', currentSession.id)
                        .select();

                    if (err) throw err;
                    onSessionUpdate(null);
                } else {
                    alert('No hay una sesión abierta para cerrar');
                }
            }
            onClose();
        } catch (err) {
            console.error('FALLO CRITICO CAJA:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="s-overlay">
            <motion.div
                className="s-overlay__backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="s-modal"
                style={{ maxWidth: '28rem' }}
            >
                <div className="s-modal__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '3rem', height: '3rem', borderRadius: '12px',
                            background: type === 'abrir' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 82, 82, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: type === 'abrir' ? 'var(--s-neon)' : '#ff5252',
                            border: `1px solid ${type === 'abrir' ? 'var(--s-neon-glow)' : 'rgba(255,82,82,0.3)'}`
                        }}>
                            {type === 'abrir' ? <Unlock size={20} /> : <Lock size={20} />}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>
                                {type === 'abrir' ? 'APERTURA DE CAJA' : 'CIERRE DE CAJA'}
                            </h2>
                            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--s-text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                MME-POS-TERMINAL
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="s-btn s-btn-secondary s-btn-icon" style={{ border: 'none' }}>
                        <X size={20} />
                    </button>
                </div>

                <div className="s-modal__body">
                    <p style={{ fontSize: '0.8rem', color: 'var(--s-text-secondary)', lineHeight: '1.6', textAlign: 'center' }}>
                        {type === 'abrir'
                            ? 'Ingrese el monto inicial de efectivo en caja para comenzar la sesión de ventas.'
                            : 'Ingrese el monto final de efectivo detectado en caja para finalizar la jornada.'}
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label className="s-section-label" style={{ padding: 0 }}>Monto en Efectivo (USD)</label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--s-neon)', fontWeight: 900, fontSize: '1.5rem' }}>
                                    $
                                </div>
                                <input
                                    autoFocus
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="s-input"
                                    style={{ paddingLeft: '3rem', fontSize: '2rem', height: '5rem', fontWeight: 900, textAlign: 'center' }}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.2)', padding: '1rem', borderRadius: 'var(--r-standard)', color: '#ff5252', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <AlertCircle size={16} />
                                {error.toUpperCase()}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`s-btn ${type === 'abrir' ? 's-btn-primary' : 's-btn-secondary'}`}
                            style={{ height: '4rem', fontSize: '1rem', letterSpacing: '0.1em', background: type === 'cerrar' ? 'rgba(255,82,82,0.1)' : undefined, color: type === 'cerrar' ? '#ff5252' : undefined, borderColor: type === 'cerrar' ? 'rgba(255,82,82,0.3)' : undefined }}
                        >
                            {loading ? 'PROCESANDO...' : (type === 'abrir' ? 'INICIAR JORNADA' : 'FINALIZAR JORNADA')}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}

export default CajaModal
