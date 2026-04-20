/**
 * MICRO MARKET EXPRESS - MOTOR DEFINITIVO v8.0
 * ============================================
 * ID Hoja: 1VVejGluaLaGTXsT9F7yl5sx5-ePsL2KEp6pCKK_pkWo
 * 
 * Funciones:
 * - CRUD completo de Productos y Categorías
 * - UPSERT por ID como llave primaria
 * - Persistencia de categoria (nombre) y tasa_bcv
 * - Retorna array actualizado en cada operación
 */

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const SPREADSHEET_ID = '1VVejGluaLaGTXsT9F7yl5sx5-ePsL2KEp6pCKK_pkWo';

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function getAllData() {
  try {
    const productos = getProductosData();
    const categorias = getCategoriasData();
    return { success: true, data: { Productos: productos, Categorias: categorias } };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ============================================================================
// PRODUCTOS - LECTURA
// ============================================================================

function getProductosData() {
  const sheet = getSheet('Productos');
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  
  return data.map(function(row) {
    return {
      id: String(row[0] || ''),
      nombre: String(row[1] || ''),
      descripcion_corta: String(row[2] || ''),
      numero_unid: Number(row[3]) || 1,
      unidad_medida: String(row[4] || 'UNIDAD'),
      categoria: String(row[5] || 'VARIOS'),
      categoria_nombre: String(row[5] || 'VARIOS'),
      precio_usd: Number(row[6]) || 0,
      precio_costo: Number(row[7]) || 0,
      stock: Number(row[8]) || 0,
      stock_minimo: Number(row[9]) || 5,
      imagen_url: String(row[10] || ''),
      tasa_bcv: String(row[11] || ''),
      codigo_barras: String(row[12] || '')
    };
  }).filter(function(p) {
    return p.id;
  });
}

// ============================================================================
// PRODUCTOS - UPSERT (Buscar por ID y actualizar)
// ============================================================================

function upsertProducto(producto) {
  var sheet = getSheet('Productos');
  if (!sheet) return { success: false, error: 'Sheet Productos no existe' };
  
  var data = sheet.getDataRange().getValues();
  
  // Buscar fila por ID (columna A = índice 0)
  var filaIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(producto.id)) {
      filaIdx = i + 1;
      break;
    }
  }
  
  var rowData = [
    String(producto.id || ''),
    String(producto.nombre || '').toUpperCase(),
    String(producto.descripcion_corta || ''),
    Number(producto.numero_unid) || 1,
    String(producto.unidad_medida || 'UNIDAD'),
    String(producto.categoria || producto.categoria_nombre || 'VARIOS'),
    Number(producto.precio_usd) || 0,
    Number(producto.precio_costo) || 0,
    Number(producto.stock) || 0,
    Number(producto.stock_minimo) || 5,
    String(producto.imagen_url || ''),
    String(producto.tasa_bcv || ''),
    String(producto.codigo_barras || '')
  ];
  
  if (filaIdx === -1) {
    // NUEVO: agregar al final
    sheet.appendRow(rowData);
    filaIdx = sheet.getLastRow();
  } else {
    // EXISTENTE: actualizar fila
    sheet.getRange(filaIdx, 1, 1, 13).setValues([rowData]);
  }
  
  // Retornar todos los productos actualizados
  var productos = getProductosData();
  var categorias = getCategoriasData();
  
  return {
    success: true,
    data: { Productos: productos, Categorias: categorias }
  };
}

// ============================================================================
// PRODUCTOS - DELETE
// ============================================================================

function deleteProducto(id) {
  var sheet = getSheet('Productos');
  if (!sheet) return { success: false, error: 'Sheet no existe' };
  
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  
  var productos = getProductosData();
  var categorias = getCategoriasData();
  
  return {
    success: true,
    data: { Productos: productos, Categorias: categorias }
  };
}

// ============================================================================
// CATEGORÍAS - LECTURA
// ============================================================================

function getCategoriasData() {
  var sheet = getSheet('Categorias');
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  var data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  
  return data.map(function(row) {
    return {
      id: String(row[0] || ''),
      nombre: String(row[1] || '').toUpperCase(),
      icono: String(row[2] || '{"name":"Package","color":"#808080"}'),
      icono_nombre: String(row[3] || 'Package'),
      icono_color: String(row[4] || '#808080')
    };
  }).filter(function(c) {
    return c.id && c.nombre;
  });
}

// ============================================================================
// CATEGORÍAS - UPSERT
// ============================================================================

function upsertCategoria(categoria) {
  var sheet = getSheet('Categorias');
  if (!sheet) return { success: false, error: 'Sheet Categorias no existe' };
  
  var data = sheet.getDataRange().getValues();
  
  var filaIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(categoria.id)) {
      filaIdx = i + 1;
      break;
    }
  }
  
  var iconoObj;
  if (typeof categoria.icono === 'string') {
    try {
      iconoObj = JSON.parse(categoria.icono);
    } catch(e) {
      iconoObj = { name: 'Package', color: '#808080' };
    }
  } else {
    iconoObj = categoria.icono || { name: 'Package', color: '#808080' };
  }
  
  var rowData = [
    String(categoria.id || ''),
    String(categoria.nombre || '').toUpperCase(),
    JSON.stringify(iconoObj),
    String(iconoObj.name || 'Package'),
    String(iconoObj.color || '#808080')
  ];
  
  if (filaIdx === -1) {
    sheet.appendRow(rowData);
  } else {
    sheet.getRange(filaIdx, 1, 1, 5).setValues([rowData]);
  }
  
  var productos = getProductosData();
  var categorias = getCategoriasData();
  
  return {
    success: true,
    data: { Productos: productos, Categorias: categorias }
  };
}

// ============================================================================
// CATEGORÍAS - DELETE
// ============================================================================

function deleteCategoria(id) {
  var sheet = getSheet('Categorias');
  if (!sheet) return { success: false, error: 'Sheet no existe' };
  
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  
  var productos = getProductosData();
  var categorias = getCategoriasData();
  
  return {
    success: true,
    data: { Productos: productos, Categorias: categorias }
  };
}

// ============================================================================
// HANDLER PRINCIPAL - doPost
// ============================================================================

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Sin datos' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var data = payload.data;
    
    var result;
    
    if (action === 'GET_ALL') {
      result = getAllData();
    } else if (action === 'UPSERT_PRODUCTO') {
      result = upsertProducto(data);
    } else if (action === 'DELETE_PRODUCTO') {
      result = deleteProducto(data.id);
    } else if (action === 'UPSERT_CATEGORY') {
      result = upsertCategoria(data);
    } else if (action === 'DELETE_CATEGORY') {
      result = deleteCategoria(data.id);
    } else {
      result = { success: false, error: 'Acción desconocida: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// HANDLER GET (Prueba de conexión)
// ============================================================================

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    status: 'ready', 
    service: 'Micro Market Express v8.0',
    spreadsheet: SPREADSHEET_ID
  })).setMimeType(ContentService.MimeType.JSON);
}