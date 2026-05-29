function syncRecording(payload, session) {
  var user = requireRole_(session, ['admin', 'supervisor', 'linguista', 'cargador']);
  var recording = payload.recording || {};
  var participant = payload.participant || {};
  var prompt = payload.prompt || {};
  var audioBase64 = payload.audio_base64 || '';

  if (participant.participant_id) saveParticipant(participant, session);
  if (prompt.prompt_id && findRowIndex_(UNC.SHEETS.PROMPTS, 'prompt_id', prompt.prompt_id) < 0) {
    createPrompt(prompt, { usuario: user.usuario });
  }

  var fileInfo = saveAudioFile_(recording, audioBase64);
  var saved = saveRecordingMetadata_(recording, fileInfo);
  appendLog_('sincronizacion exitosa', user, saved.participant_id, saved.recording_id, saved.prompt_id, 'sync', 'audio y metadatos guardados');
  return {
    ok: true,
    recording_id: saved.recording_id,
    audio_file_id: fileInfo.file_id,
    audio_url: fileInfo.drive_url,
    drive_file_id: fileInfo.drive_file_id
  };
}
