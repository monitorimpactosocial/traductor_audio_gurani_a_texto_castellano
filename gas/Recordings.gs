function validateRecording_(recording) {
  var required = ['recording_id', 'participant_id', 'prompt_id', 'audio_filename', 'audio_mime_type', 'audio_duration_ms', 'audio_size_bytes', 'hash_audio'];
  required.forEach(function (field) {
    if (recording[field] === undefined || recording[field] === null || recording[field] === '') {
      throw new Error('Campo requerido faltante: ' + field);
    }
  });
  if (Number(recording.audio_duration_ms) < 500) throw new Error('Audio demasiado corto');
  if (Number(recording.audio_size_bytes) < 500) throw new Error('Archivo de audio vacio o invalido');
}

function saveRecordingMetadata_(recording, fileInfo) {
  validateRecording_(recording);
  var row = {
    recording_id: recording.recording_id,
    participant_id: recording.participant_id,
    prompt_id: recording.prompt_id,
    attempt_number: recording.attempt_number || 1,
    audio_file_id: fileInfo.file_id,
    audio_url: fileInfo.drive_url,
    audio_filename: recording.audio_filename,
    audio_mime_type: recording.audio_mime_type,
    audio_duration_ms: recording.audio_duration_ms,
    audio_size_bytes: recording.audio_size_bytes,
    hash_audio: recording.hash_audio,
    created_at: recording.created_at || nowIso_(),
    origin: recording.origin || 'online',
    sync_status: 'SINCRONIZADO',
    quality_status: recording.quality_status || 'PENDIENTE_REVISION',
    review_status: recording.review_status || 'PENDIENTE_REVISION_HUMANA',
    reviewer_user: '',
    reviewed_at: '',
    review_notes: recording.review_notes || '',
    app_version: recording.app_version || getAppVersion(),
    device_type: recording.device_type || '',
    browser: recording.browser || ''
  };
  upsertObject_(UNC.SHEETS.RECORDINGS, 'recording_id', row);
  return row;
}

function reviewRecording(payload, session) {
  var user = requireRole_(session, ['admin', 'supervisor', 'linguista']);
  var recordingId = payload.recording_id;
  var qualityStatus = payload.quality_status;
  if (!recordingId || !qualityStatus) throw new Error('recording_id y quality_status requeridos');
  var rows = readObjects_(UNC.SHEETS.RECORDINGS);
  var recording = rows.filter(function (item) {
    return String(item.recording_id) === String(recordingId);
  })[0];
  if (!recording) throw new Error('Grabacion no encontrada');
  recording.quality_status = qualityStatus;
  recording.review_status = qualityStatus === 'APROBADO' ? 'VALIDADO' : qualityStatus === 'RECHAZADO' ? 'RECHAZADO' : 'PENDIENTE_REVISION_HUMANA';
  recording.reviewer_user = user.usuario;
  recording.reviewed_at = nowIso_();
  recording.review_notes = payload.review_notes || recording.review_notes || '';
  upsertObject_(UNC.SHEETS.RECORDINGS, 'recording_id', recording);
  appendLog_('revision de audio', user, recording.participant_id, recording.recording_id, recording.prompt_id, 'recordings', qualityStatus);
  appendLog_('cambio de estado', user, recording.participant_id, recording.recording_id, recording.prompt_id, 'recordings', qualityStatus);
  return { ok: true, recording: recording };
}
