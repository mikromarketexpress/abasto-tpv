import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCcw } from 'lucide-react'
import { gsService } from '../lib/googleSheetsService'

const BCVRateMonitor = ({ onTasaChange }) => {
    const [tasaBcv, setTasaBcv] = useState(() => {
        const saved = localStorage.getItem('mme_tasa_bcv')
        return saved ? parseFloat(saved) : 46.5
    })
    const [tasaFecha, setTasaFecha] = useState(() => {
        return localStorage.getItem('mme_tasa_fecha') || null
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)

    const syncTasa = useCallback(async () => {
        setIsLoading(true)
        setError(false)
        
        try {
            // 1. Forzar actualización de tasa desde el BCV (backend hace scraping)
            const result = await gsService.fetchAndUpdateTasaBcv()
            
            // 2. IMPORTANTE: Refrescar datos para obtener la tasa actualizada del sheet
            await gsService.refresh()
            
            // 3. Obtener la tasa actualizada del cache
            const tasaActualizada = gsService.tasaBcv || gsService.cache?.tasaBCV || 0
            
            if (tasaActualizada > 0) {
                setTasaBcv(tasaActualizada)
                setTasaFecha(gsService.cache?.Tasa?.tasa_fecha || null)
                localStorage.setItem('mme_tasa_bcv', tasaActualizada.toString())
                onTasaChange?.(tasaActualizada)
                setError(false)
            } else {
                setError(true)
            }
        } catch (e) {
            console.error('Error sincronizando tasa:', e)
            // Fallback: intentar con refresh solo
            try {
                await gsService.refresh()
                const tasaCache = gsService.tasaBcv || gsService.cache?.tasaBCV || 0
                if (tasaCache > 0) {
                    setTasaBcv(tasaCache)
                    onTasaChange?.(tasaCache)
                    setError(false)
                } else {
                    setError(true)
                }
            } catch(e2) {
                setError(true)
            }
        } finally {
            setIsLoading(false)
        }
    }, [onTasaChange])

    useEffect(() => {
        // Usar tasa del cache del doGet directamente
        const tasaCache = gsService.tasaBcv || gsService.getTasaBcv() || gsService.cache?.tasaBCV || 0
        if (tasaCache > 0) {
            setTasaBcv(tasaCache)
            onTasaChange?.(tasaCache)
            localStorage.setItem('mme_tasa_bcv', tasaCache.toString())
        } else {
            syncTasa()
        }
    }, [])

    useEffect(() => {
        const interval = setInterval(() => {
            syncTasa()
        }, 60000)
        
        return () => clearInterval(interval)
    }, [syncTasa])

    const formatFecha = (fecha) => {
        if (!fecha) return ''
        try {
            const d = new Date(fecha)
            return d.toLocaleString('es-VE', { 
                day: '2-digit', 
                month: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        } catch { return fecha }
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: error ? 'rgba(255, 193, 7, 0.15)' : 'rgba(0, 230, 118, 0.1)',
            borderRadius: '8px',
            border: `1px solid ${error ? 'rgba(255, 193, 7, 0.4)' : 'rgba(0, 230, 118, 0.3)'}`,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
        }} 
        onClick={syncTasa}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={tasaFecha ? `Última actualización: ${formatFecha(tasaFecha)}` : 'Haz clic para sincronizar'}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
            }}>
                {error ? (
                    <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 900, 
                        color: '#ffc107',
                        letterSpacing: '0.05em'
                    }}>
                        CORTADO
                    </span>
                ) : (
                    <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        color: 'var(--s-neon)',
                        letterSpacing: '0.05em'
                    }}>
                        BCV:
                    </span>
                )}
                <span style={{
                    fontSize: '1rem',
                    fontWeight: 900,
                    color: error ? '#ffc107' : '#fff',
                    fontFamily: 'monospace'
                }}>
                    BS {tasaBcv.toFixed(2)}
                </span>
            </div>
            
            <RefreshCcw 
                size={14} 
                style={{ 
                    color: error ? '#ffc107' : 'var(--s-neon)',
                    animation: isLoading ? 'spin 1s linear infinite' : 'none'
                }} 
            />
            
            {showTooltip && tasaFecha && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '0.5rem',
                    background: 'rgba(0,0,0,0.95)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.65rem',
                    color: '#aaa',
                    whiteSpace: 'nowrap',
                    border: '1px solid rgba(255,255,255,0.1)',
                    zIndex: 1000
                }}>
                    Actualizado: {formatFecha(tasaFecha)}
                </div>
            )}
            
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}

export default BCVRateMonitor