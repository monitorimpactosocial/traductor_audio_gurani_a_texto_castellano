function appendLog_(evento, user, participantId, recordingId, promptId, modulo, detalle, deviceInfo) {
  var row = {
    fecha_hora: nowIso_(),
    evento: evento,
    usuario: user && user.usuario ? user.usuario : '',
    rol: user && user.rol ? user.rol : '',
    participant_id: participantId || '',
    recording_id: recordingId || '',
    prompt_id: promptId || '',
    modulo: modulo || '',
    detalle: typeof detalle === 'string' ? detalle : JSON.stringify(detalle || {}),
    device_info: deviceInfo || '',
    app_version: getAppVersion()
  };
  appendObject_(UNC.SHEETS.LOG, row);
  return row;
}
