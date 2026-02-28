import React, { createContext, useContext, useState, useEffect } from 'react'
import { getSesionActiva } from '../lib/caja'

const CajaContext = createContext(null)

export const CajaProvider = ({ children }) => {
    const [sesionActiva, setSesionActiva] = useState(null)
    const [loadingCaja, setLoadingCaja] = useState(true)

    useEffect(() => {
        checkSesion()
    }, [])

    const checkSesion = async () => {
        setLoadingCaja(true)
        try {
            const sesion = await getSesionActiva()
            setSesionActiva(sesion || null)
        } catch (e) {
            console.error('Error verificando sesión de caja:', e)
        } finally {
            setLoadingCaja(false)
        }
    }

    return (
        <CajaContext.Provider value={{ sesionActiva, setSesionActiva, loadingCaja, checkSesion }}>
            {children}
        </CajaContext.Provider>
    )
}

export const useCaja = () => useContext(CajaContext)
