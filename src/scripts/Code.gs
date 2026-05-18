/**
 * MICRO MARKET EXPRESS - Backend v7.0 (LIMPIO)
 * =============================================
 * Sheet: 1VVejGluaLaGTXsT9F7yl5sx5-ePsL2KEp6pCKK_pkWo
 * Drive: 1Otottj5OHWtAszwKm_MQMIuByt_UBLW8
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

function getAllSheetsData() {
  var data = { Productos: [], Categorias: [], Caja: [], Ventas: [], tasaBCV: 0, fechaTasa: '', Tasa: null, driveFiles: {} };
  
  var sheets = ['Productos', 'Categorias', 'Caja', 'Ventas'];
  sheets.forEach(function(sheetName) {
    try {
      var sheet = getSheet(sheetName);
      if (sheet && sheet.getLastRow() > 1) {
        var sheetData = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        data[sheetName] = sheetData.map(function(row) {
          var obj = {};
          headers.forEach(function(h, i) { obj[String(h).toLowerCase().trim()] = row[i]; });
          return obj;
        });
      }
    } catch(e) { Logger.log('Error ' + sheetName + ': ' + e.message); }
  });
  
  try {
    var tasaSheet = getSheet('Tasa');
    if (tasaSheet && tasaSheet.getLastRow() >= 2) {
      data.tasaBCV = Number(tasaSheet.getRange('A2').getValue()) || 0;
      data.fechaTasa = String(tasaSheet.getRange('B2').getValue()) || '';
      data.Tasa = { tasa_bcv: data.tasaBCV, tasa_fecha: data.fechaTasa };
    }
  } catch(e) {}

  try {
    data.driveFiles = getDriveFilesMap();
  } catch(e) {
    Logger.log('Error al mapear imágenes de Drive: ' + e.message);
  }
  
  return data;
}

function doGet(e) {
  try {
    var data = getAllSheetsData();
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      status: 'ready',
      service: 'Micro Market Express v7.0',
      tasaBCV: data.tasaBCV,
      fecha: data.fechaTasa,
      Productos: data.Productos,
      Categorias: data.Categorias,
      Ventas: data.Ventas,
      Caja: data.Caja,
      driveFiles: data.driveFiles
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    // 1. Parse incoming data from POST body (JSON) or fallback to query params
    var parsed = {};
    if (e && e.postData && e.postData.contents) {
      try {
        parsed = JSON.parse(e.postData.contents);
      } catch(err) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'JSON invalido en el cuerpo de la peticion' })).setMimeType(ContentService.MimeType.JSON);
      }
    } else if (e && e.parameter) {
      parsed = e.parameter;
    }
    
    // 2. Validate required fields
    var action = parsed.action;
    if (!action) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No se especifico ninguna accion' })).setMimeType(ContentService.MimeType.JSON);
    }
    var data = parsed.data || parsed;
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var result = { success: false };
    
    switch(action) {
      case 'GET_ALL': result = getAllSheetsData(); break;
      case 'SAVE_SALE': result = saveSale(ss, data); break;
      case 'GET_SALES': result = getSales(ss); break;
      case 'GUARDAR_PRODUCTO_CON_IMAGEN':
      case 'UPSERT_PRODUCTO': result = upsertProducto(ss, data); break;
      case 'DELETE_PRODUCTO': result = deleteProducto(ss, data); break;
      case 'UPSERT_CATEGORY': result = upsertCategory(ss, data); break;
      case 'DELETE_CATEGORY': result = deleteCategory(ss, data); break;
      case 'FETCH_TASA_BCV': result = syncTasaBCV(); break;
      case 'UPLOAD_IMAGE': result = uploadImage(data); break;
      case 'GET_CUENTAS_COBRAR': result = { success: true, data: getCuentasCobrar() }; break;
      case 'UPSERT_CUENTA_COBRAR': result = upsertCuentaCobrar(ss, data); break;
      case 'DELETE_CUENTA_COBRAR': result = deleteCuentaCobrar(ss, data); break;
      case 'GET_CUENTAS_PAGAR': result = { success: true, data: getCuentasPagar() }; break;
      case 'UPSERT_CUENTA_PAGAR': result = upsertCuentaPagar(ss, data); break;
      case 'DELETE_CUENTA_PAGAR': result = deleteCuentaPagar(ss, data); break;
      case 'GET_CAJA': result = { success: true, data: getCaja() }; break;
      case 'UPSERT_CAJA': result = upsertCaja(ss, data); break;
      case 'ABRIR_CAJA': result = abrirCaja(ss, data); break;
      case 'CERRAR_CAJA': result = cerrarCaja(ss, data); break;
      case 'UPDATE_TASA': result = updateTasa(ss, data); break;
      default: result = { success: false, error: 'Accion no reconocida: ' + action };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function uploadImage(data) {
  try {
    Logger.log('uploadImage - Iniciando...');
    Logger.log('uploadImage - data: ' + JSON.stringify(data));
    
    if (!data) {
      return { success: false, error: 'No se recibió data' };
    }
    if (!data.data) {
      return { success: false, error: 'No se recibió imagen (data.data vacío)' };
    }
    if (!data.filename) {
      return { success: false, error: 'No se recibió filename' };
    }
    
    var folderId = data.folderId ? data.folderId : DRIVE_FOLDER_ID;
    Logger.log('uploadImage - folderId: ' + folderId);
    
    var folder = DriveApp.getFolderById(folderId);
    Logger.log('uploadImage - Folder obtenido: ' + folder.getName());
    
    var decodedBytes = Utilities.base64Decode(data.data);
    Logger.log('uploadImage - Bytes decodificados: ' + decodedBytes.length);
    
    var ext = data.filename && data.filename.endsWith('.png') ? 'image/png' : 'image/webp';
    var file = folder.createFile(Utilities.newBlob(decodedBytes, ext, data.filename));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var result = { 
      success: true, 
      thumbnailUrl: 'https://drive.google.com/uc?id=' + file.getId() + '&export=view', 
      webViewLink: file.getUrl(), 
      fileId: file.getId() 
    };
    Logger.log('uploadImage - Éxito: ' + JSON.stringify(result));
    return result;
  } catch(err) {
    Logger.log('uploadImage - Error: ' + err.message);
    Logger.log('uploadImage - Stack: ' + err.stack);
    return { success: false, error: err.message + '. Verifica que el folder_id sea correcto y que tengas permisos de Drive.' };
  }
}

function saveSale(ss, data) {
  try {
    var sheet = ss.getSheetByName('Ventas') || ss.insertSheet('Ventas');
    var headers = ['id', 'productos_json', 'total_costo_usd', 'total_venta_usd', 'tasa_bcv', 'utilidad_neta_usd', 'sesion_caja_id', 'pago_efectivo_usd', 'pago_efectivo_bs', 'pago_debito', 'pago_pago_movil', 'pago_bio_pago', 'pago_transferencia', 'vuelto_entregado_usd', 'vuelto_entregado_bs', 'fecha', 'total_bs'];
    ensureHeaders(sheet, headers);
    sheet.appendRow([
      data.id || Utilities.getUuid(),
      JSON.stringify(data.productos || []),
      Number(data.total_costo_usd) || 0,
      Number(data.total_venta_usd) || 0,
      Number(data.tasa_bcv) || 0,
      (Number(data.total_venta_usd) || 0) - (Number(data.total_costo_usd) || 0),
      data.sesion_caja_id || '',
      Number(data.pago_efectivo_usd) || 0,
      Number(data.pago_efectivo_bs) || 0,
      Number(data.pago_debito) || 0,
      Number(data.pago_pago_movil) || 0,
      Number(data.pago_bio_pago) || 0,
      Number(data.pago_transferencia) || 0,
      Number(data.vuelto_entregado_usd) || 0,
      Number(data.vuelto_entregado_bs) || 0,
      data.fecha || new Date().toISOString(),
      Number(data.total_bs) || 0
    ]);
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
}

function getSales(ss) {
  try {
    var sheet = ss.getSheetByName('Ventas');
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    return { success: true, data: data.map(function(row) {
      var obj = {}; headers.forEach(function(h, i) { obj[String(h).toLowerCase().trim()] = row[i]; }); return obj;
    })};
  } catch(e) { return { success: false, error: e.message }; }
}

function guardarImagenEnDrive(idProducto, imagenBase64, extension) {
  var FOLDER_ID = DRIVE_FOLDER_ID || "1Otottj5OHWtAszwKm_MQMIuByt_UBLW8"; // ID de tu carpeta pública
  
  if (!imagenBase64) return "";
  
  try {
    var carpeta = DriveApp.getFolderById(FOLDER_ID);
    
    // CORRECCIÓN CRUCIAL: Eliminar el prefijo data:image/...;base64, si el frontend lo incluye
    var contenidoLimpio = imagenBase64;
    if (imagenBase64.indexOf(",") !== -1) {
      contenidoLimpio = imagenBase64.split(",")[1];
    }
    
    // Decodificar el contenido puro
    var deccodedBytes = Utilities.base64Decode(contenidoLimpio);
    var nombreArchivo = idProducto + "." + (extension || "jpg");
    
    // Evitar duplicados con cualquier extensión anterior para ese ID
    var archivos = carpeta.getFiles();
    while (archivos.hasNext()) {
      var archivo = archivos.next();
      var nombre = archivo.getName();
      if (nombre.indexOf(idProducto + ".") === 0) {
        archivo.setTrashed(true);
      }
    }
    
    // Crear el archivo nuevo en la carpeta de Drive
    var blob = Utilities.newBlob(deccodedBytes, "image/" + (extension || "jpeg"), nombreArchivo);
    var nuevoArchivo = carpeta.createFile(blob);
    
    // Forzar permisos públicos para que el Punto de Venta pueda renderizarla
    nuevoArchivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Retornar la URL de descarga directa real para guardar en Google Sheets
    return "https://docs.google.com/uc?export=download&id=" + nuevoArchivo.getId();
    
  } catch (error) {
    throw new Error("No se pudo guardar la imagen en Google Drive: " + error.toString());
  }
}

function upsertProducto(ss, data) {
  try {
    var sheet = ss.getSheetByName('Productos') || ss.insertSheet('Productos');
    if (sheet.getLastRow() === 0) { 
      sheet.appendRow(['id', 'nombre', 'descripcion_corta', 'numero_unid', 'unidad_medida', 'categoria', 'categoria_nombre', 'precio_usd', 'precio_costo', 'stock', 'stock_minimo', 'imagen_url', 'tasa_bcv', 'codigo_barras']); 
      sheet.getRange(1, 1, 1, 14).setFontWeight('bold'); 
    }
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Paso A (Generación del ID):
    var idProducto = data.id;
    var isNew = !idProducto || idProducto === 'new' || String(idProducto).includes('new') || String(idProducto).indexOf('-') !== -1;
    
    if (isNew) {
      var maxIdNum = 0;
      if (sheet.getLastRow() > 1) {
        var allExistingIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
        for (var i = 0; i < allExistingIds.length; i++) {
          var currentIdNum = parseInt(allExistingIds[i][0]);
          if (!isNaN(currentIdNum) && currentIdNum > maxIdNum) {
            maxIdNum = currentIdNum;
          }
        }
      }
      idProducto = String(maxIdNum + 1);
      data.id = idProducto;
    }
    
    // Paso B (Carga Física en Google Drive):
    if (data.imagenBase64) {
      try {
        var urlDirecta = guardarImagenEnDrive(idProducto, data.imagenBase64, data.extension);
        if (urlDirecta) {
          data.imagen_url = urlDirecta;
        }
      } catch (errImg) {
        return { success: false, error: "Error al subir la imagen a Google Drive: " + errImg.message };
      }
    }

    // Paso C (Escritura en Google Sheets):
    var rowIndex = -1;
    if (sheet.getLastRow() > 1) {
      var allIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
      rowIndex = allIds.findIndex(function(r) { return String(r[0]) === String(idProducto); });
    }
    
    var rowData = headers.map(function(h) {
      var key = String(h).toLowerCase().trim();
      var val = data[key] !== undefined ? data[key] : '';
      if (['precio_usd', 'precio_costo', 'stock', 'stock_minimo', 'numero_unid'].indexOf(key) > -1) return parseFloat(val) || 0;
      return val;
    });
    if (rowIndex === -1) sheet.appendRow(rowData); else sheet.getRange(rowIndex + 2, 1, 1, headers.length).setValues([rowData]);
    return { success: true, data: getAllSheetsData() };
  } catch(e) { return { success: false, error: e.message }; }
}

function deleteProducto(ss, data) {
  try {
    var sheet = ss.getSheetByName('Productos');
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: getAllSheetsData() };
    var allIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    var rowIndex = allIds.findIndex(function(r) { return String(r[0]) === String(data.id); });
    if (rowIndex > -1) sheet.deleteRow(rowIndex + 2);
    return { success: true, data: getAllSheetsData() };
  } catch(e) { return { success: false, error: e.message }; }
}

function upsertCategory(ss, data) {
  try {
    var sheet = ss.getSheetByName('Categorias') || ss.insertSheet('Categorias');
    if (sheet.getLastRow() === 0) { sheet.appendRow(['id', 'nombre', 'icono', 'icono_nombre', 'icono_color', 'orden']); sheet.getRange(1, 1, 1, 6).setFontWeight('bold'); }
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var allIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    var rowIndex = allIds.findIndex(function(r) { return String(r[0]) === String(data.id); });
    var rowData = headers.map(function(h) {
      var key = String(h).toLowerCase().trim();
      var val = data[key] !== undefined ? data[key] : '';
      if (key === 'orden') return parseFloat(val) || 0;
      return val;
    });
    if (rowIndex === -1) sheet.appendRow(rowData); else sheet.getRange(rowIndex + 2, 1, 1, headers.length).setValues([rowData]);
    return { success: true, data: getAllSheetsData() };
  } catch(e) { return { success: false, error: e.message }; }
}

function deleteCategory(ss, data) {
  try {
    var sheet = getSheet('Categorias');
    if (!sheet) return { success: true };
    var allIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    var rowIndex = allIds.findIndex(function(r) { return String(r[0]) === String(data.id); });
    if (rowIndex > -1) sheet.deleteRow(rowIndex + 2);
    return { success: true, data: getAllSheetsData() };
  } catch(e) { return { success: false, error: e.message }; }
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) { sheet.appendRow(headers); sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold'); return; }
  var existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
  headers.forEach(function(h) { if (existing.indexOf(h.toLowerCase()) === -1) { sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h).setFontWeight('bold'); } });
}

function getCuentasCobrar() {
  var sheet = getSheet('CuentasCobrar');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  return data.map(function(row) { return { id: String(row[0]), nombre: String(row[1]), fecha: String(row[2]), fechaVencimiento: String(row[3]), montoOriginal: Number(row[4]), saldoPendiente: Number(row[5]), estado: String(row[6] || 'al-dia') }; }).filter(function(c) { return c.id; });
}

function upsertCuentaCobrar(ss, data) {
  try {
    var sheet = ss.getSheetByName('CuentasCobrar') || ss.insertSheet('CuentasCobrar');
    if (sheet.getLastRow() === 0) { sheet.appendRow(['id', 'nombre', 'fecha', 'fechaVencimiento', 'montoOriginal', 'saldoPendiente', 'estado']); sheet.getRange(1, 1, 1, 7).setFontWeight('bold'); }
    var allIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    var rowIndex = allIds.findIndex(function(r) { return String(r[0]) === String(data.id); });
    var rowData = [data.id, data.nombre, data.fecha, data.fechaVencimiento, data.montoOriginal, data.saldoPendiente, data.estado || 'al-dia'];
    if (rowIndex === -1) sheet.appendRow(rowData); else sheet.getRange(rowIndex + 2, 1, 1, 7).setValues([rowData]);
    return { success: true, data: getCuentasCobrar() };
  } catch(e) { return { success: false, error: e.message }; }
}

function deleteCuentaCobrar(ss, data) {
  try {
    var sheet = getSheet('CuentasCobrar');
    if (!sheet) return { success: true, data: [] };
    var allIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    var rowIndex = allIds.findIndex(function(r) { return String(r[0]) === String(data.id); });
    if (rowIndex > -1) sheet.deleteRow(rowIndex + 2);
    return { success: true, data: getCuentasCobrar() };
  } catch(e) { return { success: false, error: e.message }; }
}

function getCuentasPagar() {
  var sheet = getSheet('CuentasPagar');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  return data.map(function(row) { return { id: String(row[0]), nombre: String(row[1]), fecha: String(row[2]), fechaVencimiento: String(row[3]), montoOriginal: Number(row[4]), saldoPendiente: Number(row[5]), estado: String(row[6] || 'al-dia') }; }).filter(function(c) { return c.id; });
}

function upsertCuentaPagar(ss, data) {
  try {
    var sheet = ss.getSheetByName('CuentasPagar') || ss.insertSheet('CuentasPagar');
    if (sheet.getLastRow() === 0) { sheet.appendRow(['id', 'nombre', 'fecha', 'fechaVencimiento', 'montoOriginal', 'saldoPendiente', 'estado']); sheet.getRange(1, 1, 1, 7).setFontWeight('bold'); }
    var allIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    var rowIndex = allIds.findIndex(function(r) { return String(r[0]) === String(data.id); });
    var rowData = [data.id, data.nombre, data.fecha, data.fechaVencimiento, data.montoOriginal, data.saldoPendiente, data.estado || 'al-dia'];
    if (rowIndex === -1) sheet.appendRow(rowData); else sheet.getRange(rowIndex + 2, 1, 1, 7).setValues([rowData]);
    return { success: true, data: getCuentasPagar() };
  } catch(e) { return { success: false, error: e.message }; }
}

function deleteCuentaPagar(ss, data) {
  try {
    var sheet = getSheet('CuentasPagar');
    if (!sheet) return { success: true, data: [] };
    var allIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    var rowIndex = allIds.findIndex(function(r) { return String(r[0]) === String(data.id); });
    if (rowIndex > -1) sheet.deleteRow(rowIndex + 2);
    return { success: true, data: getCuentasPagar() };
  } catch(e) { return { success: false, error: e.message }; }
}

function getCaja() {
  var sheet = getSheet('Caja');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return data.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[String(h).toLowerCase().trim()] = row[i]; });
    return obj;
  }).filter(function(c) { return c.id; });
}

function upsertCaja(ss, data) {
  try {
    var sheet = ss.getSheetByName('Caja') || ss.insertSheet('Caja');
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['id', 'fecha_apertura', 'apertura_usd', 'apertura_bs', 'tasa_bcv_apertura', 'estado', 'fecha_cierre', 'cierre_usd', 'cierre_bs', 'cierre_debito', 'cierre_pago_movil', 'cierre_bio_pago', 'cierre_transferencia', 'observaciones']);
      sheet.getRange(1, 1, 1, 14).setFontWeight('bold');
    }
    var allIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    var rowIndex = allIds.findIndex(function(r) { return String(r[0]) === String(data.id); });
    var rowData = [
      data.id,
      data.fecha_apertura,
      parseFloat(data.apertura_usd) || 0,
      parseFloat(data.apertura_bs) || 0,
      parseFloat(data.tasa_bcv_apertura) || 0,
      data.estado || 'ACTIVA',
      data.fecha_cierre,
      parseFloat(data.cierre_usd) || 0,
      parseFloat(data.cierre_bs) || 0,
      parseFloat(data.cierre_debito) || 0,
      parseFloat(data.cierre_pago_movil) || 0,
      parseFloat(data.cierre_bio_pago) || 0,
      parseFloat(data.cierre_transferencia) || 0,
      data.observaciones
    ];
    if (rowIndex === -1) sheet.appendRow(rowData); else sheet.getRange(rowIndex + 2, 1, 1, 14).setValues([rowData]);
    return { success: true, data: getCaja() };
  } catch(e) { return { success: false, error: e.message }; }
}

function abrirCaja(ss, data) {
  try {
    var sheet = ss.getSheetByName('Caja') || ss.insertSheet('Caja');
    var headers = ['id', 'fecha_apertura', 'apertura_usd', 'apertura_bs', 'tasa_bcv_apertura', 'estado', 'fecha_cierre', 'cierre_usd', 'cierre_bs', 'cierre_debito', 'cierre_pago_movil', 'cierre_bio_pago', 'cierre_transferencia', 'observaciones'];
    ensureHeaders(sheet, headers);
    sheet.appendRow([
      data.id,
      data.fecha_apertura,
      parseFloat(data.apertura_usd) || 0,
      parseFloat(data.apertura_bs) || 0,
      parseFloat(data.tasa_bcv_apertura) || 0,
      'ACTIVA',
      '', '', '', 0, 0, 0, 0, ''
    ]);
    return { success: true, data: getCaja() };
  } catch(e) { return { success: false, error: e.message }; }
}

function cerrarCaja(ss, data) {
  try {
    var sheet = ss.getSheetByName('Caja');
    if (!sheet) return { success: false, error: 'Sheet Caja no encontrado' };
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var allIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    var rowIndex = allIds.findIndex(function(r) { return String(r[0]) === String(data.id); });
    if (rowIndex === -1) return { success: false, error: 'Sesion de caja no encontrada: ' + data.id };

    var colMap = {};
    headers.forEach(function(h, i) { colMap[String(h).toLowerCase().trim()] = i + 1; });

    var row = rowIndex + 2;
    if (colMap['estado']) sheet.getRange(row, colMap['estado']).setValue('CERRADA');
    if (colMap['fecha_cierre']) sheet.getRange(row, colMap['fecha_cierre']).setValue(data.fecha_cierre);
    if (colMap['cierre_usd']) sheet.getRange(row, colMap['cierre_usd']).setValue(parseFloat(data.cierre_usd) || 0);
    if (colMap['cierre_bs']) sheet.getRange(row, colMap['cierre_bs']).setValue(parseFloat(data.cierre_bs) || 0);
    if (colMap['cierre_debito']) sheet.getRange(row, colMap['cierre_debito']).setValue(parseFloat(data.cierre_debito) || 0);
    if (colMap['cierre_pago_movil']) sheet.getRange(row, colMap['cierre_pago_movil']).setValue(parseFloat(data.cierre_pago_movil) || 0);
    if (colMap['cierre_bio_pago']) sheet.getRange(row, colMap['cierre_bio_pago']).setValue(parseFloat(data.cierre_bio_pago) || 0);
    if (colMap['cierre_transferencia']) sheet.getRange(row, colMap['cierre_transferencia']).setValue(parseFloat(data.cierre_transferencia) || 0);
    if (colMap['observaciones']) sheet.getRange(row, colMap['observaciones']).setValue(data.observaciones || '');

    return { success: true, data: getCaja() };
  } catch(e) { return { success: false, error: e.message }; }
}

function syncTasaBCV() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('Tasa') || ss.insertSheet('Tasa');
    if (sheet.getLastRow() === 0) { sheet.appendRow(['tasa_actual', 'fecha_vigencia', 'ultima_sincronizacion']); sheet.getRange(1, 1, 1, 3).setFontWeight('bold'); }
    var response = UrlFetchApp.fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar?moneda=bcv', { muteHttpExceptions: true, timeout: 15000 });
    var json = JSON.parse(response.getContentText());
    var tasa = json && json.monedasc && json.monedasc.bcv ? parseFloat(String(json.monedasc.bcv.price).replace(',', '.')).toFixed(2) : 0;
    if (tasa && tasa > 400) {
      sheet.getRange('A2').setValue(tasa);
      sheet.getRange('B2').setValue(new Date().toLocaleDateString('es-VE'));
      sheet.getRange('C2').setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'));
      SpreadsheetApp.flush();
      return { success: true, data: { tasa_bcv: tasa, tasa_fecha: new Date().toLocaleDateString('es-VE') } };
    }
    return { success: false, error: 'Tasa inválida' };
  } catch(e) { return { success: false, error: e.message }; }
}

function setupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) { if (triggers[i].getHandlerFunction() === 'sincronizarTasaBCVAutomatica') return 'Ya existe'; }
  ScriptApp.newTrigger('sincronizarTasaBCVAutomatica').timeBased().everyHours(4).create();
  return 'Trigger creado';
}

function sincronizarTasaBCVAutomatica() {
  try { syncTasaBCV(); } catch(e) { Logger.log('Error: ' + e.message); }
}

function updateTasa(ss, data) {
  try {
    var tasa = parseFloat(data.tasa) || 0;
    if (tasa < 0) return { success: false, error: 'Tasa invalida' };
    var sheet = ss.getSheetByName('Tasa') || ss.insertSheet('Tasa');
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['tasa_actual', 'fecha_vigencia', 'ultima_sincronizacion']);
      sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    }
    sheet.getRange('A2').setValue(tasa);
    sheet.getRange('B2').setValue(new Date().toLocaleDateString('es-VE'));
    sheet.getRange('C2').setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'));
    SpreadsheetApp.flush();
    return { success: true, data: { tasa_bcv: tasa, tasa_fecha: new Date().toLocaleDateString('es-VE') } };
  } catch(e) {
    return { success: false, error: e.message };
  }
}