import React from 'react'
import { X, Search, ShoppingCart, HelpCircle, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'

const HelpModal = ({ onClose }) => {
    const shortcuts = [
        { key: 'F1', label: 'Buscar Productos', icon: Search },
        { key: 'F2', label: 'Finalizar Venta / Pagar', icon: ShoppingCart },
        { key: 'F5', label: 'Abrir/Cerrar Ayuda', icon: HelpCircle },
        { key: 'ESC', label: 'Cerrar Modales / Salir', icon: LogOut },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-cobalt-deep/60 backdrop-blur-md"
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass w-full max-w-2xl relative z-10 p-8 flex flex-col gap-8 shadow-[0_0_100px_rgba(37,244,89,0.1)] border border-white/20"
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-neon-green/20 rounded-2xl text-neon-green">
                            <HelpCircle size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold">Guía de Comandos</h2>
                            <p className="text-white/50">Micro Market Express POS v2026</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {shortcuts.map((s, i) => (
                        <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4 group hover:border-neon-green/30 transition-all">
                            <div className="w-12 h-12 bg-cobalt-deep rounded-xl flex items-center justify-center font-mono font-bold text-neon-green border border-white/10 group-hover:glow-green transition-all">
                                {s.key}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-sm tracking-tight">{s.label}</p>
                            </div>
                            <s.icon size={18} className="text-white/20" />
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-white/30 uppercase tracking-widest">Soporte Técnico</h3>
                    <div className="glass p-4 text-sm flex justify-between items-center">
                        <span>Para asistencia inmediata contacte al administrador</span>
                        <button className="neu-button px-6 py-2 rounded-xl text-xs font-bold text-neon-green">SOPORTE IA</button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

export default HelpModal
