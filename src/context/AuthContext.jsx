import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const savedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('mme_auth_user') : null
            return (savedUser && savedUser !== 'undefined') ? JSON.parse(savedUser) : null
        } catch (e) {
            console.error('Error parsing auth user:', e)
            return null
        }
    })

    const login = (userData) => {
        try {
            setUser(userData)
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('mme_auth_user', JSON.stringify(userData))
            }
        } catch (e) { console.error('Login storage error:', e) }
    }

    const logout = () => {
        try {
            setUser(null)
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('mme_auth_user')
            }
        } catch (e) { console.error('Logout storage error:', e) }
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
