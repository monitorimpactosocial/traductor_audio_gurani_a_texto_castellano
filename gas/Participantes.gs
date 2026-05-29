function saveParticipant(payload, session) {
  var user = requireRole_(session, ['admin', 'supervisor', 'linguista', 'cargador']);
  var participant = payload || {};
  if (!participant.participant_id) throw new Error('participant_id requerido');
  if (!truthy_(participant.consent_accepted)) throw new Error('Consentimiento requerido');
  var row = {
    participant_id: participant.participant_id,
    alias: participant.alias || '',
    rango_edad: participant.rango_edad || '',
    departamento: participant.departamento || '',
    distrito: participant.distrito || '',
    comunidad: participant.comunidad || '',
    lengua_materna: participant.lengua_materna || '',
    nivel_guarani: participant.nivel_guarani || '',
    variante_guarani: participant.variante_guarani || '',
    otros_idiomas: participant.otros_idiomas || '',
    consent_version: participant.consent_version || '',
    consent_accepted: true,
    created_at: participant.created_at || nowIso_(),
    app_version: participant.app_version || getAppVersion()
  };
  upsertObject_(UNC.SHEETS.PARTICIPANTES, 'participant_id', row);
  appendLog_('creacion de perfil', user, row.participant_id, '', '', 'participantes', 'perfil guardado');
  return row;
}
