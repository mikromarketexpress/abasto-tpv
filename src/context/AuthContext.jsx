import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('mme_vendedor_activo')
            return saved ? JSON.parse(saved) : null
        } catch (e) { return null }
    })

    const login = (userData) => {
        setUser(userData)
        localStorage.setItem('mme_vendedor_activo', JSON.stringify(userData))
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('mme_vendedor_activo')
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
