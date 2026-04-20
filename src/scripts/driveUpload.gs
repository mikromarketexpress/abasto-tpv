/**
 * GOOGLE APPS SCRIPT - Manejo de Imágenes en Drive
 * 
 * - Sube imágenes a carpeta específica
 * - ID Carpeta: 1Otottj5OHWtAszwKm_MQMIuByt_UBLW8
 */

const DRIVE_FOLDER_ID = '1Otottj5OHWtAszwKm_MQMIuByt_UBLW8';

function ok(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function error(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return error('Sin datos');
    }
    
    const payload = JSON.parse(e.postData.contents);
    const { action, filename, data, folderId } = payload;
    
    if (action === 'UPLOAD_IMAGE') {
      return uploadImageToDrive(data, filename, folderId || DRIVE_FOLDER_ID);
    }
    
    return error('Acción desconocida: ' + action);
    
  } catch (err) {
    return error('ERROR: ' + err.toString());
  }
}

function uploadImageToDrive(base64Data, filename, folderId) {
  try {
    // Obtener o crear carpeta
    var folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      // Crear carpeta si no existe
      var parentFolder = DriveApp.getRootFolder();
      folder = parentFolder.createFolder('Fotos_Productos');
    }
    
    // Decodificar base64
    var decodedBytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedBytes, 'image/webp', filename);
    
    // Crear archivo en Drive
    var file = folder.createFile(blob);
    
    // Configurar permisos para cualquiera con link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Obtener URL de visualización
    var thumbnailUrl = 'https://drive.google.com/uc?id=' + file.getId() + '&export=download';
    
    Logger.log('Imagen subida: ' + filename + ' - ID: ' + file.getId());
    
    return ok({
      status: 'success',
      filename: filename,
      fileId: file.getId(),
      thumbnailUrl: thumbnailUrl,
      webViewLink: file.getUrl()
    });
    
  } catch (err) {
    Logger.log('Error upload: ' + err.toString());
    return error('Error al subir: ' + err.toString());
  }
}

function doGet(e) {
  return ok({ status: 'ready', service: 'Drive Image Upload' });
}