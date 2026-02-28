import React, { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    // LOGIN ELIMINADO: Usuario Administrador por defecto
    const [user] = useState({
        id: '00000000-0000-0000-0000-000000000000',
        nombre_vendedor: 'ADMINISTRADOR',
        rol: 'admin'
    })

    const login = () => { }
    const logout = () => {
        console.log('Botón de cerrar sesión deshabilitado')
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: true }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
