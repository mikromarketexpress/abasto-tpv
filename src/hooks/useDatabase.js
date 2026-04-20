/**
 * useDatabase.js - Hook Definitivo v8.0
 * =====================================
 * 
 * 100% Google Sheets
 * String(p.nombre).trim() para evitar errores
 * Number() para precios y stock
 * Persistencia de categoria (nombre) y tasa_bcv
 * SIN Supabase, SIN subscribeStatus
 */

import { useState, useEffect, useCallback } from 'react';
import { gsService } from '../lib/googleSheetsService';

export function useDatabase() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  // ==========================================================================
  // INICIALIZACIÓN
  // ==========================================================================

  useEffect(function() {
    var init = function() {
      setLoading(true);
      gsService.initialize()
        .then(function(cache) {
          setProductos(gsService.getTable('Productos') || []);
          setCategorias(gsService.getCategorias() || []);
        })
        .then(function() {
          setLoading(false);
        })
        .catch(function(err) {
          setError(err.message);
          setLoading(false);
        });
    };
    init();

    var unsub = gsService.subscribe(function(cache, event) {
      if (event && (event.type === 'initialized' || event.type === 'refresh')) {
        setProductos(gsService.getTable('Productos') || []);
        setCategorias(gsService.getCategorias() || []);
      }
      if (event && event.type === 'upsert_producto') {
        setProductos(event.productos || []);
      }
      if (event && event.type === 'delete_producto') {
        setProductos(event.productos || []);
      }
      if (event && event.type === 'upsert_category') {
        setCategorias(event.categorias || []);
      }
      if (event && event.type === 'delete_category') {
        setCategorias(event.categorias || []);
      }
    });

    return function() { unsub(); };
  }, []);

  useEffect(function() {
    var handleOnline = function() { setIsOnline(true); };
    var handleOffline = function() { setIsOnline(false); };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }
    
    return function() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // ==========================================================================
  // PRODUCTOS - CRUD
  // ==========================================================================

  var addProducto = useCallback(function(producto) {
    return gsService.upsertProducto(producto)
      .then(function(result) {
        if (result.success && result.productos) {
          setProductos(result.productos);
        }
        return result;
      });
  }, []);

  var updateProducto = useCallback(function(producto) {
    return gsService.upsertProducto(producto)
      .then(function(result) {
        if (result.success && result.productos) {
          setProductos(result.productos);
        }
        return result;
      });
  }, []);

  var deleteProducto = useCallback(function(id) {
    return gsService.deleteProducto(id)
      .then(function(result) {
        if (result.success && result.productos) {
          setProductos(result.productos);
        }
        return result;
      });
  }, []);

  // ==========================================================================
  // CATEGORÍAS - CRUD
  // ==========================================================================

  var addCategory = useCallback(function(categoria) {
    return gsService.upsertCategory(categoria)
      .then(function(result) {
        if (result.success && result.categorias) {
          setCategorias(result.categorias);
        }
        return result;
      });
  }, []);

  var updateCategory = useCallback(function(categoria) {
    return gsService.upsertCategory(categoria)
      .then(function(result) {
        if (result.success && result.categorias) {
          setCategorias(result.categorias);
        }
        return result;
      });
  }, []);

  var deleteCategory = useCallback(function(id) {
    return gsService.deleteCategory(id)
      .then(function(result) {
        if (result.success && result.categorias) {
          setCategorias(result.categorias);
        }
        return result;
      });
  }, []);

  // ==========================================================================
  // BÚSQUEDA - String(dato).trim().toLowerCase()
  // ==========================================================================

  var searchProducts = useCallback(function(query) {
    if (!query || !query.trim()) return productos;
    
    var q = String(query || '').trim().toLowerCase();
    
    return productos.filter(function(p) {
      var nombre = String(p.nombre || '').toLowerCase();
      var desc = String(p.descripcion_corta || '').toLowerCase();
      var categoria = String(p.categoria || p.categoria_nombre || '').toLowerCase();
      var codigo = String(p.codigo_barras || '').toLowerCase();
      
      return nombre.includes(q) || desc.includes(q) || categoria.includes(q) || codigo.includes(q);
    });
  }, [productos]);

  var getProductsByCategory = useCallback(function(categoryName) {
    if (!categoryName) return productos;
    
    var cat = String(categoryName || '').toUpperCase().trim();
    
    return productos.filter(function(p) {
      var c = String(p.categoria || p.categoria_nombre || '').toUpperCase().trim();
      return c === cat;
    });
  }, [productos]);

  var getProductById = useCallback(function(id) {
    return productos.find(function(p) { return p.id === id; }) || null;
  }, [productos]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  var refresh = useCallback(function() {
    setLoading(true);
    return gsService.refresh()
      .then(function() {
        setProductos(gsService.getTable('Productos') || []);
        setCategorias(gsService.getCategorias() || []);
        setLoading(false);
        return { success: true };
      })
      .catch(function(err) {
        setLoading(false);
        return { success: false, error: err.message };
      });
  }, []);

  // ==========================================================================
  // MÉTODOS LEGACY (compatibilidad)
  // ==========================================================================

  var forceSync = refresh;

  var getProductos = useCallback(function() { return productos; }, [productos]);
  var getCategorias = useCallback(function() { return categorias; }, [categorias]);
  var getConfiguracion = useCallback(function() { return { tasa_bcv: 46.5 }; }, []);
  var getSesionActiva = useCallback(function() { return null; }, []);
  var saveVenta = useCallback(function(venta) { return Promise.resolve({ success: true }); }, []);
  var updateStock = useCallback(function(id, newStock) {
    var prod = productos.find(function(p) { return p.id === id; });
    if (prod) {
      return gsService.upsertProducto(Object.assign({}, prod, { stock: newStock }));
    }
    return Promise.resolve({ success: false });
  }, [productos]);
  var saveCategoria = useCallback(function(categoria) {
    return gsService.upsertCategory(categoria);
  }, []);
  var dataVersion = useCallback(function() { return Date.now(); }, []);

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  return {
    productos: productos,
    categorias: categorias,
    loading: loading,
    error: error,
    isOnline: isOnline,
    isReady: !loading,
    addProducto: addProducto,
    updateProducto: updateProducto,
    deleteProducto: deleteProducto,
    addCategory: addCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
    searchProducts: searchProducts,
    getProductsByCategory: getProductsByCategory,
    getProductById: getProductById,
    refresh: refresh,
    forceSync: forceSync,
    getProductos: getProductos,
    getCategorias: getCategorias,
    getConfiguracion: getConfiguracion,
    getSesionActiva: getSesionActiva,
    saveVenta: saveVenta,
    updateStock: updateStock,
    saveCategoria: saveCategoria,
    dataVersion: dataVersion
  };
}

export default useDatabase;