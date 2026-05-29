function passwordHash_(password, salt) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + ':' + password,
    Utilities.Charset.UTF_8
  );
  return toHex_(bytes);
}

function makePasswordHash_(password) {
  var salt = Utilities.getUuid().replace(/-/g, '');
  return 'sha256$' + salt + '$' + passwordHash_(password, salt);
}

function verifyPassword_(password, storedHash) {
  var parts = String(storedHash || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'sha256') return false;
  return passwordHash_(password, parts[1]) === parts[2];
}

function bootstrapAdmin(usuario, password, nombre, correo) {
  if (!usuario || !password) throw new Error('Usuario y password son requeridos');
  var existing = readObjects_(UNC.SHEETS.USUARIOS).filter(function (item) {
    return String(item.usuario) === String(usuario);
  })[0];
  if (existing) throw new Error('El usuario ya existe');
  appendObject_(UNC.SHEETS.USUARIOS, {
    usuario: usuario,
    password_hash: makePasswordHash_(password),
    nombre: nombre || usuario,
    correo: correo || '',
    rol: 'admin',
    activo: true,
    fecha_creacion: nowIso_(),
    ultimo_acceso: '',
    observacion: 'Usuario inicial creado por bootstrapAdmin'
  });
  appendLog_('cambio de configuracion', { usuario: usuario, rol: 'admin' }, '', '', '', 'usuarios', 'bootstrap admin');
  return { ok: true, usuario: usuario };
}

function login(payload) {
  var usuario = String(payload.usuario || '').trim();
  var password = String(payload.password || '');
  var user = readObjects_(UNC.SHEETS.USUARIOS).filter(function (item) {
    return String(item.usuario) === usuario;
  })[0];
  if (!user || !truthy_(user.activo) || !verifyPassword_(password, user.password_hash)) {
    appendLog_('login fallido', { usuario: usuario, rol: '' }, '', '', '', 'login', 'credenciales invalidas');
    return { ok: false, error: 'Usuario o contrasena incorrectos' };
  }
  user.ultimo_acceso = nowIso_();
  upsertObject_(UNC.SHEETS.USUARIOS, 'usuario', user);
  appendLog_('login exitoso', user, '', '', '', 'login', 'login correcto');
  return {
    ok: true,
    user: {
      usuario: user.usuario,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
      token: Utilities.getUuid(),
      login_at: nowIso_()
    }
  };
}

function getUserBySession_(session) {
  if (!session || !session.usuario) throw new Error('Sesion requerida');
  var user = readObjects_(UNC.SHEETS.USUARIOS).filter(function (item) {
    return String(item.usuario) === String(session.usuario);
  })[0];
  if (!user || !truthy_(user.activo)) throw new Error('Usuario inactivo o inexistente');
  return user;
}

function requireRole_(session, allowedRoles) {
  var user = getUserBySession_(session);
  if (allowedRoles.indexOf(String(user.rol)) < 0) {
    throw new Error('Permiso insuficiente para rol ' + user.rol);
  }
  return user;
}

function hasPermission_(user, permission) {
  return (UNC.PERMISSIONS[user.rol] || []).indexOf(permission) >= 0 || user.rol === 'admin';
}
