import React, { useState, useCallback, useEffect } from 'react'
import { formatUSD, formatVENumber, handleCurrencyInput } from '../lib/financialUtils'

const formatDisplay = (value, currency) => {
    const num = parseFloat(value) || 0
    return currency === 'BS' ? formatVENumber(num) : formatUSD(num)
}

const NEON_COLORS = { USD: '#00ff88', BS: '#2196f3' }

const CurrencyInput = ({ currency = 'USD', value, onChange, disabled, placeholder, style, id, name, autoFocus, color }) => {
    const [displayValue, setDisplayValue] = useState(() => formatDisplay(value, currency))
    const [focused, setFocused] = useState(false)

    useEffect(() => {
        setDisplayValue(formatDisplay(value, currency))
    }, [value, currency])

    const handleKeyDown = useCallback((e) => {
        if (disabled) return

        const newValue = handleCurrencyInput(e, value, currency)
        const currentParsed = parseFloat(value) || 0
        if (Math.abs(newValue - currentParsed) > 0.0001) {
            setDisplayValue(formatDisplay(newValue, currency))
            onChange?.(newValue)
        }
    }, [disabled, value, currency, onChange])

    const handlePaste = useCallback((e) => {
        e.preventDefault()
    }, [])

    const handleFocus = useCallback(() => setFocused(true), [])
    const handleBlur = useCallback(() => setFocused(false), [])

    const neonColor = color || NEON_COLORS[currency] || '#00e676'
    const defaultColor = currency === 'BS' ? '#2196f3' : '#00e676'
    const placeholderText = placeholder || (currency === 'BS' ? '0,00' : '0.00')

    return (
        <input
            id={id}
            name={name}
            type="text"
            inputMode="numeric"
            autoFocus={autoFocus}
            value={displayValue}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholderText}
            style={{
                width: '100%',
                paddingLeft: '2.5rem',
                paddingRight: '1rem',
                height: '3rem',
                fontSize: '1.1rem',
                fontWeight: 900,
                textAlign: 'right',
                caretColor: focused ? neonColor : 'transparent',
                background: disabled ? 'rgba(255,152,0,0.05)' : (focused ? `${neonColor}08` : 'rgba(0,0,0,0.3)'),
                border: `1px solid ${disabled ? 'rgba(255,152,0,0.3)' : (focused ? neonColor : `${color || defaultColor}40`)}`,
                borderRadius: '8px',
                color: disabled ? '#ff9800' : '#fff',
                outline: 'none',
                boxShadow: focused && !disabled ? `0 0 10px ${neonColor}, 0 0 5px ${neonColor} inset` : 'none',
                transition: 'all 0.3s ease',
                fontFamily: 'monospace',
                cursor: disabled ? 'not-allowed' : 'text',
                opacity: disabled ? 0.6 : 1,
                ...style
            }}
        />
    )
}

export default CurrencyInput
