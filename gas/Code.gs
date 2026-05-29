function doGet(e) {
  try {
    var action = e && e.parameter && e.parameter.action ? e.parameter.action : 'health';
    if (action === 'getPrompts') return jsonResponse_(getPrompts({ status: 'ACTIVO' }, null));
    return jsonResponse_({
      ok: true,
      app: UNC.APP_NAME,
      version: getAppVersion(),
      timestamp: nowIso_()
    });
  } catch (error) {
    appendError_('api', 'doGet', error, 'No se pudo procesar la solicitud.');
    return jsonResponse_({ ok: false, error: error.message });
  }
}

function doPost(e) {
  var request;
  try {
    request = parseRequest_(e);
    var action = request.action;
    var payload = request.payload || {};
    var session = request.session || {};

    if (action === 'login') return jsonResponse_(login(payload));
    if (action === 'getPrompts') return jsonResponse_(getPrompts(payload, session));
    if (action === 'syncRecording') return jsonResponse_(syncRecording(payload, session));
    if (action === 'reviewRecording') return jsonResponse_(reviewRecording(payload, session));
    if (action === 'createPrompt') return jsonResponse_(createPrompt(payload, session));
    if (action === 'exportData') return jsonResponse_(exportData(payload, session));

    throw new Error('Accion no soportada: ' + action);
  } catch (error) {
    appendError_('api', 'doPost', error, 'No se pudo procesar la solicitud.', request && request.session);
    return jsonResponse_({ ok: false, error: error.message });
  }
}
