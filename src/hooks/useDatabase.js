/**
 * useDatabase.js - Hook Definitivo v8.1 (REFACTORIZADO)
 * ===========================================
 * 
 * 100% Google Sheets
 * Patrón: initialize() -> getTable() -> setState()
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
  // INICIALIZACIÓN - Async/Await
  // ==========================================================================

  useEffect(function() {
    var init = async function() {
      setLoading(true);
      try {
        await gsService.initialize();
        setProductos(gsService.getTable('Productos') || []);
        setCategorias(gsService.getTable('Categorias') || []);
      } catch(err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
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
  // PRODUCTOS - CRUD (async/await)
  // ==========================================================================

  var addProducto = useCallback(async function(producto) {
    var result = await gsService.upsertProducto(producto);
    if (result.success) {
      await gsService.refresh();
      setProductos(gsService.getTable('Productos') || []);
    }
    return result;
  }, []);

  var updateProducto = useCallback(async function(producto) {
    var result = await gsService.upsertProducto(producto);
    if (result.success) {
      await gsService.refresh();
      setProductos(gsService.getTable('Productos') || []);
    }
    return result;
  }, []);

  var deleteProducto = useCallback(async function(id) {
    var result = await gsService.deleteProducto(id);
    if (result.success) {
      await gsService.refresh();
      setProductos(gsService.getTable('Productos') || []);
    }
    return result;
  }, []);

  // ==========================================================================
  // CATEGORÍAS - CRUD (async/await)
  // ==========================================================================

  var addCategory = useCallback(async function(categoria) {
    var result = await gsService.upsertCategory(categoria);
    if (result.success) {
      await gsService.refresh();
      setCategorias(gsService.getTable('Categorias') || []);
    }
    return result;
  }, []);

  var updateCategory = useCallback(async function(categoria) {
    var result = await gsService.upsertCategory(categoria);
    if (result.success) {
      await gsService.refresh();
      setCategorias(gsService.getTable('Categorias') || []);
    }
    return result;
  }, []);

  var deleteCategory = useCallback(async function(id) {
    var result = await gsService.deleteCategory(id);
    if (result.success) {
      await gsService.refresh();
      setCategorias(gsService.getTable('Categorias') || []);
    }
    return result;
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
  // REFRESH (async/await)
  // ==========================================================================

  var refresh = useCallback(async function() {
    setLoading(true);
    try {
      await gsService.refresh();
      setProductos(gsService.getTable('Productos') || []);
      setCategorias(gsService.getTable('Categorias') || []);
      return { success: true };
    } catch(err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
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