function saveAudioFile_(recording, audioBase64) {
  if (!audioBase64) throw new Error('audio_base64 requerido para crear archivo');
  var bytes = Utilities.base64Decode(audioBase64);
  var filename = recording.audio_filename;
  var mimeType = recording.audio_mime_type || 'audio/webm';
  var blob = Utilities.newBlob(bytes, mimeType, filename);
  var file = getDriveFolder_().createFile(blob);
  var row = {
    file_id: makeId_('file'),
    recording_id: recording.recording_id,
    participant_id: recording.participant_id,
    prompt_id: recording.prompt_id,
    filename: filename,
    mime_type: mimeType,
    drive_file_id: file.getId(),
    drive_url: file.getUrl(),
    upload_status: 'OK',
    created_at: nowIso_(),
    size_bytes: bytes.length,
    hash_file: recording.hash_audio || ''
  };
  appendObject_(UNC.SHEETS.ARCHIVOS, row);
  return row;
}
