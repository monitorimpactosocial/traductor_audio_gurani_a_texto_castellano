function csvEscape_(value) {
  return '"' + String(value === undefined || value === null ? '' : value).replace(/"/g, '""') + '"';
}

function objectsToCsv_(rows, headers) {
  return [headers.join(',')].concat(rows.map(function (row) {
    return headers.map(function (header) {
      return csvEscape_(row[header]);
    }).join(',');
  })).join('\n');
}

function createExportFile_(filename, content, mimeType) {
  var blob = Utilities.newBlob(content, mimeType || 'text/plain', filename);
  var file = getDriveFolder_().createFile(blob);
  return file.getUrl();
}

function exportData(payload, session) {
  var user = requireRole_(session, ['admin', 'supervisor', 'linguista']);
  var type = payload.tipo_exportacion || 'metadata_recordings.csv';
  var url = '';
  var count = 0;

  if (type === 'metadata_recordings.csv') {
    var headers = UNC.HEADERS.RECORDINGS;
    var rows = readObjects_(UNC.SHEETS.RECORDINGS);
    count = rows.length;
    url = createExportFile_(type, objectsToCsv_(rows, headers), 'text/csv');
  } else if (type === 'participants_anonymized.csv') {
    var pHeaders = UNC.HEADERS.PARTICIPANTES.filter(function (header) {
      return header !== 'alias';
    });
    var participants = readObjects_(UNC.SHEETS.PARTICIPANTES);
    count = participants.length;
    url = createExportFile_(type, objectsToCsv_(participants, pHeaders), 'text/csv');
  } else if (type === 'prompts.csv') {
    var prompts = readObjects_(UNC.SHEETS.PROMPTS);
    count = prompts.length;
    url = createExportFile_(type, objectsToCsv_(prompts, UNC.HEADERS.PROMPTS), 'text/csv');
  } else if (type === 'manifest_asr.jsonl') {
    var recordings = readObjects_(UNC.SHEETS.RECORDINGS);
    var promptsById = {};
    readObjects_(UNC.SHEETS.PROMPTS).forEach(function (prompt) {
      promptsById[prompt.prompt_id] = prompt;
    });
    var lines = recordings.map(function (recording) {
      var prompt = promptsById[recording.prompt_id] || {};
      return JSON.stringify({
        audio_filepath: recording.audio_url,
        text: prompt.text_guarani || '',
        duration_ms: recording.audio_duration_ms,
        prompt_id: recording.prompt_id,
        participant_id: recording.participant_id,
        quality_status: recording.quality_status,
        device_type: recording.device_type,
        browser: recording.browser
      });
    });
    count = recordings.length;
    url = createExportFile_(type, lines.join('\n'), 'application/json');
  } else if (type === 'parallel_guarani_spanish.csv') {
    var parallelRows = readObjects_(UNC.SHEETS.PROMPTS).filter(function (prompt) {
      return prompt.text_spanish;
    }).map(function (prompt) {
      return {
        prompt_id: prompt.prompt_id,
        text_guarani: prompt.text_guarani,
        text_spanish: prompt.text_spanish,
        status: prompt.status,
        version: prompt.version
      };
    });
    count = parallelRows.length;
    url = createExportFile_(type, objectsToCsv_(parallelRows, ['prompt_id', 'text_guarani', 'text_spanish', 'status', 'version']), 'text/csv');
  } else if (type === 'quality_review.csv') {
    var qualityRows = readObjects_(UNC.SHEETS.RECORDINGS);
    count = qualityRows.length;
    url = createExportFile_(type, objectsToCsv_(qualityRows, ['recording_id', 'quality_status', 'review_status', 'reviewer_user', 'reviewed_at', 'review_notes']), 'text/csv');
  } else {
    throw new Error('Tipo de exportacion no soportado');
  }

  var exportRow = {
    export_id: makeId_('export'),
    tipo_exportacion: type,
    fecha_hora: nowIso_(),
    usuario: user.usuario,
    cantidad_registros: count,
    url_archivo: url,
    estado: 'OK'
  };
  appendObject_(UNC.SHEETS.EXPORTS, exportRow);
  appendLog_('exportacion de datos', user, '', '', '', 'exportaciones', type);
  return { ok: true, export: exportRow };
}
