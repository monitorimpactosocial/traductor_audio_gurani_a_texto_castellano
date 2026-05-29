function getPrompts(payload, session) {
  var rows = readObjects_(UNC.SHEETS.PROMPTS);
  var status = payload && payload.status ? String(payload.status) : '';
  if (status) {
    rows = rows.filter(function (item) {
      return String(item.status).toUpperCase() === status.toUpperCase();
    });
  }
  return { ok: true, prompts: rows };
}

function createPrompt(payload, session) {
  var user = requireRole_(session, ['admin', 'supervisor', 'linguista']);
  var prompt = payload || {};
  if (!prompt.text_guarani) throw new Error('text_guarani requerido');
  var text = String(prompt.text_guarani).trim();
  var row = {
    prompt_id: prompt.prompt_id || makeId_('GN'),
    text_guarani: text,
    text_guarani_normalized: prompt.text_guarani_normalized || text.replace(/\s+/g, ' '),
    text_spanish: prompt.text_spanish || '',
    source: prompt.source || user.usuario,
    topic: prompt.topic || 'general',
    difficulty_level: prompt.difficulty_level || 'basico',
    token_count: prompt.token_count || text.split(/\s+/).filter(Boolean).length,
    character_count: prompt.character_count || text.length,
    status: prompt.status || 'ACTIVO',
    version: prompt.version || '1',
    created_at: prompt.created_at || nowIso_(),
    updated_at: nowIso_()
  };
  upsertObject_(UNC.SHEETS.PROMPTS, 'prompt_id', row);
  appendLog_('cambio de configuracion', user, '', '', row.prompt_id, 'prompts', 'prompt guardado');
  return { ok: true, prompt: row };
}
