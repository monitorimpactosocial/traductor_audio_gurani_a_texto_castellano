function appendError_(modulo, funcion, error, mensajeUsuario, session) {
  var row = {
    fecha_hora: nowIso_(),
    modulo: modulo || '',
    funcion: funcion || '',
    tipo_error: error && error.name ? error.name : 'Error',
    mensaje_tecnico: error && error.message ? error.message : String(error),
    mensaje_usuario: mensajeUsuario || 'Ocurrio un error.',
    usuario: session && session.usuario ? session.usuario : '',
    device_info: '',
    app_version: getAppVersion()
  };
  try {
    appendObject_(UNC.SHEETS.ERRORES, row);
  } catch (ignored) {
    Logger.log(row);
  }
  return row;
}
