import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { gsService } from '../lib/googleSheetsService'

const CajaContext = createContext(null)

const SESION_STORAGE_KEY = 'mme_sesion_caja_id'

export const CajaProvider = ({ children }) => {
    const [sesionActiva, setSesionActiva] = useState(null)
    const [loading, setLoading] = useState(true)
    const [tasaBCV, setTasaBCV] = useState(() => {
        const saved = localStorage.getItem('mme_tasa_bcv')
        return saved ? parseFloat(saved) : 0
    })

    const isCajaAbierta = !!sesionActiva

    useEffect(() => {
        const loadSesion = async () => {
            try {
                await gsService.initialize()
                const sesiones = gsService.getTable('Caja') || []
                const activa = sesiones.find(s => s.estado === 'ACTIVA') || null
                setSesionActiva(activa)

                if (activa) {
                    localStorage.setItem(SESION_STORAGE_KEY, activa.id)
                } else {
                    const savedId = localStorage.getItem(SESION_STORAGE_KEY)
                    if (savedId) {
                        const savedSesion = sesiones.find(s => String(s.id) === String(savedId))
                        if (savedSesion) {
                            setSesionActiva(savedSesion)
                        } else {
                            localStorage.removeItem(SESION_STORAGE_KEY)
                        }
                    }
                }

                // Obtener tasa del cache o intentar sincronizar
                const tasaDb = gsService.tasaBcv || gsService.getTasaBcv() || 0
                if (tasaDb > 0) {
                    setTasaBCV(tasaDb)
                    localStorage.setItem('mme_tasa_bcv', tasaDb.toString())
                } else {
                    // Intentar sincronizar tasa BCV automáticamente
                    try {
                        const tasaSync = await gsService.fetchAndUpdateTasaBcv()
                        if (tasaSync?.success && tasaSync.data?.tasa_bcv > 0) {
                            setTasaBCV(tasaSync.data.tasa_bcv)
                            localStorage.setItem('mme_tasa_bcv', String(tasaSync.data.tasa_bcv))
                        }
                    } catch (e) {}
                }
            } catch(err) {
                console.error('Error loading sesion:', err)
            } finally {
                setLoading(false)
            }
        }
        loadSesion()
    }, [])

    useEffect(() => {
        if (sesionActiva?.tasa_bcv_apertura) {
            const tasa = parseFloat(sesionActiva.tasa_bcv_apertura)
            if (tasa > 0) {
                setTasaBCV(tasa)
                localStorage.setItem('mme_tasa_bcv', tasa.toString())
            }
        }
    }, [sesionActiva])

    useEffect(() => {
        if (sesionActiva?.id) {
            localStorage.setItem(SESION_STORAGE_KEY, sesionActiva.id)
        } else {
            localStorage.removeItem(SESION_STORAGE_KEY)
        }
    }, [sesionActiva])

    const updateTasaBCV = useCallback((tasa) => {
        const num = parseFloat(tasa) || 0
        setTasaBCV(num)
        localStorage.setItem('mme_tasa_bcv', num.toString())
    }, [])

    const refreshTasaFromDB = useCallback(() => {
        const tasaDb = gsService.tasaBcv || gsService.getTasaBcv() || 0
        setTasaBCV(tasaDb)
        localStorage.setItem('mme_tasa_bcv', tasaDb.toString())
    }, [])

    return (
        <CajaContext.Provider value={{
            sesionActiva,
            setSesionActiva,
            loading,
            tasaBCV,
            setTasaBCV: updateTasaBCV,
            isCajaAbierta,
            refreshTasaFromDB
        }}>
            {children}
        </CajaContext.Provider>
    )
}

export const useCaja = () => useContext(CajaContext)