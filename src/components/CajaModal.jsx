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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/40">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20"
            >
                <div className="p-8">
                    <div className="flex justify-between items-start mb-8">
                        <div className={`p-4 rounded-2xl ${type === 'abrir' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                            {type === 'abrir' ? <Unlock size={32} /> : <Lock size={32} />}
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={24} className="text-gray-400" />
                        </button>
                    </div>

                    <h2 className="text-3xl font-black text-gray-800 mb-2">
                        {type === 'abrir' ? 'Apertura de Caja' : 'Cierre de Caja'}
                    </h2>
                    <p className="text-gray-400 font-medium mb-8">
                        {type === 'abrir'
                            ? 'Ingrese el monto inicial de efectivo en caja para comenzar la jornada.'
                            : 'Ingrese el monto final de efectivo en caja para cerrar la jornada.'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[2px] text-gray-400 px-2">
                                Monto en Efectivo (USD)
                            </label>
                            <div className="relative">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
                                    <DollarSign size={24} />
                                </div>
                                <input
                                    autoFocus
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-3xl py-6 pl-14 pr-6 text-3xl font-black text-gray-800 outline-none transition-all placeholder:text-gray-200"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border border-red-100 italic">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-6 rounded-3xl font-black text-xl tracking-wider uppercase transition-all shadow-xl active:scale-[0.98] ${type === 'abrir'
                                ? 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700'
                                : 'bg-red-600 text-white shadow-red-500/20 hover:bg-red-700'
                                } disabled:opacity-50`}
                        >
                            {loading ? 'Procesando...' : (type === 'abrir' ? 'Abrir Caja' : 'Cerrar Caja')}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}

export default CajaModal
