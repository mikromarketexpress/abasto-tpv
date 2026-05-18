/**
 * MICRO MARKET EXPRESS - MOTOR DEFINITIVO v8.0
 * ============================================
 * ID Hoja: 1VVejGluaLaGTXsT9F7yl5sx5-ePsL2KEp6pCKK_pkWo
 * Carpeta Drive: 1Otottj5OHWtAszwKm_MQMIuByt_UBLW8
 */

const SPREADSHEET_ID = '1VVejGluaLaGTXsT9F7yl5sx5-ePsL2KEp6pCKK_pkWo';
const DRIVE_FOLDER_ID = '1Otottj5OHWtAszwKm_MQMIuByt_UBLW8';

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function getDriveFilesMap() {
  var map = {};
  try {
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      var name = String(file.getName()).toLowerCase().trim();
      var dotIndex = name.lastIndexOf('.');
      var key = dotIndex > -1 ? name.substring(0, dotIndex) : name;
      map[key] = file.getId();
    }
  } catch (e) {
    Logger.log('Error en getDriveFilesMap: ' + e.message);
  }
  return map;
}

function getAllData() {
  try {
    var driveFiles = {};
    try {
      driveFiles = getDriveFilesMap();
    } catch(e) {
      Logger.log('Error en driveFiles: ' + e.message);
    }
    return { success: true, data: { Productos: getProductosData(), Categorias: getCategoriasData(), driveFiles: driveFiles } };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ============================================================================
// PRODUCTOS
// ============================================================================

function getProductosData() {
  const sheet = getSheet('Productos');
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
  
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
  }).filter(function(p) { return p.id; });
}

function upsertProducto(producto) {
  var sheet = getSheet('Productos');
  if (!sheet) return { success: false, error: 'Sheet Productos no existe' };
  
  var data = sheet.getDataRange().getValues();
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
  
  if (filaIdx > -1) {
    sheet.getRange(filaIdx, 1, 1, 13).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return { success: true, productos: getProductosData() };
}

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
  return { success: true, productos: getProductosData() };
}

// ============================================================================
// CATEGORÍAS
// ============================================================================

function getCategoriasData() {
  var sheet = getSheet('Categorias');
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  return data.map(function(row, idx) {
    return { id: String(row[0] || ''), nombre: String(row[1] || ''), icono_nombre: String(row[2] || ''), color: String(row[3] || '') };
  }).filter(function(c) { return c.id; });
}

function upsertCategoria(categoria) {
  var sheet = getSheet('Categorias');
  if (!sheet) return { success: false, error: 'Sheet Categorias no existe' };
  var data = sheet.getDataRange().getValues();
  var existe = false;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(categoria.id)) {
      sheet.getRange(i + 1, 1, 1, 4).setValues([[categoria.id, categoria.nombre, categoria.icono_nombre, categoria.color]]);
      existe = true;
      break;
    }
  }
  if (!existe) {
    sheet.appendRow([categoria.id, categoria.nombre, categoria.icono_nombre, categoria.color]);
  }
  return { success: true, categorias: getCategoriasData() };
}

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
  return { success: true, categorias: getCategoriasData() };
}

// ============================================================================
// UPLOAD IMAGEN A DRIVE
// ============================================================================

function uploadImageToDrive(base64Data, filename, folderId) {
  try {
    var targetFolderId = folderId || DRIVE_FOLDER_ID;
    var folder;
    try {
      folder = DriveApp.getFolderById(targetFolderId);
    } catch (e) {
      folder = DriveApp.getRootFolder().createFolder('Fotos_Productos');
    }
    
    var decodedBytes = Utilities.base64Decode(base64Data);
    var ext = filename && filename.endsWith('.png') ? 'image/png' : 'image/webp';
    var blob = Utilities.newBlob(decodedBytes, ext, filename);
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var thumbnailUrl = 'https://drive.google.com/uc?id=' + file.getId() + '&export=view';
    
    return {
      success: true,
      status: 'success',
      filename: filename,
      fileId: file.getId(),
      thumbnailUrl: thumbnailUrl,
      webViewLink: file.getUrl()
    };
  } catch (err) {
    return { success: false, status: 'error', message: err.toString() };
  }
}

// ============================================================================
// HANDLER POST
// ============================================================================

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Sin datos' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var result;
    
    if (action === 'GET_ALL') {
      result = getAllData();
    } else if (action === 'UPSERT_PRODUCTO') {
      result = upsertProducto(payload.data);
    } else if (action === 'DELETE_PRODUCTO') {
      result = deleteProducto(payload.data.id);
    } else if (action === 'UPSERT_CATEGORY') {
      result = upsertCategoria(payload.data);
    } else if (action === 'DELETE_CATEGORY') {
      result = deleteCategoria(payload.data.id);
    } else if (action === 'UPLOAD_IMAGE') {
      result = uploadImageToDrive(payload.data.data, payload.data.filename, payload.data.folderId);
    } else {
      result = { success: false, error: 'Acción desconocida: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// HANDLER GET
// ============================================================================

function doGet(e) {
  var driveFiles = {};
  try {
    driveFiles = getDriveFilesMap();
  } catch(err) {}
  return ContentService.createTextOutput(JSON.stringify({ 
    status: 'ready', 
    service: 'Micro Market Express v8.0',
    spreadsheet: SPREADSHEET_ID,
    driveFolder: DRIVE_FOLDER_ID,
    driveFiles: driveFiles
  })).setMimeType(ContentService.MimeType.JSON);
}