import React, { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCcw, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { gsService } from '../lib/googleSheetsService'

const BCVRateMonitor = ({ onTasaChange }) => {
    const [tasaBcv, setTasaBcv] = useState(() => {
        const saved = localStorage.getItem('mme_tasa_bcv')
        return saved ? parseFloat(saved) : 0
    })
    const [tasaFecha, setTasaFecha] = useState(() => {
        return localStorage.getItem('mme_tasa_fecha') || null
    })
    const [tasaHora, setTasaHora] = useState(() => {
        return localStorage.getItem('mme_tasa_hora') || null
    })
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState('idle') // 'idle' | 'syncing' | 'success' | 'error' | 'offline'
    const [mensaje, setMensaje] = useState('')
    const [showTooltip, setShowTooltip] = useState(false)
    const intervalRef = useRef(null)

    const syncTasa = useCallback(async (forzar = false) => {
        setIsLoading(true)
        setStatus('syncing')
        setMensaje('Sincronizando...')
        
        try {
            const result = await gsService.fetchAndUpdateTasaBcv()
            
            await gsService.refresh()
            
            const tasaActualizada = gsService.tasaBcv || gsService.cache?.tasaBCV || 0
            const fechaTasa = gsService.cache?.Tasa?.tasa_fecha || gsService.cache?.fecha || null
            
            if (tasaActualizada > 0) {
                const ahora = new Date()
                const horaStr = ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
                
                setTasaBcv(tasaActualizada)
                setTasaFecha(fechaTasa)
                setTasaHora(horaStr)
                localStorage.setItem('mme_tasa_bcv', tasaActualizada.toString())
                localStorage.setItem('mme_tasa_fecha', fechaTasa || '')
                localStorage.setItem('mme_tasa_hora', horaStr)
                onTasaChange?.(tasaActualizada)
                setStatus('success')
                setMensaje('Actualizado')
                
                setTimeout(() => {
                    setStatus('idle')
                    setMensaje('')
                }, 3000)
            } else {
                setStatus('error')
                setMensaje('Tasa no disponible')
            }
        } catch (e) {
            console.error('Error sincronizando tasa:', e)
            setStatus('error')
            setMensaje('Error de conexión')
            
            try {
                await gsService.refresh()
                const tasaCache = gsService.tasaBcv || gsService.cache?.tasaBCV || 0
                if (tasaCache > 0) {
                    setTasaBcv(tasaCache)
                    onTasaChange?.(tasaCache)
                    setStatus('success')
                    setMensaje('Usando cache')
                    setTimeout(() => {
                        setStatus('idle')
                        setMensaje('')
                    }, 3000)
                }
            } catch(e2) {
                setStatus('offline')
                setMensaje('Sin conexión')
            }
        } finally {
            setIsLoading(false)
        }
    }, [onTasaChange])

    useEffect(() => {
        const tasaCache = gsService.tasaBcv || gsService.getTasaBcv() || gsService.cache?.tasaBCV || 0
        if (tasaCache > 0) {
            setTasaBcv(tasaCache)
            onTasaChange?.(tasaCache)
            localStorage.setItem('mme_tasa_bcv', tasaCache.toString())
            setStatus('idle')
            
            // Sincronizar en background después de 2 segundos
            const timer = setTimeout(() => syncTasa(true), 2000)
            return () => clearTimeout(timer)
        } else {
            syncTasa(true)
        }
    }, [])

    useEffect(() => {
        // Sincronizar cada 5 minutos (300000ms) en lugar de cada minuto
        intervalRef.current = setInterval(() => {
            syncTasa(false)
        }, 300000)
        
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [syncTasa])

    const formatFecha = (fecha) => {
        if (!fecha) return ''
        try {
            const d = new Date(fecha)
            return d.toLocaleDateString('es-VE', { 
                day: '2-digit', 
                month: '2-digit',
                year: 'numeric'
            })
        } catch { return fecha }
    }

    const getBorderColor = () => {
        switch (status) {
            case 'success': return 'rgba(0, 230, 118, 0.5)'
            case 'error': return 'rgba(255, 82, 82, 0.4)'
            case 'syncing': return 'rgba(255, 193, 7, 0.4)'
            case 'offline': return 'rgba(128, 128, 128, 0.4)'
            default: return 'rgba(0, 230, 118, 0.3)'
        }
    }

    const getBgColor = () => {
        switch (status) {
            case 'success': return 'rgba(0, 230, 118, 0.15)'
            case 'error': return 'rgba(255, 82, 82, 0.1)'
            case 'syncing': return 'rgba(255, 193, 7, 0.1)'
            case 'offline': return 'rgba(128, 128, 128, 0.1)'
            default: return 'rgba(0, 230, 118, 0.1)'
        }
    }

    const getStatusIcon = () => {
        switch (status) {
            case 'success': return <CheckCircle size={12} style={{ color: '#00e676' }} />
            case 'error': return <AlertTriangle size={12} style={{ color: '#ff5252' }} />
            case 'syncing': return <RefreshCcw size={12} style={{ color: '#ffc107', animation: 'spin 1s linear infinite' }} />
            case 'offline': return <AlertTriangle size={12} style={{ color: '#888' }} />
            default: return null
        }
    }

    const getTextColor = () => {
        if (status === 'error' || status === 'offline') return '#ff5252'
        if (status === 'syncing') return '#ffc107'
        return 'var(--s-neon)'
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.5rem 1rem',
            background: getBgColor(),
            borderRadius: '8px',
            border: `1px solid ${getBorderColor()}`,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative',
            minWidth: '140px'
        }} 
        onClick={() => syncTasa(true)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        >
            {getStatusIcon()}
            
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ 
                        fontSize: '0.6rem', 
                        fontWeight: 800, 
                        color: getTextColor(),
                        letterSpacing: '0.1em'
                    }}>
                        {status === 'offline' ? 'OFFLINE' : status === 'error' ? 'ERROR' : 'BCV'}
                    </span>
                    <span style={{
                        fontSize: '1rem',
                        fontWeight: 900,
                        color: '#fff',
                        fontFamily: 'monospace',
                        lineHeight: 1
                    }}>
                        {tasaBcv > 0 ? `BS ${tasaBcv.toFixed(2)}` : '---'}
                    </span>
                </div>
                {tasaFecha && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={8} style={{ color: '#666' }} />
                        <span style={{ fontSize: '0.55rem', color: '#888', fontWeight: 700 }}>
                            {tasaHora ? `${tasaHora} • ` : ''}{formatFecha(tasaFecha)}
                        </span>
                    </div>
                )}
            </div>
            
            {!isLoading && status !== 'syncing' && (
                <RefreshCcw 
                    size={12} 
                    style={{ 
                        color: '#666',
                        marginLeft: 'auto'
                    }} 
                />
            )}
            
            {showTooltip && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '0.5rem',
                    background: 'rgba(0,0,0,0.95)',
                    padding: '0.5rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.6rem',
                    color: '#aaa',
                    whiteSpace: 'nowrap',
                    border: '1px solid rgba(255,255,255,0.1)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem'
                }}>
                    <div style={{ fontWeight: 800, color: '#fff' }}>TASA BCV OFICIAL</div>
                    {tasaFecha && <div>Fecha: {formatFecha(tasaFecha)}</div>}
                    {tasaHora && <div>Hora sync: {tasaHora}</div>}
                    <div style={{ color: '#666', marginTop: '0.2rem' }}>Clic para actualizar</div>
                </div>
            )}
            
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}

export default BCVRateMonitor