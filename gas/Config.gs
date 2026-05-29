var UNC = {
  APP_NAME: 'UNC_TRADUCTOR_GUARANI',
  DEFAULT_VERSION: '0.1.0-piloto',
  ROLES: ['admin', 'supervisor', 'linguista', 'cargador', 'viewer'],
  PERMISSIONS: {
    admin: ['capture', 'review', 'dashboard', 'admin', 'exports', 'logs', 'translate'],
    supervisor: ['capture', 'review', 'dashboard', 'exports', 'logs', 'translate'],
    linguista: ['capture', 'review', 'dashboard', 'exports', 'translate'],
    cargador: ['capture', 'dashboard', 'translate'],
    viewer: ['dashboard', 'translate']
  },
  SHEETS: {
    CONFIG: 'CONFIG',
    USUARIOS: 'USUARIOS',
    PARTICIPANTES: 'PARTICIPANTES',
    PROMPTS: 'PROMPTS',
    RECORDINGS: 'RECORDINGS',
    ARCHIVOS: 'ARCHIVOS',
    LOG: 'LOG',
    ERRORES: 'ERRORES',
    VERSIONES: 'VERSIONES',
    EXPORTS: 'EXPORTS'
  },
  HEADERS: {
    CONFIG: ['parametro', 'valor', 'descripcion', 'activo'],
    USUARIOS: ['usuario', 'password_hash', 'nombre', 'correo', 'rol', 'activo', 'fecha_creacion', 'ultimo_acceso', 'observacion'],
    PARTICIPANTES: ['participant_id', 'alias', 'rango_edad', 'departamento', 'distrito', 'comunidad', 'lengua_materna', 'nivel_guarani', 'variante_guarani', 'otros_idiomas', 'consent_version', 'consent_accepted', 'created_at', 'app_version'],
    PROMPTS: ['prompt_id', 'text_guarani', 'text_guarani_normalized', 'text_spanish', 'source', 'topic', 'difficulty_level', 'token_count', 'character_count', 'status', 'version', 'created_at', 'updated_at'],
    RECORDINGS: ['recording_id', 'participant_id', 'prompt_id', 'attempt_number', 'audio_file_id', 'audio_url', 'audio_filename', 'audio_mime_type', 'audio_duration_ms', 'audio_size_bytes', 'hash_audio', 'created_at', 'origin', 'sync_status', 'quality_status', 'review_status', 'reviewer_user', 'reviewed_at', 'review_notes', 'app_version', 'device_type', 'browser'],
    ARCHIVOS: ['file_id', 'recording_id', 'participant_id', 'prompt_id', 'filename', 'mime_type', 'drive_file_id', 'drive_url', 'upload_status', 'created_at', 'size_bytes', 'hash_file'],
    LOG: ['fecha_hora', 'evento', 'usuario', 'rol', 'participant_id', 'recording_id', 'prompt_id', 'modulo', 'detalle', 'device_info', 'app_version'],
    ERRORES: ['fecha_hora', 'modulo', 'funcion', 'tipo_error', 'mensaje_tecnico', 'mensaje_usuario', 'usuario', 'device_info', 'app_version'],
    VERSIONES: ['app_version', 'fecha', 'descripcion', 'cambios', 'responsable'],
    EXPORTS: ['export_id', 'tipo_exportacion', 'fecha_hora', 'usuario', 'cantidad_registros', 'url_archivo', 'estado']
  }
};

function getAppVersion() {
  return PropertiesService.getScriptProperties().getProperty('APP_VERSION') || UNC.DEFAULT_VERSION;
}

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Falta Script Property SPREADSHEET_ID');
  return SpreadsheetApp.openById(id);
}

function getDriveFolder_() {
  var id = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
  if (!id) throw new Error('Falta Script Property DRIVE_FOLDER_ID');
  return DriveApp.getFolderById(id);
}

function nowIso_() {
  return new Date().toISOString();
}

function makeId_(prefix) {
  return prefix + '_' + Utilities.getUuid();
}

function getSheet_(sheetName) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  var headers = UNC.HEADERS[sheetName];
  if (headers && sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function setupDatabase() {
  Object.keys(UNC.HEADERS).forEach(function (name) {
    getSheet_(name);
  });
  appendObject_(UNC.SHEETS.VERSIONES, {
    app_version: getAppVersion(),
    fecha: nowIso_(),
    descripcion: 'Inicializacion de estructura UNC_TRADUCTOR_GUARANI',
    cambios: 'Creacion de hojas operativas y columnas minimas',
    responsable: Session.getActiveUser().getEmail() || 'script'
  });
  appendObject_(UNC.SHEETS.CONFIG, {
    parametro: 'CONSENT_VERSION',
    valor: 'CONS-UNC-GN-2026-05-29-v1',
    descripcion: 'Version vigente de consentimiento informado',
    activo: true
  });
  return { ok: true, sheets: Object.keys(UNC.HEADERS) };
}

function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) return { action: '', payload: {} };
  return JSON.parse(e.postData.contents);
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function headersFor_(sheetName) {
  return UNC.HEADERS[sheetName] || [];
}

function appendObject_(sheetName, object) {
  var sheet = getSheet_(sheetName);
  var headers = headersFor_(sheetName);
  var row = headers.map(function (key) {
    return object[key] === undefined || object[key] === null ? '' : object[key];
  });
  sheet.appendRow(row);
  return object;
}

function readObjects_(sheetName) {
  var sheet = getSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).filter(function (row) {
    return row.join('') !== '';
  }).map(function (row) {
    var object = {};
    headers.forEach(function (header, index) {
      object[header] = row[index];
    });
    return object;
  });
}

function findRowIndex_(sheetName, key, value) {
  var sheet = getSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return -1;
  var headers = values[0];
  var col = headers.indexOf(key);
  if (col < 0) return -1;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][col]) === String(value)) return i + 1;
  }
  return -1;
}

function upsertObject_(sheetName, key, object) {
  var sheet = getSheet_(sheetName);
  var headers = headersFor_(sheetName);
  var rowIndex = findRowIndex_(sheetName, key, object[key]);
  var row = headers.map(function (header) {
    return object[header] === undefined || object[header] === null ? '' : object[header];
  });
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return object;
}

function truthy_(value) {
  return value === true || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'si';
}

function toHex_(bytes) {
  return bytes.map(function (byte) {
    var value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}
