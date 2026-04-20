import React, { createContext, useContext, useState, useEffect } from 'react'
import { gsService } from '../lib/googleSheetsService'

const CajaContext = createContext(null)

export const CajaProvider = ({ children }) => {
    const [sesionActiva, setSesionActiva] = useState(null)

    useEffect(() => {
        const updateSesion = (data) => {
            if (data) {
                const sesiones = data.Caja || []
                const activa = sesiones.find(s => s.estado === 'ACTIVA') || null
                setSesionActiva(activa)
            }
        }
        
        gsService.subscribe(updateSesion)
        updateSesion(gsService.cache)
    }, [])

    return (
        <CajaContext.Provider value={{ sesionActiva, setSesionActiva }}>
            {children}
        </CajaContext.Provider>
    )
}

export const useCaja = () => useContext(CajaContext)
