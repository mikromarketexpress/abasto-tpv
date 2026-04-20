/**
 * GOOGLE SHEETS SERVICE v8.0 - Micro Market Express
 * ==================================================
 * ID: 1VVejGluaLaGTXsT9F7yl5sx5-ePsL2KEp6pCKK_pkWo
 * 
 * Características:
 * - 100% Google Sheets
 * - UPSERT por ID como llave primaria
 * - String(p.nombre).trim() para evitar errores
 * - Number() para precios y stock
 * - Persistencia de categoria (nombre) y tasa_bcv
 */

var WEB_APP_URL = '';
if (typeof importMetaEnv !== 'undefined') {
  WEB_APP_URL = importMetaEnv.VITE_GS_WEBAPP_URL;
} else if (typeof import.meta !== 'undefined' && import.meta.env) {
  WEB_APP_URL = import.meta.env.VITE_GS_WEBAPP_URL;
}

var STORAGE_KEY = 'mme_gs_cache_v8';
var LAST_SYNC_KEY = 'mme_gs_last_sync_v8';

var DEFAULT_ICON = { name: 'Package', color: '#808080' };

function deserializeIcon(iconStr) {
  if (!iconStr || typeof iconStr !== 'string') return DEFAULT_ICON;
  try {
    var parsed = JSON.parse(iconStr);
    return parsed && parsed.name ? { name: parsed.name, color: parsed.color || '#808080' } : DEFAULT_ICON;
  } catch(e) { 
    return DEFAULT_ICON; 
  }
}

function serializeIcon(icon) {
  if (!icon) return JSON.stringify(DEFAULT_ICON);
  if (typeof icon === 'string') return icon;
  return JSON.stringify({ name: icon.name || 'Package', color: icon.color || '#808080' });
}

var GoogleSheetsService = function() {
  this.cache = {};
  this.loading = false;
  this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  this._listeners = new Set();
  this.tasaBcv = 0;
  this._init();
};

GoogleSheetsService.prototype._init = function() {
  var self = this;
  if (typeof window !== 'undefined') {
    window.addEventListener('online', function() { 
      self.isOnline = true; 
      self.refresh();
    });
    window.addEventListener('offline', function() { 
      self.isOnline = false; 
    });
  }
  this._loadFromLocalStorage();
};

GoogleSheetsService.prototype._loadFromLocalStorage = function() {
  try {
    var cached = localStorage.getItem(STORAGE_KEY);
    this.cache = cached ? JSON.parse(cached) : {};
  } catch(e) {
    this.cache = {};
  }
  this._loadTasaFromCache();
};

GoogleSheetsService.prototype._loadTasaFromCache = function() {
  if (this.cache && this.cache.tasaBCV) {
    this.tasaBcv = Number(this.cache.tasaBCV) || 0;
  } else if (this.cache && this.cache.Tasa && this.cache.Tasa.tasa_bcv) {
    this.tasaBcv = Number(this.cache.Tasa.tasa_bcv) || 0;
  } else if (this.cache && this.cache.Configuracion && this.cache.Configuracion.tasa_bcv) {
    this.tasaBcv = Number(this.cache.Configuracion.tasa_bcv) || 0;
  }
};

GoogleSheetsService.prototype._saveToLocalStorage = function() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  } catch(e) {}
};

GoogleSheetsService.prototype.getTable = function(name) {
  if (!this.cache) this.cache = {};
  return (this.cache[name] && Array.isArray(this.cache[name])) ? this.cache[name] : [];
};

GoogleSheetsService.prototype.getCategorias = function() {
  try {
    var raw = this.getTable('Categorias');
    if (!raw || !Array.isArray(raw)) return [];
    return raw.filter(function(c) { 
      return c && c.id && c.nombre; 
    }).map(function(c) {
      var icon = deserializeIcon(c.icono);
      return {
        id: String(c.id || ''),
        nombre: String(c.nombre || '').toUpperCase().trim(),
        icono: icon,
        icono_nombre: icon.name,
        icono_color: icon.color,
        orden: Number(c.orden) || 0
      };
    }).sort(function(a, b) { 
      return (a.orden || 0) - (b.orden || 0) || a.nombre.localeCompare(b.nombre); 
    });
  } catch(err) { 
    return []; 
  }
};

GoogleSheetsService.prototype.initialize = function() {
  var self = this;
  return new Promise(function(resolve) {
    if (self.loading) {
      setTimeout(function() { resolve(self.cache || {}); }, 500);
      return;
    }
    self.loading = true;
    
    if (self.isOnline && WEB_APP_URL) {
      var fetchUrl = WEB_APP_URL + (WEB_APP_URL.indexOf('?') > -1 ? '&' : '?') + 't=' + Date.now();
      fetch(fetchUrl, { method: 'GET', cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(json) {
          if (json.success) {
            self._setCache(json);
            self._loadTasaFromCache();
            if (json.tasaBCV) {
              self.tasaBcv = Number(json.tasaBCV) || 0;
              console.log('Tasa recibida del BCV: ' + self.tasaBcv);
            }
            self._notify({ type: 'initialized' });
            resolve(self.cache);
          } else {
            self._loadFromLocalStorage();
            self._loadTasaFromCache();
            resolve(self.cache || {});
          }
          self.loading = false;
        })
        .catch(function(e) {
          console.warn('[gs] Init error:', e.message);
          self._loadFromLocalStorage();
          self._loadTasaFromCache();
          self.loading = false;
          resolve(self.cache || {});
        });
    } else {
      self._loadFromLocalStorage();
      self._loadTasaFromCache();
      self.loading = false;
      resolve(self.cache || {});
    }
  });
};

GoogleSheetsService.prototype.refresh = function() {
  var self = this;
  return new Promise(function(resolve) {
    self.initialize().then(function(result) {
      self._notify({ type: 'refresh', data: result });
      resolve(result);
    });
  });
};

GoogleSheetsService.prototype._setCache = function(data) {
  this.cache = data || {};
  this._saveToLocalStorage();
};

GoogleSheetsService.prototype._updateInCache = function(table, data) {
  if (!this.cache || !this.cache[table]) return;
  var idx = this.cache[table].findIndex(function(i) { return i && i.id === data.id; });
  if (idx !== -1) {
    this.cache[table][idx] = Object.assign({}, this.cache[table][idx], data);
  } else {
    this.cache[table].push(data);
  }
};

GoogleSheetsService.prototype._removeFromCache = function(table, id) {
  if (!this.cache || !this.cache[table]) return;
  this.cache[table] = this.cache[table].filter(function(i) { return i && i.id !== id; });
};

GoogleSheetsService.prototype.subscribe = function(cb) {
  this._listeners.add(cb);
  var self = this;
  return function() { self._listeners.delete(cb); };
};

GoogleSheetsService.prototype._notify = function(data) {
  var self = this;
  this._listeners.forEach(function(cb) { 
    try { cb(self.cache, data); } catch(e) {} 
  });
};

GoogleSheetsService.prototype._sync = function(action, data) {
  var self = this;
  return new Promise(function(resolve) {
    if (!WEB_APP_URL) {
      resolve({ success: false, error: 'Sin URL' });
      return;
    }
    
    var payload = JSON.stringify({ action: action, data: data });
    
    fetch(WEB_APP_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Accept': 'application/json' },
      body: payload
    })
      .then(function(res) { return res.text(); })
      .then(function(text) {
        var result = JSON.parse(text);
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        resolve(result);
      })
      .catch(function(e) { 
        resolve({ success: false, error: e.message }); 
      });
  });
};

// ============================================================================
// CRUD PRODUCTOS - UPSERT por ID
// ============================================================================

GoogleSheetsService.prototype.upsertProducto = function(producto) {
  var self = this;
  return new Promise(function(resolve) {
    var payload = {
      id: String(producto.id || crypto.randomUUID()),
      nombre: String(producto.nombre || '').trim().toUpperCase(),
      descripcion_corta: String(producto.descripcion_corta || '').trim(),
      numero_unid: Number(producto.numero_unid) || 1,
      unidad_medida: String(producto.unidad_medida || 'UNIDAD'),
      categoria: String(producto.categoria_nombre || producto.categoria || 'VARIOS'),
      categoria_nombre: String(producto.categoria_nombre || producto.categoria || 'VARIOS'),
      precio_usd: Number(producto.precio_usd) || Number(producto.precio_venta_usd) || 0,
      precio_costo: Number(producto.precio_costo) || 0,
      stock: Number(producto.stock) || Number(producto.stock_actual) || 0,
      stock_minimo: Number(producto.stock_minimo) || 5,
      imagen_url: String(producto.imagen_url || ''),
      tasa_bcv: String(producto.tasa_bcv || ''),
      codigo_barras: String(producto.codigo_barras || '')
    };

    self._updateInCache('Productos', payload);

    if (self.isOnline && WEB_APP_URL) {
      self._sync('UPSERT_PRODUCTO', payload)
        .then(function(result) {
          if (result.success && result.data) {
            self._setCache(result.data);
            self._notify({ type: 'upsert_producto', productos: self.getTable('Productos') });
            resolve({ success: true, data: payload, productos: self.getTable('Productos') });
          } else {
            self._saveToLocalStorage();
            resolve({ success: true, data: payload, productos: self.getTable('Productos') });
          }
        })
        .catch(function(e) {
          console.warn('[gs] Upsert error:', e.message);
          self._saveToLocalStorage();
          resolve({ success: true, data: payload, productos: self.getTable('Productos') });
        });
    } else {
      self._saveToLocalStorage();
      resolve({ success: true, data: payload, productos: self.getTable('Productos') });
    }
  });
};

// ============================================================================
// CRUD PRODUCTOS - DELETE
// ============================================================================

GoogleSheetsService.prototype.deleteProducto = function(id) {
  var self = this;
  return new Promise(function(resolve) {
    self._removeFromCache('Productos', id);

    if (self.isOnline && WEB_APP_URL) {
      self._sync('DELETE_PRODUCTO', { id: id })
        .then(function(result) {
          if (result.success && result.data) {
            self._setCache(result.data);
            self._notify({ type: 'delete_producto', id: id, productos: self.getTable('Productos') });
          }
          resolve({ success: true, productos: self.getTable('Productos') });
        })
        .catch(function(e) {
          self._saveToLocalStorage();
          resolve({ success: true, productos: self.getTable('Productos') });
        });
    } else {
      self._saveToLocalStorage();
      resolve({ success: true, productos: self.getTable('Productos') });
    }
  });
};

// ============================================================================
// CRUD CATEGORÍAS - UPSERT
// ============================================================================

GoogleSheetsService.prototype.upsertCategory = function(categoria) {
  var self = this;
  return new Promise(function(resolve) {
    var payload = {
      id: String(categoria.id || crypto.randomUUID()),
      nombre: String(categoria.nombre || '').trim().toUpperCase(),
      icono: serializeIcon(categoria.icono),
      icono_nombre: String(categoria.icono_nombre || 'Package'),
      icono_color: String(categoria.icono_color || '#808080'),
      orden: Number(categoria.orden) || 0
    };

    self._updateInCache('Categorias', payload);

    if (self.isOnline && WEB_APP_URL) {
      self._sync('UPSERT_CATEGORY', payload)
        .then(function(result) {
          if (result.success && result.data) {
            self._setCache(result.data);
            self._notify({ type: 'upsert_category', categorias: self.getCategorias() });
            resolve({ success: true, data: payload, categorias: self.getCategorias() });
          } else {
            self._saveToLocalStorage();
            resolve({ success: true, data: payload, categorias: self.getCategorias() });
          }
        })
        .catch(function(e) {
          self._saveToLocalStorage();
          resolve({ success: true, data: payload, categorias: self.getCategorias() });
        });
    } else {
      self._saveToLocalStorage();
      resolve({ success: true, data: payload, categorias: self.getCategorias() });
    }
  });
};

// ============================================================================
// CRUD CATEGORÍAS - DELETE
// ============================================================================

GoogleSheetsService.prototype.deleteCategory = function(id) {
  var self = this;
  return new Promise(function(resolve) {
    self._removeFromCache('Categorias', id);

    if (self.isOnline && WEB_APP_URL) {
      self._sync('DELETE_CATEGORY', { id: id })
        .then(function(result) {
          if (result.success && result.data) {
            self._setCache(result.data);
            self._notify({ type: 'delete_category', id: id, categorias: self.getCategorias() });
          }
          resolve({ success: true, categorias: self.getCategorias() });
        })
        .catch(function(e) {
          self._saveToLocalStorage();
          resolve({ success: true, categorias: self.getCategorias() });
        });
    } else {
      self._saveToLocalStorage();
      resolve({ success: true, categorias: self.getCategorias() });
    }
  });
};

GoogleSheetsService.prototype.clearAllData = function() {
  this.cache = {};
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
  }
  this._notify({ type: 'cleared' });
};

// ============================================================================
// CRUD VENTAS - SAVE SALE
// ============================================================================

GoogleSheetsService.prototype.saveSale = function(saleData) {
  var self = this;
  return new Promise(function(resolve) {
    var productos = self.getTable('Productos');
    var productosMap = {};
    productos.forEach(function(p) {
      productosMap[String(p.id)] = p;
    });
    
    var productosEnriquecidos = (saleData.productos || []).map(function(item) {
      var productoBase = productosMap[String(item.id)] || {};
      return {
        id: String(item.id || ''),
        nombre: String(item.nombre || productoBase.nombre || 'SIN NOMBRE').trim().toUpperCase(),
        cantidad: Number(item.cantidad) || 1,
        precio_costo_unitario: Number(item.precio_costo) || Number(productoBase.precio_costo) || 0,
        precio_venta_unitario: Number(item.precio_usd) || Number(item.precio_venta_usd) || Number(productoBase.precio_usd) || 0
      };
    });
    
    var totalCostoUsd = productosEnriquecidos.reduce(function(sum, p) {
      return sum + (p.precio_costo_unitario * p.cantidad);
    }, 0);
    
    var totalVentaUsd = productosEnriquecidos.reduce(function(sum, p) {
      return sum + (p.precio_venta_unitario * p.cantidad);
    }, 0);
    
    var tasaBcv = Number(saleData.tasa_bcv) || Number(saleData.tasa) || 1;
    var totalBs = totalVentaUsd * tasaBcv;
    
    var payload = {
      id: String(saleData.id || crypto.randomUUID()),
      fecha: saleData.fecha || new Date().toISOString(),
      productos_json: productosEnriquecidos,
      total_costo_usd: parseFloat(totalCostoUsd.toFixed(2)),
      total_venta_usd: parseFloat(totalVentaUsd.toFixed(2)),
      total_bs: parseFloat(totalBs.toFixed(2)),
      tasa_bcv: parseFloat(tasaBcv.toFixed(2)),
      utilidad_neta_usd: parseFloat((totalVentaUsd - totalCostoUsd).toFixed(2))
    };
    
    if (!self.cache.Ventas) self.cache.Ventas = [];
    self.cache.Ventas.push(payload);
    self._saveToLocalStorage();
    
    if (self.isOnline && WEB_APP_URL) {
      self._sync('SAVE_SALE', payload)
        .then(function(result) {
          if (result.success) {
            self._notify({ type: 'save_sale', sale: payload });
            resolve({ 
              success: true, 
              message: result.message || 'Venta registrada correctamente',
              data: payload 
            });
          } else {
            resolve({ success: false, error: result.error });
          }
        })
        .catch(function(e) {
          resolve({ success: false, error: e.message });
        });
    } else {
      resolve({ 
        success: true, 
        message: 'Venta guardada localmente (sin conexion)',
        data: payload 
      });
    }
  });
};

GoogleSheetsService.prototype.getVentas = function() {
  return this.getTable('Ventas');
};

// ============================================================================
// CONFIGURACIÓN - TASA BCV (Desde pestaña 'Tasa')
// ============================================================================

GoogleSheetsService.prototype.getTasaBcv = function() {
  if (this.cache.Tasa && this.cache.Tasa.tasa_bcv) {
    return Number(this.cache.Tasa.tasa_bcv) || 0;
  }
  return this.tasaBcv || 0;
};

GoogleSheetsService.prototype.getTasaInfo = function() {
  if (this.cache.Tasa && this.cache.Tasa.tasa_bcv) {
    return {
      tasa_bcv: Number(this.cache.Tasa.tasa_bcv) || 0,
      tasa_fecha: this.cache.Tasa.tasa_fecha || null,
      tasa_hora: this.cache.Tasa.tasa_hora || null
    };
  }
  return { tasa_bcv: this.tasaBcv || 0, tasa_fecha: null, tasa_hora: null };
};

GoogleSheetsService.prototype.fetchAndUpdateTasaBcv = function() {
  var self = this;
  return new Promise(function(resolve) {
    if (!self.isOnline || !WEB_APP_URL) {
      var tasaLocal = localStorage.getItem('mme_tasa_bcv');
      resolve({ 
        success: false, 
        error: 'Sin conexion',
        data: tasaLocal ? { tasa_bcv: parseFloat(tasaLocal), tasa_fecha: localStorage.getItem('mme_tasa_fecha') } : null
      });
      return;
    }
    
    self._sync('FETCH_TASA_BCV', {})
      .then(function(result) {
        if (result.success && result.data && result.data.tasa_bcv) {
          self.cache.Tasa = result.data;
          self.tasaBcv = Number(result.data.tasa_bcv) || 0;
          localStorage.setItem('mme_tasa_bcv', self.tasaBcv.toString());
          if (result.data.tasa_fecha) {
            localStorage.setItem('mme_tasa_fecha', String(result.data.tasa_fecha));
          }
          self._saveToLocalStorage();
          self._notify({ type: 'tasa_updated', tasa: result.data });
        }
        resolve(result);
      })
      .catch(function(e) {
        var tasaLocal = localStorage.getItem('mme_tasa_bcv');
        resolve({ 
          success: false, 
          error: e.message,
          data: tasaLocal ? { tasa_bcv: parseFloat(tasaLocal), tasa_fecha: localStorage.getItem('mme_tasa_fecha') } : null
        });
      });
  });
};

GoogleSheetsService.prototype.initWithTasa = function() {
  var self = this;
  return new Promise(function(resolve) {
    self.initialize().then(function() {
      // Verificar tasaBCV directo del doGet
      if (self.cache && self.cache.tasaBCV) {
        self.tasaBcv = Number(self.cache.tasaBCV) || 0;
        localStorage.setItem('mme_tasa_bcv', self.tasaBcv.toString());
        resolve({ success: true, tasa: self.tasaBcv });
      } else if (self.tasaBcv > 0) {
        resolve({ success: true, tasa: self.tasaBcv });
      } else {
        self.fetchAndUpdateTasaBcv().then(function(result) {
          resolve(result);
        });
      }
    });
  });
};

var gsService = new GoogleSheetsService();
export { gsService };
export default gsService;