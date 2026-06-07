/**
 * GOOGLE SHEETS SERVICE v8.1 - Micro Market Express (DIAGNÓSTICO MEJORADO)
 * ===============================================================
 * Punto único de entrada/salida de datos entre React y Apps Script
 */

const getWebAppUrl = () => {
    const url = import.meta?.env?.VITE_GS_WEBAPP_URL || 'https://script.google.com/macros/s/AKfycbyRPfpWA1pT88lxy079DQTEulSpxb-Rb3-DuwPNc9L2Oi--BEbLb0OJH9vA4xqrZPHc/exec';
    return String(url || '').trim().replace(/\s+/g, '').replace(/\/+$/, '');
};

const STORAGE_KEY = 'mme_gs_cache_v8';

class GoogleSheetsService {
    constructor() {
        this.cache = {};
        this.loading = false;
        this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        this.tasaBcv = 0;
        this.connectionStatus = 'unknown'; // 'ok' | 'error' | 'unknown' | 'loading'
        this.lastError = null;
        this._init();
    }

    _init() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => { this.isOnline = true; this.refresh(); });
            window.addEventListener('offline', () => { this.isOnline = false; this.connectionStatus = 'error'; });
        }
        this._loadFromLocalStorage();
    }

    _loadFromLocalStorage() {
        try {
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                this.cache = parsed.data || parsed;
                this.tasaBcv = this.cache?.tasaBCV || 0;
                console.log('[gs] Cache local cargado:', Object.keys(this.cache).join(', '));
                console.log('[gs] Tasa BCV local:', this.tasaBcv);
                console.log('[gs] Productos en cache:', (this.cache.Productos || []).length);
                console.log('[gs] Categorias en cache:', (this.cache.Categorias || []).length);
            }
        } catch(e) {
            console.error('[gs] Error leyendo cache local:', e.message);
            this.cache = {};
        }
    }

    _saveToLocalStorage() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache)); } catch(e) {}
    }

    _notify() { /* deprecated - no-op */ }

    // =========================================================================
    // API METHODS - DIAGNÓSTICO MEJORADO
    // =========================================================================

    async initWithTasa() {
        return this.initialize();
    }

    async initialize() {
        if (this.loading) {
            return new Promise(resolve => setTimeout(() => resolve(this.cache), 500));
        }
        this.loading = true;
        this.connectionStatus = 'loading';

        const url = getWebAppUrl();
        console.log('[gs] Conectando a:', url);

        try {
            // Intento 1: GET con CORS normal (funciona si el Web App está publicado como "Anyone")
            const response = await fetch(url + '?t=' + Date.now(), { 
                method: 'GET',
                cache: 'no-store',
                redirect: 'follow'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const text = await response.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch {
                throw new Error('Respuesta no es JSON válido. Longitud: ' + text.length + ' chars. Preview: ' + text.substring(0, 300));
            }

            if (json.error) {
                throw new Error('Error del servidor: ' + json.error);
            }

            if (json.success || json.tasaBCV !== undefined) {
                this.cache = json;
                this._saveToLocalStorage();
                this.tasaBcv = Number(json.tasaBCV) || 0;
                this.connectionStatus = 'ok';
                this.lastError = null;

                const prodCount = (json.Productos || []).length;
                const catCount = (json.Categorias || []).length;
                console.log('[gs] ✅ Conexión exitosa!');
                console.log('[gs]   Tasa BCV:', this.tasaBcv);
                console.log('[gs]   Productos:', prodCount);
                console.log('[gs]   Categorias:', catCount);
                console.log('[gs]   Ventas:', (json.Ventas || []).length);
                console.log('[gs]   Caja:', (json.Caja || []).length);

                return { success: true, tasa: this.tasaBcv, data: this.cache };
            } else {
                throw new Error('Respuesta no contiene datos esperados. Keys: ' + Object.keys(json).join(', '));
            }

        } catch(e) {
            this.connectionStatus = 'error';
            this.lastError = e.message;
            console.error('[gs] ❌ Error de conexión GET:', e.message);
            console.error('[gs]   URL:', url);
            console.error('[gs]   Tipo de error:', e.name);

            // Si hay cache local, usarlo como fallback
            if (this.tasaBcv > 0 || (this.cache.Productos || []).length > 0) {
                console.warn('[gs] ⚠️ Usando datos del cache local como fallback');
                this.connectionStatus = 'error';
                return { success: false, error: e.message, tasa: this.tasaBcv, data: this.cache, fallback: true };
            }

            this.loading = false;
            return { success: false, error: e.message, tasa: 0, data: {} };
        } finally {
            this.loading = false;
        }
    }

    async refresh() {
        return this.initialize();
    }

    async sync() {
        return this.initialize();
    }

    // =========================================================================
    // CRUD OPERATIONS - POST CON DIAGNÓSTICO
    // =========================================================================

    _sanitizeMonetary(obj) {
        const monetaryFields = ['precio_usd', 'precio_costo', 'total_costo_usd', 'total_venta_usd', 'total_bs', 'tasa_bcv', 'pago_efectivo_usd', 'pago_efectivo_bs', 'pago_debito', 'pago_pago_movil', 'pago_bio_pago', 'pago_transferencia', 'vuelto_entregado_usd', 'vuelto_entregado_bs', 'apertura_usd', 'apertura_bs', 'cierre_usd', 'cierre_bs', 'cierre_debito', 'cierre_pago_movil', 'cierre_bio_pago', 'cierre_transferencia']
        if (typeof obj !== 'object' || obj === null) return obj
        const cleaned = Array.isArray(obj) ? [] : {}
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && monetaryFields.includes(key)) {
                const normalized = value.replace(/\.(?=\d{3}(\.|,|$))/g, '').replace(',', '.')
                const num = parseFloat(normalized)
                cleaned[key] = isNaN(num) ? 0 : num
            } else if (typeof value === 'object') {
                cleaned[key] = this._sanitizeMonetary(value)
            } else {
                cleaned[key] = value
            }
        }
        return cleaned
    }

    async _post(action, data = {}) {
        const url = getWebAppUrl();
        const sanitized = this._sanitizeMonetary(data)
        const payload = JSON.stringify({ action, data: sanitized });

        try {
            console.log(`[gs] POST → ${action} | Size: ${payload.length} bytes`);

            const response = await fetch(url, {
                method: 'POST',
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                body: payload
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch {
                throw new Error('Respuesta POST no es JSON. Length: ' + text.length + ' Preview: ' + text.substring(0, 200));
            }

            if (result.error) {
                console.error(`[gs] ❌ POST ${action} failed:`, result.error);
                return { success: false, error: result.error };
            }

            console.log(`[gs] ✅ POST ${action} success`);

            // Si la respuesta incluye datos, actualizar cache
            if (result.data) {
                if (result.data.Productos) this.cache.Productos = result.data.Productos;
                if (result.data.Categorias) this.cache.Categorias = result.data.Categorias;
                if (result.data.Caja) this.cache.Caja = result.data.Caja;
                if (result.data.tasaBCV !== undefined) this.tasaBcv = Number(result.data.tasaBCV);
                if (result.data.driveFiles) this.cache.driveFiles = result.data.driveFiles;
                this._saveToLocalStorage();
            }

            return result;

        } catch(e) {
            console.error(`[gs] ❌ POST ${action} error:`, e.message);
            this.connectionStatus = 'error';
            this.lastError = e.message;
            return { success: false, error: e.message };
        }
    }

    async getProductos() {
        await this.initialize();
        return this.getTable('Productos');
    }

    async getCategorias() {
        await this.initialize();
        return this.getTable('Categorias');
    }

    async getTasaBCV() {
        await this.initialize();
        return this.tasaBcv;
    }

    async upsertProducto(producto) {
        const result = await this._post('UPSERT_PRODUCTO', producto);
        // NO llamar refresh() aquí — useDatabase hace silentRefresh en background
        return result;
    }

    // Alias: update para compatibilidad
    async update(tableName, data) {
        if (tableName === 'Productos' || tableName === 'Productoss') {
            return this.upsertProducto(data);
        }
        if (tableName === 'Categorias' || tableName === 'Categoriass') {
            return this.upsertCategory(data);
        }
        if (tableName === 'Caja') {
            return this.upsertCaja(data);
        }
        return this.upsertProducto(data);
    }

    async deleteProducto(id) {
        const result = await this._post('DELETE_PRODUCTO', { id });
        if (result.success) {
            await this.refresh();
        }
        return result;
    }

    // Alias: delete para compatibilidad
    async delete(tableName, id) {
        if (tableName === 'Productos') {
            return this.deleteProducto(id);
        }
        if (tableName === 'Categorias') {
            return this.deleteCategory(id);
        }
        return this.deleteProducto(id);
    }

    async upsertCategory(categoria) {
        const result = await this._post('UPSERT_CATEGORY', categoria);
        if (result.success) {
            await this.refresh();
        }
        return result;
    }

    async deleteCategory(id) {
        const result = await this._post('DELETE_CATEGORY', { id });
        if (result.success) {
            await this.refresh();
        }
        return result;
    }

    // Alias: insert para compatibilidad
    async insert(tableName, data) {
        return this.update(tableName, data);
    }

    // Upsert para Caja
    async upsertCaja(caja) {
        const result = await this._post('UPSERT_CAJA', caja);
        return result;
    }

    async abrirSesionCaja(data) {
        const result = await this._post('ABRIR_CAJA', data);
        return result;
    }

    async cerrarSesionCaja(data) {
        const result = await this._post('CERRAR_CAJA', data);
        return result;
    }

    async fetchTasaBCV() {
        const result = await this._post('FETCH_TASA_BCV', {});
        if (result.success && result.tasaBCV !== undefined) {
            this.tasaBcv = result.tasaBCV;
            this.cache.tasaBCV = result.tasaBCV;
            this._saveToLocalStorage();
        }
        return result;
    }

    async updateTasaBCV(tasa) {
        const numTasa = parseFloat(tasa) || 0
        if (numTasa < 0) return { success: false, error: 'Tasa inválida' }
        const result = await this._post('UPDATE_TASA', { tasa: numTasa })
        if (result.success) {
            this.tasaBcv = numTasa
            if (result.data?.tasa_bcv !== undefined) this.tasaBcv = Number(result.data.tasa_bcv)
            this.cache.tasaBCV = this.tasaBcv;
            this._saveToLocalStorage()
        }
        return result
    }

    // Alias para compatibilidad
async fetchAndUpdateTasaBcv() {
        const result = await this._post('FETCH_TASA_BCV', {});
        if (result.success && result.data?.tasa_bcv !== undefined) {
            this.tasaBcv = Number(result.data.tasa_bcv);
            this.cache.tasaBCV = this.tasaBcv;
            this._saveToLocalStorage();
        }
        return result;
    }

    // =========================================================================
    // CUENTAS POR COBRAR/PAGAR
    // =========================================================================

    async getCuentasCobrar() {
        const result = await this._post('GET_CUENTAS_COBRAR', {});
        return result?.data || [];
    }

    async upsertCuentaCobrar(cuenta) {
        const result = await this._post('UPSERT_CUENTA_COBRAR', cuenta);
        return result;
    }

    async getCuentasPagar() {
        const result = await this._post('GET_CUENTAS_PAGAR', {});
        return result?.data || [];
    }

    async upsertCuentaPagar(cuenta) {
        const result = await this._post('UPSERT_CUENTA_PAGAR', cuenta);
        return result;
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    getTable(tableName) {
        // Mapear nombres de tablas
        const mapping = {
            'Productos': 'Productos',
            'Productoss': 'Productos',
            'Categorias': 'Categorias',
            'Categoriass': 'Categorias',
            'Caja': 'Caja',
            'Ventas': 'Ventas',
            'Tasa': 'Tasa'
        };
        const key = mapping[tableName] || tableName;
        return this.cache?.[key] || this.cache?.[tableName] || [];
    }

    getProductoById(id) {
        const productos = this.getTable('Productos');
        return productos.find(p => String(p.id) === String(id));
    }

    // Guardar venta
    async saveSale(sale) {
        return this._post('SAVE_SALE', sale);
    }

    // Obtener tasa BCV (sync)
    getTasaBcv() {
        return this.tasaBcv || this.cache?.tasaBCV || 0;
    }

    // Obtener categorías (sync)
    getCategorias() {
        return this.getTable('Categorias');
    }

    // Obtener ventas
    getVentas() {
        return this.getTable('Ventas');
    }

    // Obtener caja
    getCaja() {
        return this.getTable('Caja');
    }

    // Estado de conexión
    getConnectionStatus() {
        return {
            status: this.connectionStatus,
            lastError: this.lastError,
            url: getWebAppUrl(),
            hasCache: Object.keys(this.cache).length > 0,
            productsInCache: (this.cache.Productos || []).length,
            categoriesInCache: (this.cache.Categorias || []).length
        };
    }

    // Diagnóstico completo
    async runDiagnostic() {
        const results = {
            url: getWebAppUrl(),
            urlValid: false,
            networkOk: false,
            sheetReachable: false,
            productsLoaded: false,
            cacheFallback: false,
            errors: []
        };

        // Check URL
        try {
            new URL(results.url);
            results.urlValid = true;
        } catch {
            results.errors.push('URL inválida: ' + results.url);
            return results;
        }

        // Check network
        if (!navigator.onLine) {
            results.errors.push('Sin conexión a internet');
            return results;
        }
        results.networkOk = true;

        // Try connection
        try {
            const result = await this.initialize();
            if (result.success) {
                results.sheetReachable = true;
                results.productsLoaded = (this.cache.Productos || []).length > 0;
            } else if (result.fallback) {
                results.cacheFallback = true;
                results.errors.push('Usando cache local (servidor no accesible)');
            } else {
                results.errors.push(result.error || 'Error desconocido');
            }
        } catch(e) {
            results.errors.push(e.message);
        }

        return results;
    }
}

// Export singleton
export const gsService = new GoogleSheetsService();
export default gsService;