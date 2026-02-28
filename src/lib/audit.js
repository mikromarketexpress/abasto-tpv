import { supabase } from './supabase';

/**
 * Logs a critical action to the database audit trail.
 * @param {string} action - The action performed (e.g., 'UPDATE_PRODUCT', 'DELETE_SALE')
 * @param {string} module - The module where the action happened (e.g., 'INVENTORY', 'POS')
 * @param {object} details - Any relevant JSON data for the audit log
 */
export const logAudit = async (action, module, details = {}) => {
    try {
        const { error } = await supabase
            .from('auditoria')
            .insert([
                {
                    accion: action,
                    modulo: module,
                    detalles: details,
                    usuario: 'Admin Master', // Ideally this would come from an Auth context
                    fecha: new Date().toISOString()
                }
            ]);

        if (error) {
            // We don't want to break the app if logging fails, but we should know
            console.warn('Audit logging failed:', error.message);
        }
    } catch (err) {
        console.error('Critical failure in audit system:', err);
    }
};
