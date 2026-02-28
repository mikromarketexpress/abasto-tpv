import { supabase } from './supabase'

const TERMINAL_ID = 'MME-POS-01'

export const getSesionActiva = async () => {
    const { data, error } = await supabase
        .from('sesiones_caja')
        .select('*')
        .eq('terminal_id', TERMINAL_ID)
        .eq('estado', 'abierta')
        .order('fecha_apertura', { ascending: false })
        .limit(1)
        .maybeSingle()
    if (error) throw error
    return data
}

export const abrirSesion = async (montoApertura, tasaBcv, vendedorId) => {
    const { data, error } = await supabase
        .from('sesiones_caja')
        .insert([{
            monto_apertura: parseFloat(montoApertura) || 0,
            tasa_bcv_apertura: parseFloat(tasaBcv) || 0,
            vendedor_id: vendedorId,
            terminal_id: TERMINAL_ID,
            estado: 'abierta',
            fecha_apertura: new Date().toISOString(),
            monto_ventas_usd: 0
        }])
        .select()
        .single()
    if (error) throw error
    return data
}

export const cerrarSesion = async (sesionId, montoCierre, observaciones = '') => {
    // Calcular total de ventas de esta sesion
    const { data: ventasSesion } = await supabase
        .from('ventas')
        .select('total_usd')
        .eq('sesion_caja_id', sesionId)

    const totalVentas = (ventasSesion || []).reduce((sum, v) => sum + Number(v.total_usd || 0), 0)

    const { data, error } = await supabase
        .from('sesiones_caja')
        .update({
            monto_cierre: parseFloat(montoCierre) || 0,
            monto_ventas_usd: totalVentas,
            estado: 'cerrada',
            fecha_cierre: new Date().toISOString(),
            observaciones: observaciones || null
        })
        .eq('id', sesionId)
        .select()
        .single()
    if (error) throw error
    return data
}

export const getResumenSesion = async (sesionId) => {
    const { data: ventas, error } = await supabase
        .from('ventas')
        .select('total_usd, fecha')
        .eq('sesion_caja_id', sesionId)
        .order('fecha', { ascending: false })
    if (error) throw error
    const total = (ventas || []).reduce((acc, v) => acc + Number(v.total_usd || 0), 0)
    return { ventas: ventas || [], totalVentas: total, numTransacciones: (ventas || []).length }
}
