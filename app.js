"use strict";

const CONFIG = window.UNC_CONFIG || {};
const DB_NAME = "unc_traductor_guarani";
const DB_VERSION = 1;

const state = {
  db: null,
  session: null,
  prompts: [],
  participants: [],
  recordings: [],
  logs: [],
  errors: [],
  feedback: [],
  currentParticipant: null,
  currentPrompt: null,
  mediaRecorder: null,
  mediaStream: null,
  audioChunks: [],
  audioBlob: null,
  recordingStartedAt: null,
  recordingTimerId: null,
  recordedDurationMs: 0,
  attemptNumber: 1,
  audioMonitor: null,
  lastTranslationRequest: null
};

const stores = ["prompts", "participants", "recordings", "logs", "errors", "feedback"];

function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function nowIso() {
  return new Date().toISOString();
}

function todayStamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function uuid(prefix = "id") {
  const value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${value}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMessage(selector, message, isError = false) {
  const el = $(selector);
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("error", Boolean(isError));
}

function hasPermission(permission) {
  if (!state.session) return false;
  const role = state.session.rol;
  return (CONFIG.permissions?.[role] || []).includes(permission) || role === "admin";
}

function getDeviceInfo() {
  return {
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    online: navigator.onLine,
    viewport: `${window.innerWidth}x${window.innerHeight}`
  };
}

function getBrowserName() {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Otro";
}

function getDeviceType() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "movil" : "desktop";
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("prompts")) db.createObjectStore("prompts", { keyPath: "prompt_id" });
      if (!db.objectStoreNames.contains("participants")) db.createObjectStore("participants", { keyPath: "participant_id" });
      if (!db.objectStoreNames.contains("recordings")) db.createObjectStore("recordings", { keyPath: "recording_id" });
      if (!db.objectStoreNames.contains("logs")) db.createObjectStore("logs", { keyPath: "log_id" });
      if (!db.objectStoreNames.contains("errors")) db.createObjectStore("errors", { keyPath: "error_id" });
      if (!db.objectStoreNames.contains("feedback")) db.createObjectStore("feedback", { keyPath: "feedback_id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbStore(storeName, mode = "readonly") {
  return state.db.transaction(storeName, mode).objectStore(storeName);
}

function idbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const request = idbStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function idbPut(storeName, value) {
  return new Promise((resolve, reject) => {
    const request = idbStore(storeName, "readwrite").put(value);
    request.onsuccess = () => resolve(value);
    request.onerror = () => reject(request.error);
  });
}

function idbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = idbStore(storeName, "readwrite").delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function refreshLocalState() {
  const [prompts, participants, recordings, logs, errors, feedback] = await Promise.all(stores.map(idbGetAll));
  state.prompts = prompts;
  state.participants = participants;
  state.recordings = recordings.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  state.logs = logs.sort((a, b) => String(b.fecha_hora).localeCompare(String(a.fecha_hora)));
  state.errors = errors.sort((a, b) => String(b.fecha_hora).localeCompare(String(a.fecha_hora)));
  state.feedback = feedback;
}

async function logEvent(evento, modulo, detalle = {}, extra = {}) {
  const item = {
    log_id: uuid("log"),
    fecha_hora: nowIso(),
    evento,
    usuario: state.session?.usuario || "",
    rol: state.session?.rol || "",
    participant_id: extra.participant_id || state.currentParticipant?.participant_id || "",
    recording_id: extra.recording_id || "",
    prompt_id: extra.prompt_id || state.currentPrompt?.prompt_id || "",
    modulo,
    detalle: typeof detalle === "string" ? detalle : JSON.stringify(detalle),
    device_info: JSON.stringify(getDeviceInfo()),
    app_version: CONFIG.appVersion
  };
  await idbPut("logs", item);
  state.logs.unshift(item);
}

async function logError(modulo, funcion, error, userMessage) {
  const item = {
    error_id: uuid("err"),
    fecha_hora: nowIso(),
    modulo,
    funcion,
    tipo_error: error?.name || "Error",
    mensaje_tecnico: error?.message || String(error),
    mensaje_usuario: userMessage,
    usuario: state.session?.usuario || "",
    device_info: JSON.stringify(getDeviceInfo()),
    app_version: CONFIG.appVersion
  };
  await idbPut("errors", item);
  state.errors.unshift(item);
  return item;
}

async function apiCall(action, payload = {}) {
  if (CONFIG.backendMode === "gas" && CONFIG.gasWebAppUrl) {
    const response = await fetch(CONFIG.gasWebAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload, session: state.session })
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Error de backend GAS");
    return data;
  }

  if (CONFIG.backendMode === "unc-api" && CONFIG.uncApiBaseUrl) {
    const response = await fetch(`${CONFIG.uncApiBaseUrl.replace(/\/$/, "")}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: state.session?.token ? `Bearer ${state.session.token}` : ""
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error de API UNC");
    return data;
  }

  return { ok: true, demo: true };
}

async function loadPrompts() {
  try {
    if (CONFIG.backendMode !== "demo") {
      const remote = await apiCall("getPrompts", {});
      if (remote.prompts?.length) {
        await Promise.all(remote.prompts.map((prompt) => idbPut("prompts", normalizePrompt(prompt))));
      }
    }

    await refreshLocalState();
    if (!state.prompts.length) {
      const response = await fetch("data/prompts.sample.json", { cache: "no-cache" });
      const prompts = await response.json();
      await Promise.all(prompts.map((prompt) => idbPut("prompts", normalizePrompt(prompt))));
      await refreshLocalState();
    }
  } catch (error) {
    await logError("prompts", "loadPrompts", error, "No se pudieron cargar los textos. Se usara cache local si existe.");
  }
}

function normalizePrompt(prompt) {
  const text = prompt.text_guarani || prompt.text || "";
  return {
    prompt_id: prompt.prompt_id || prompt.id || uuid("prompt"),
    text_guarani: text,
    text_guarani_normalized: prompt.text_guarani_normalized || normalizeText(text),
    text_spanish: prompt.text_spanish || "",
    source: prompt.source || "demo",
    topic: prompt.topic || "general",
    difficulty_level: prompt.difficulty_level || "basico",
    token_count: Number(prompt.token_count || countTokens(text)),
    character_count: Number(prompt.character_count || text.length),
    status: prompt.status || "ACTIVO",
    version: prompt.version || "1",
    active_learning_priority: Number(prompt.active_learning_priority || 1),
    created_at: prompt.created_at || nowIso(),
    updated_at: prompt.updated_at || nowIso()
  };
}

function normalizeText(text) {
  return String(text || "").trim().replace(/\s+/g, " ");
}

function countTokens(text) {
  return normalizeText(text).split(" ").filter(Boolean).length;
}

function pickNextPrompt() {
  const active = state.prompts.filter((prompt) => ["ACTIVO", "ACTIVE", "activo"].includes(String(prompt.status)));
  if (!active.length) {
    state.currentPrompt = null;
    $("#promptText").textContent = "No hay textos activos.";
    return;
  }

  const counts = new Map();
  state.recordings.forEach((recording) => counts.set(recording.prompt_id, (counts.get(recording.prompt_id) || 0) + 1));
  const scored = active.map((prompt) => ({
    prompt,
    count: counts.get(prompt.prompt_id) || 0,
    priority: Number(prompt.active_learning_priority || 1),
    tie: Math.random()
  }));
  scored.sort((a, b) => a.count - b.count || b.priority - a.priority || a.tie - b.tie);
  state.currentPrompt = scored[0].prompt;
  renderCurrentPrompt();
}

function renderCurrentPrompt() {
  const prompt = state.currentPrompt;
  $("#promptText").textContent = prompt?.text_guarani || "No hay texto seleccionado.";
  $("#promptIdLabel").textContent = `prompt_id: ${prompt?.prompt_id || "-"}`;
  $("#promptTopicLabel").textContent = `tema: ${prompt?.topic || "-"}`;
  $("#promptDifficultyLabel").textContent = `nivel: ${prompt?.difficulty_level || "-"}`;
  $("#promptSpanish").textContent = prompt?.text_spanish || "Sin traduccion disponible.";
  $("#promptSource").textContent = prompt?.source ? `Fuente: ${prompt.source}` : "";
}

function restoreSession() {
  try {
    const raw = localStorage.getItem("unc_session");
    state.session = raw ? JSON.parse(raw) : null;
  } catch {
    state.session = null;
  }
}

function persistSession() {
  if (state.session) localStorage.setItem("unc_session", JSON.stringify(state.session));
  else localStorage.removeItem("unc_session");
}

async function handleLogin(event) {
  event.preventDefault();
  const usuario = $("#loginUser").value.trim();
  const password = $("#loginPassword").value;
  setMessage("#loginMessage", "Validando...");

  try {
    let user;
    if (CONFIG.backendMode === "demo") {
      user = CONFIG.demoUsers.find((item) => item.usuario === usuario && item.password === password && item.activo);
      if (!user) throw new Error("Usuario o contrasena incorrectos");
      state.session = {
        usuario: user.usuario,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol,
        token: uuid("demo_session"),
        login_at: nowIso()
      };
    } else {
      const result = await apiCall("login", { usuario, password });
      state.session = result.user;
    }

    persistSession();
    await logEvent("login exitoso", "login", { usuario });
    await bootAuthenticatedApp();
  } catch (error) {
    await logError("login", "handleLogin", error, "No se pudo iniciar sesion.");
    await logEvent("login fallido", "login", { usuario });
    setMessage("#loginMessage", "Usuario o contrasena incorrectos.", true);
  }
}

async function bootAuthenticatedApp() {
  $("#loginView").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
  $("#currentUserLabel").textContent = `${state.session.nombre || state.session.usuario} · ${state.session.rol}`;
  $("#homeUser").textContent = state.session.nombre || state.session.usuario;
  $("#homeRole").textContent = state.session.rol;
  $("#appVersionLabel").textContent = CONFIG.appVersion;
  $("#consentVersionLabel").textContent = CONFIG.consentVersion;
  $("#backendModeLabel").textContent = CONFIG.backendMode === "demo" ? "Demo local" : CONFIG.backendMode;
  applyRoleVisibility();
  await loadPrompts();
  await refreshLocalState();
  restoreCurrentParticipant();
  setupQualityFilter();
  pickNextPrompt();
  renderAll();
}

function applyRoleVisibility() {
  $$("[data-permission]").forEach((el) => {
    el.classList.toggle("hidden", !hasPermission(el.dataset.permission));
  });
}

function setupTabs() {
  $$(".tab").forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.tab));
  });
  $$("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.jump));
  });
}

function showTab(tabName) {
  const targetButton = $(`.tab[data-tab="${tabName}"]`);
  if (!targetButton || targetButton.classList.contains("hidden")) return;
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${tabName}`));
  if (tabName === "registros") renderRecords();
  if (tabName === "dashboard") renderDashboard();
  if (tabName === "admin") renderAdminPrompts();
  if (tabName === "sync") renderSync();
}

function updateOnlineBadge() {
  const online = navigator.onLine;
  const badge = $("#onlineBadge");
  badge.textContent = online ? "Online" : "Offline";
  badge.className = online ? "badge info" : "badge warning";
}

function restoreCurrentParticipant() {
  const participantId = localStorage.getItem("unc_current_participant_id");
  state.currentParticipant = state.participants.find((item) => item.participant_id === participantId) || state.participants[0] || null;
  if (state.currentParticipant) {
    $("#participantIdBadge").textContent = state.currentParticipant.participant_id;
    $("#consentStatusBadge").textContent = state.currentParticipant.consent_accepted ? "Aceptado" : "Pendiente";
    $("#consentStatusBadge").className = state.currentParticipant.consent_accepted ? "badge" : "badge warning";
  }
}

async function handleConsent(event) {
  event.preventDefault();
  const accepted = $("#consentAccepted").checked;
  if (!accepted) {
    setMessage("#consentMessage", "Debe aceptar el consentimiento antes de grabar.", true);
    return;
  }

  const participant = {
    participant_id: state.currentParticipant?.participant_id || `P_${todayStamp()}_${Math.random().toString(16).slice(2, 8)}`,
    alias: $("#anonymousMode").checked ? "" : $("#consentAlias").value.trim(),
    consent_version: CONFIG.consentVersion,
    consent_accepted: true,
    consent_accepted_at: nowIso(),
    app_version: CONFIG.appVersion,
    device_type: getDeviceType(),
    browser: getBrowserName(),
    created_at: state.currentParticipant?.created_at || nowIso()
  };

  state.currentParticipant = { ...(state.currentParticipant || {}), ...participant };
  await idbPut("participants", state.currentParticipant);
  localStorage.setItem("unc_current_participant_id", state.currentParticipant.participant_id);
  await logEvent("consentimiento aceptado", "consentimiento", { version: CONFIG.consentVersion }, { participant_id: participant.participant_id });
  await refreshLocalState();
  restoreCurrentParticipant();
  renderAll();
  setMessage("#consentMessage", `Consentimiento registrado para ${participant.participant_id}.`);
}

async function handleProfile(event) {
  event.preventDefault();
  if (!state.currentParticipant?.consent_accepted) {
    setMessage("#profileMessage", "Primero registre el consentimiento informado.", true);
    showTab("consentimiento");
    return;
  }

  const participant = {
    ...state.currentParticipant,
    rango_edad: $("#ageRange").value,
    departamento: $("#department").value.trim(),
    distrito: $("#district").value.trim(),
    comunidad: $("#community").value.trim(),
    lengua_materna: $("#nativeLanguage").value,
    nivel_guarani: $("#guaraniLevel").value,
    variante_guarani: $("#guaraniVariant").value.trim(),
    otros_idiomas: $("#otherLanguages").value.trim(),
    app_version: CONFIG.appVersion,
    updated_at: nowIso()
  };

  await idbPut("participants", participant);
  state.currentParticipant = participant;
  await logEvent("creacion de perfil", "perfil", { participant_id: participant.participant_id });
  await refreshLocalState();
  renderAll();
  setMessage("#profileMessage", "Perfil guardado.");
}

function pickSupportedMimeType() {
  if (!window.MediaRecorder) return "";
  return (CONFIG.preferredMimeTypes || []).find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

async function startRecording() {
  if (!state.currentParticipant?.consent_accepted) {
    setMessage("#recordMessage", "Registre consentimiento y perfil antes de grabar.", true);
    showTab("consentimiento");
    return;
  }
  if (!state.currentPrompt) {
    setMessage("#recordMessage", "No hay texto activo para grabar.", true);
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setMessage("#recordMessage", "Este navegador no soporta grabacion con MediaRecorder.", true);
    return;
  }

  try {
    state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickSupportedMimeType();
    state.mediaRecorder = new MediaRecorder(state.mediaStream, mimeType ? { mimeType } : undefined);
    state.audioChunks = [];
    state.audioBlob = null;
    state.recordedDurationMs = 0;
    state.recordingStartedAt = performance.now();
    startAudioMonitor(state.mediaStream);

    state.mediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) state.audioChunks.push(event.data);
    };
    state.mediaRecorder.onstop = onRecordingStopped;
    state.mediaRecorder.start(250);
    startTimer();
    setRecordingUi("GRABANDO");
    await logEvent("inicio de grabacion", "grabacion", { mime_type: state.mediaRecorder.mimeType });
  } catch (error) {
    await logError("grabacion", "startRecording", error, "No se pudo acceder al microfono.");
    setMessage("#recordMessage", "No se pudo acceder al microfono. Revise permisos del navegador.", true);
  }
}

function startTimer() {
  clearInterval(state.recordingTimerId);
  state.recordingTimerId = setInterval(() => {
    if (!state.recordingStartedAt) return;
    const elapsed = Math.max(0, performance.now() - state.recordingStartedAt);
    $("#recordTimer").textContent = formatDuration(elapsed);
    if (elapsed > CONFIG.maxDurationMs) stopRecording();
  }, 250);
}

function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function setRecordingUi(status) {
  $("#recordState").textContent = status;
  $("#recordState").className = status === "ERROR" ? "badge danger" : status === "GRABANDO" ? "badge info" : "badge";
  $("#startRecordBtn").disabled = status === "GRABANDO";
  $("#pauseRecordBtn").disabled = status !== "GRABANDO";
  $("#stopRecordBtn").disabled = status !== "GRABANDO" && status !== "PAUSADO";
  $("#discardRecordBtn").disabled = !state.audioBlob && status !== "GRABANDO" && status !== "PAUSADO";
}

function pauseRecording() {
  if (!state.mediaRecorder) return;
  if (state.mediaRecorder.state === "recording") {
    state.mediaRecorder.pause();
    setRecordingUi("PAUSADO");
  } else if (state.mediaRecorder.state === "paused") {
    state.mediaRecorder.resume();
    setRecordingUi("GRABANDO");
  }
}

function stopRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
    state.mediaRecorder.stop();
  }
}

async function onRecordingStopped() {
  clearInterval(state.recordingTimerId);
  state.recordedDurationMs = Math.max(0, performance.now() - state.recordingStartedAt);
  stopAudioMonitor();
  stopMediaStream();
  const type = state.audioChunks[0]?.type || state.mediaRecorder?.mimeType || "audio/webm";
  state.audioBlob = new Blob(state.audioChunks, { type });
  const audioUrl = URL.createObjectURL(state.audioBlob);
  $("#audioPlayback").src = audioUrl;
  $("#audioPlayback").classList.remove("hidden");
  $("#saveLocalBtn").disabled = false;
  $("#discardRecordBtn").disabled = false;
  setRecordingUi("REVISANDO");
  renderQualityHint();
}

function stopMediaStream() {
  state.mediaStream?.getTracks().forEach((track) => track.stop());
  state.mediaStream = null;
}

function discardRecording() {
  state.audioBlob = null;
  state.audioChunks = [];
  state.recordedDurationMs = 0;
  $("#audioPlayback").removeAttribute("src");
  $("#audioPlayback").classList.add("hidden");
  $("#saveLocalBtn").disabled = true;
  $("#discardRecordBtn").disabled = true;
  $("#recordTimer").textContent = "00:00";
  $("#recordQualityHint").textContent = "Duracion valida: 1.2 a 90 segundos.";
  setRecordingUi("LISTO");
  logEvent("grabacion descartada", "grabacion", {});
}

function startAudioMonitor(stream) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const samples = [];
    const interval = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const value of data) {
        const centered = (value - 128) / 128;
        sum += centered * centered;
      }
      samples.push(Math.sqrt(sum / data.length));
    }, 250);
    state.audioMonitor = { context, analyser, samples, interval };
  } catch {
    state.audioMonitor = null;
  }
}

function stopAudioMonitor() {
  const monitor = state.audioMonitor;
  if (!monitor) return;
  clearInterval(monitor.interval);
  monitor.context.close();
}

function getPeakVolume() {
  const samples = state.audioMonitor?.samples || [];
  if (!samples.length) return null;
  return Number(Math.max(...samples).toFixed(4));
}

function renderQualityHint() {
  const duration = state.recordedDurationMs;
  const size = state.audioBlob?.size || 0;
  const issues = [];
  if (duration < CONFIG.minDurationMs) issues.push("demasiado corta");
  if (duration > CONFIG.maxDurationMs) issues.push("demasiado larga");
  if (size < 800) issues.push("archivo casi vacio");
  if (size > CONFIG.maxAudioBytes) issues.push("archivo demasiado grande");
  const text = issues.length ? `Observacion automatica: ${issues.join(", ")}.` : "Grabacion lista para guardar.";
  $("#recordQualityHint").textContent = `${text} Duracion ${formatDuration(duration)}, tamano ${Math.round(size / 1024)} KB.`;
}

function automaticQualityStatus(durationMs, sizeBytes) {
  if (durationMs < CONFIG.minDurationMs || durationMs > CONFIG.maxDurationMs || sizeBytes < 800 || sizeBytes > CONFIG.maxAudioBytes) {
    return "OBSERVADO";
  }
  return "PENDIENTE_REVISION";
}

async function sha256Blob(blob) {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function saveRecordingLocally() {
  if (!state.audioBlob || !state.currentPrompt || !state.currentParticipant) return;

  try {
    const timestamp = todayStamp();
    const participantId = state.currentParticipant.participant_id;
    const promptId = state.currentPrompt.prompt_id;
    const attempt = getNextAttemptNumber(participantId, promptId);
    const extension = state.audioBlob.type.includes("ogg") ? "ogg" : "webm";
    const filename = `${participantId}_${promptId}_${attempt}_${timestamp}.${extension}`.replace(/[^A-Za-z0-9_.-]/g, "_");
    const hash = await sha256Blob(state.audioBlob);
    const recording = {
      recording_id: uuid("rec"),
      participant_id: participantId,
      prompt_id: promptId,
      prompt_text: state.currentPrompt.text_guarani,
      attempt_number: attempt,
      audio_file_id: "",
      audio_url: "",
      audio_filename: filename,
      audio_mime_type: state.audioBlob.type || "audio/webm",
      audio_duration_ms: Math.round(state.recordedDurationMs),
      audio_size_bytes: state.audioBlob.size,
      audio_blob: state.audioBlob,
      hash_audio: hash,
      approx_volume_peak: getPeakVolume(),
      created_at: nowIso(),
      created_by: state.session.usuario,
      origin: navigator.onLine ? "online" : "offline",
      sync_status: "PENDIENTE",
      quality_status: automaticQualityStatus(state.recordedDurationMs, state.audioBlob.size),
      review_status: "PENDIENTE_REVISION_HUMANA",
      corpus_state: "RECIBIDO",
      reviewer_user: "",
      reviewed_at: "",
      review_notes: $("#fieldNotes").value.trim(),
      app_version: CONFIG.appVersion,
      device_type: getDeviceType(),
      browser: getBrowserName()
    };

    await idbPut("recordings", recording);
    await logEvent("grabacion guardada", "grabacion", { filename }, { recording_id: recording.recording_id, prompt_id: promptId });
    await refreshLocalState();
    discardRecording();
    $("#fieldNotes").value = "";
    pickNextPrompt();
    renderAll();
    setMessage("#recordMessage", "Grabacion guardada localmente. Puede sincronizarse cuando haya conexion.");
  } catch (error) {
    await logError("grabacion", "saveRecordingLocally", error, "No se pudo guardar la grabacion local.");
    setMessage("#recordMessage", "No se pudo guardar la grabacion local.", true);
  }
}

function getNextAttemptNumber(participantId, promptId) {
  const attempts = state.recordings
    .filter((item) => item.participant_id === participantId && item.prompt_id === promptId)
    .map((item) => Number(item.attempt_number || 0));
  return (Math.max(0, ...attempts) || 0) + 1;
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function syncPending() {
  await refreshLocalState();
  const pending = state.recordings.filter((item) => item.sync_status === "PENDIENTE" || item.sync_status === "ERROR_SYNC");
  $("#syncLastAttempt").textContent = new Date().toLocaleString();
  if (!pending.length) {
    appendSyncLog("No hay registros pendientes.");
    return;
  }

  if (!navigator.onLine && CONFIG.backendMode !== "demo") {
    appendSyncLog("Sin conexion. Se mantienen los datos locales.");
    return;
  }

  for (const recording of pending) {
    try {
      appendSyncLog(`Sincronizando ${recording.audio_filename}...`);
      let remote = { ok: true, demo: true };
      if (CONFIG.backendMode === "demo") {
        remote = { ok: true, recording_id: recording.recording_id, audio_url: "", audio_file_id: "" };
      } else {
        const audio_base64 = await blobToBase64(recording.audio_blob);
        remote = await apiCall("syncRecording", {
          recording: { ...recording, audio_blob: undefined },
          participant: state.participants.find((item) => item.participant_id === recording.participant_id),
          prompt: state.prompts.find((item) => item.prompt_id === recording.prompt_id),
          audio_base64
        });
      }

      const updated = {
        ...recording,
        sync_status: CONFIG.backendMode === "demo" ? "LOCAL_DEMO" : "SINCRONIZADO",
        audio_file_id: remote.audio_file_id || recording.audio_file_id,
        audio_url: remote.audio_url || recording.audio_url,
        synced_at: nowIso()
      };
      await idbPut("recordings", updated);
      await logEvent("sincronizacion exitosa", "sync", { recording_id: recording.recording_id }, { recording_id: recording.recording_id });
      appendSyncLog(`OK: ${recording.audio_filename}`);
    } catch (error) {
      const updated = { ...recording, sync_status: "ERROR_SYNC", sync_error: error.message, sync_error_at: nowIso() };
      await idbPut("recordings", updated);
      await logError("sync", "syncPending", error, "No se pudo sincronizar una grabacion.");
      await logEvent("error de sincronizacion", "sync", { recording_id: recording.recording_id, error: error.message }, { recording_id: recording.recording_id });
      appendSyncLog(`Error: ${recording.audio_filename}`);
    }
  }
  localStorage.setItem("unc_last_sync_at", nowIso());
  await refreshLocalState();
  renderAll();
}

function appendSyncLog(message) {
  const box = $("#syncLog");
  if (!box) return;
  const row = document.createElement("div");
  row.textContent = `${new Date().toLocaleTimeString()} · ${message}`;
  box.prepend(row);
}

function setupQualityFilter() {
  const select = $("#filterQuality");
  if (!select || select.options.length > 1) return;
  (CONFIG.qualityStatuses || []).forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    select.appendChild(option);
  });
}

function renderAll() {
  renderHome();
  renderRecords();
  renderDashboard();
  renderSync();
  renderAdminPrompts();
}

function renderHome() {
  const pending = state.recordings.filter((item) => item.sync_status === "PENDIENTE" || item.sync_status === "ERROR_SYNC").length;
  $("#kpiRecordings").textContent = state.recordings.length;
  $("#kpiPending").textContent = pending;
  $("#kpiParticipants").textContent = state.participants.length;
  $("#kpiPrompts").textContent = state.prompts.filter((item) => String(item.status).toUpperCase() === "ACTIVO").length;
  $("#lastSyncAt").textContent = localStorage.getItem("unc_last_sync_at") || "Sin sincronizar";
  $("#participantIdBadge").textContent = state.currentParticipant?.participant_id || "Sin perfil";
}

function filteredRecordings() {
  const quality = $("#filterQuality")?.value || "";
  const sync = $("#filterSync")?.value || "";
  const search = ($("#filterSearch")?.value || "").toLowerCase();
  return state.recordings.filter((item) => {
    if (quality && item.quality_status !== quality) return false;
    if (sync && item.sync_status !== sync) return false;
    if (search && !`${item.prompt_text} ${item.prompt_id} ${item.participant_id}`.toLowerCase().includes(search)) return false;
    if (state.session?.rol === "cargador" && item.created_by && item.created_by !== state.session.usuario) return false;
    return true;
  });
}

function renderRecords() {
  const target = $("#recordsTable");
  if (!target) return;
  const rows = filteredRecordings();
  if (!rows.length) {
    target.innerHTML = "<p class=\"hint\">No hay registros para mostrar.</p>";
    return;
  }
  const canReview = hasPermission("review");
  target.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Participante</th>
          <th>Prompt</th>
          <th>Audio</th>
          <th>Sync</th>
          <th>Calidad</th>
          <th>Revision</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((item) => renderRecordingRow(item, canReview)).join("")}
      </tbody>
    </table>
  `;
  target.querySelectorAll("[data-review-status]").forEach((select) => {
    select.addEventListener("change", () => updateRecordingReview(select.dataset.recordingId, select.value));
  });
}

function renderRecordingRow(item, canReview) {
  const audioUrl = item.audio_url || (item.audio_blob ? URL.createObjectURL(item.audio_blob) : "");
  const qualityControl = canReview
    ? `<select data-review-status data-recording-id="${escapeHtml(item.recording_id)}">${(CONFIG.qualityStatuses || []).map((status) => `<option ${status === item.quality_status ? "selected" : ""}>${status}</option>`).join("")}</select>`
    : `<span class="badge">${escapeHtml(item.quality_status)}</span>`;
  return `
    <tr>
      <td>${escapeHtml(new Date(item.created_at).toLocaleString())}</td>
      <td>${escapeHtml(item.participant_id)}</td>
      <td><strong>${escapeHtml(item.prompt_id)}</strong><br>${escapeHtml(item.prompt_text || "").slice(0, 90)}</td>
      <td>${audioUrl ? `<audio controls src="${audioUrl}"></audio>` : escapeHtml(item.audio_filename)}</td>
      <td><span class="badge ${item.sync_status === "ERROR_SYNC" ? "danger" : item.sync_status === "PENDIENTE" ? "warning" : ""}">${escapeHtml(item.sync_status)}</span></td>
      <td>${qualityControl}</td>
      <td>${escapeHtml(item.review_notes || "")}</td>
    </tr>
  `;
}

async function updateRecordingReview(recordingId, qualityStatus) {
  const recording = state.recordings.find((item) => item.recording_id === recordingId);
  if (!recording || !hasPermission("review")) return;
  const updated = {
    ...recording,
    quality_status: qualityStatus,
    reviewer_user: state.session.usuario,
    reviewed_at: nowIso(),
    review_status: qualityStatus === "APROBADO" ? "VALIDADO" : qualityStatus === "RECHAZADO" ? "RECHAZADO" : "PENDIENTE_REVISION_HUMANA",
    corpus_state: qualityStatus === "APROBADO" ? "VALIDADO" : qualityStatus === "RECHAZADO" ? "RECHAZADO" : recording.corpus_state
  };
  await idbPut("recordings", updated);
  await logEvent("revision de audio", "registros", { qualityStatus }, { recording_id: recordingId, prompt_id: recording.prompt_id });
  await logEvent("cambio de estado", "registros", { from: recording.quality_status, to: qualityStatus }, { recording_id: recordingId });
  await refreshLocalState();
  renderAll();
}

function renderDashboard() {
  const activePrompts = state.prompts.filter((item) => String(item.status).toUpperCase() === "ACTIVO");
  const covered = new Set(state.recordings.map((item) => item.prompt_id)).size;
  const approved = state.recordings.filter((item) => item.quality_status === "APROBADO").length;
  const pendingReview = state.recordings.filter((item) => item.quality_status === "PENDIENTE_REVISION").length;
  const totalDuration = state.recordings.reduce((sum, item) => sum + Number(item.audio_duration_ms || 0), 0);
  $("#dashCovered").textContent = `${covered}/${activePrompts.length}`;
  $("#dashPendingReview").textContent = pendingReview;
  $("#dashApproved").textContent = approved;
  $("#dashDuration").textContent = `${Math.round(totalDuration / 60000)}m`;
  renderBarChart("#topicChart", groupCounts(state.recordings.map((item) => promptById(item.prompt_id)?.topic || "sin tema")));
  renderBarChart("#qualityChart", groupCounts(state.recordings.map((item) => item.quality_status || "sin estado")));
  const coverage = activePrompts.map((prompt) => ({
    label: `${prompt.prompt_id} · ${prompt.text_guarani.slice(0, 48)}`,
    value: state.recordings.filter((item) => item.prompt_id === prompt.prompt_id).length
  }));
  renderBarChart("#promptCoverageChart", coverage);
}

function groupCounts(values) {
  const map = new Map();
  values.forEach((value) => map.set(value, (map.get(value) || 0) + 1));
  return Array.from(map, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function renderBarChart(selector, rows) {
  const target = $(selector);
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = "<p class=\"hint\">Sin datos suficientes.</p>";
    return;
  }
  const max = Math.max(...rows.map((row) => row.value), 1);
  target.innerHTML = rows.map((row) => `
    <div class="bar-row">
      <span>${escapeHtml(row.label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width: ${(row.value / max) * 100}%"></div></div>
      <strong>${row.value}</strong>
    </div>
  `).join("");
}

function promptById(promptId) {
  return state.prompts.find((prompt) => prompt.prompt_id === promptId);
}

function renderSync() {
  const pending = state.recordings.filter((item) => item.sync_status === "PENDIENTE").length;
  const errors = state.recordings.filter((item) => item.sync_status === "ERROR_SYNC").length + state.errors.length;
  $("#syncPendingCount").textContent = pending;
  $("#syncErrorCount").textContent = errors;
}

function renderAdminPrompts() {
  const target = $("#adminPromptsTable");
  if (!target) return;
  if (!state.prompts.length) {
    target.innerHTML = "<p class=\"hint\">No hay textos cargados.</p>";
    return;
  }
  target.innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Texto</th><th>Tema</th><th>Estado</th><th>Version</th></tr></thead>
      <tbody>
        ${state.prompts.map((prompt) => `
          <tr>
            <td>${escapeHtml(prompt.prompt_id)}</td>
            <td>${escapeHtml(prompt.text_guarani)}</td>
            <td>${escapeHtml(prompt.topic)}</td>
            <td>${escapeHtml(prompt.status)}</td>
            <td>${escapeHtml(prompt.version)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function handlePromptForm(event) {
  event.preventDefault();
  const text = $("#adminPromptText").value.trim();
  if (!text) return;
  const prompt = normalizePrompt({
    prompt_id: `GN_${String(state.prompts.length + 1).padStart(4, "0")}`,
    text_guarani: text,
    text_guarani_normalized: $("#adminPromptNormalized").value.trim() || normalizeText(text),
    text_spanish: $("#adminPromptSpanish").value.trim(),
    source: $("#adminPromptSource").value.trim() || "admin",
    topic: $("#adminPromptTopic").value.trim() || "general",
    difficulty_level: $("#adminPromptDifficulty").value,
    status: "ACTIVO",
    version: "1"
  });
  await idbPut("prompts", prompt);
  await logEvent("cambio de configuracion", "admin", { action: "crear_prompt", prompt_id: prompt.prompt_id });
  event.target.reset();
  await refreshLocalState();
  pickNextPrompt();
  renderAll();
}

async function handleTranslator(event) {
  event.preventDefault();
  const original_text = $("#translationInput").value.trim();
  const direction = $("#translationDirection").value;
  if (!original_text) return;
  setMessage("#translatorMessage", "Consultando...");

  try {
    let response;
    if (CONFIG.backendMode === "unc-api") {
      response = await apiCall("translate", { original_text, direction });
    } else {
      response = {
        request_id: uuid("tr"),
        original_text,
        translated_text: `[demo ${direction}] ${original_text}`,
        direction,
        model_version: "demo-local",
        confidence: null,
        created_at: nowIso()
      };
    }
    state.lastTranslationRequest = response;
    $("#translationOutput").value = response.translated_text || "";
    $("#modelVersionBadge").textContent = `Modelo: ${response.model_version || "no informado"}`;
    setMessage("#translatorMessage", "Traduccion generada. Puede evaluarla o corregirla.");
  } catch (error) {
    await logError("traductor", "handleTranslator", error, "No se pudo consultar el traductor.");
    setMessage("#translatorMessage", "No se pudo consultar el traductor.", true);
  }
}

async function saveTranslationFeedback() {
  if (!state.lastTranslationRequest) {
    setMessage("#translatorMessage", "Primero consulte el traductor.", true);
    return;
  }
  const rating = $("#translationRating").value;
  if (!rating) {
    setMessage("#translatorMessage", "Seleccione una evaluacion.", true);
    return;
  }
  const feedback = {
    feedback_id: uuid("fb"),
    request_id: state.lastTranslationRequest.request_id,
    original_text: state.lastTranslationRequest.original_text,
    generated_translation: state.lastTranslationRequest.translated_text,
    corrected_translation: $("#translationCorrection").value.trim(),
    direction: state.lastTranslationRequest.direction,
    model_version: state.lastTranslationRequest.model_version,
    rating,
    review_status: "PENDIENTE_REVISION_HUMANA",
    corpus_state: "RECIBIDO",
    reviewer_user: state.session.usuario,
    created_at: nowIso(),
    app_version: CONFIG.appVersion
  };
  await idbPut("feedback", feedback);
  await logEvent("correccion de traduccion", "traductor", { feedback_id: feedback.feedback_id, rating });
  await refreshLocalState();
  setMessage("#translatorMessage", "Evaluacion guardada para revision.");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(rows, headers) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");
}

function downloadText(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function exportFile(filename) {
  await refreshLocalState();
  const recordingHeaders = [
    "recording_id", "participant_id", "prompt_id", "attempt_number", "audio_file_id", "audio_url",
    "audio_filename", "audio_mime_type", "audio_duration_ms", "audio_size_bytes", "hash_audio",
    "created_at", "origin", "sync_status", "quality_status", "review_status", "reviewer_user",
    "reviewed_at", "review_notes", "app_version", "device_type", "browser"
  ];
  const promptHeaders = [
    "prompt_id", "text_guarani", "text_guarani_normalized", "text_spanish", "source", "topic",
    "difficulty_level", "token_count", "character_count", "status", "version", "created_at", "updated_at"
  ];

  if (filename === "metadata_recordings.csv") {
    downloadText(filename, buildCsv(state.recordings, recordingHeaders), "text/csv;charset=utf-8");
  } else if (filename === "participants_anonymized.csv") {
    const headers = ["participant_id", "rango_edad", "departamento", "distrito", "comunidad", "lengua_materna", "nivel_guarani", "variante_guarani", "otros_idiomas", "consent_version", "consent_accepted", "created_at", "app_version"];
    downloadText(filename, buildCsv(state.participants, headers), "text/csv;charset=utf-8");
  } else if (filename === "prompts.csv") {
    downloadText(filename, buildCsv(state.prompts, promptHeaders), "text/csv;charset=utf-8");
  } else if (filename === "manifest_asr.jsonl") {
    const lines = state.recordings.map((recording) => JSON.stringify({
      audio_filepath: recording.audio_url || `audio/raw/${recording.audio_filename}`,
      text: recording.prompt_text,
      duration_ms: recording.audio_duration_ms,
      prompt_id: recording.prompt_id,
      participant_id: recording.participant_id,
      quality_status: recording.quality_status,
      device_type: recording.device_type,
      browser: recording.browser
    }));
    downloadText(filename, lines.join("\n"));
  } else if (filename === "parallel_guarani_spanish.csv") {
    const rows = [
      ...state.prompts.filter((prompt) => prompt.text_spanish).map((prompt) => ({
        source_id: prompt.prompt_id,
        text_guarani: prompt.text_guarani,
        text_spanish: prompt.text_spanish,
        status: prompt.status,
        version: prompt.version
      })),
      ...state.feedback.filter((item) => item.corrected_translation).map((item) => ({
        source_id: item.feedback_id,
        text_guarani: item.direction === "gn-es" ? item.original_text : item.corrected_translation,
        text_spanish: item.direction === "gn-es" ? item.corrected_translation : item.original_text,
        status: item.review_status,
        version: item.model_version
      }))
    ];
    downloadText(filename, buildCsv(rows, ["source_id", "text_guarani", "text_spanish", "status", "version"]), "text/csv;charset=utf-8");
  } else if (filename === "quality_review.csv") {
    downloadText(filename, buildCsv(state.recordings, ["recording_id", "quality_status", "review_status", "reviewer_user", "reviewed_at", "review_notes"]), "text/csv;charset=utf-8");
  }
  await logEvent("exportacion de datos", "exports", { filename });
}

function bindEvents() {
  $("#loginForm").addEventListener("submit", handleLogin);
  $("#logoutBtn").addEventListener("click", async () => {
    await logEvent("logout", "login", {});
    state.session = null;
    persistSession();
    location.reload();
  });
  $("#consentForm").addEventListener("submit", handleConsent);
  $("#profileForm").addEventListener("submit", handleProfile);
  $("#nextPromptBtn").addEventListener("click", pickNextPrompt);
  $("#startRecordBtn").addEventListener("click", startRecording);
  $("#pauseRecordBtn").addEventListener("click", pauseRecording);
  $("#stopRecordBtn").addEventListener("click", stopRecording);
  $("#discardRecordBtn").addEventListener("click", discardRecording);
  $("#saveLocalBtn").addEventListener("click", saveRecordingLocally);
  $("#syncNowBtn").addEventListener("click", syncPending);
  $("#manualSyncBtn").addEventListener("click", syncPending);
  $("#refreshRecordsBtn").addEventListener("click", renderRecords);
  $("#refreshDashboardBtn").addEventListener("click", renderDashboard);
  $("#filterQuality").addEventListener("change", renderRecords);
  $("#filterSync").addEventListener("change", renderRecords);
  $("#filterSearch").addEventListener("input", renderRecords);
  $("#promptForm").addEventListener("submit", handlePromptForm);
  $("#translatorForm").addEventListener("submit", handleTranslator);
  $("#saveFeedbackBtn").addEventListener("click", saveTranslationFeedback);
  $$("[data-export]").forEach((button) => button.addEventListener("click", () => exportFile(button.dataset.export)));
  window.addEventListener("online", () => {
    updateOnlineBadge();
    syncPending();
  });
  window.addEventListener("offline", updateOnlineBadge);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("service-worker.js");
  } catch (error) {
    await logError("pwa", "registerServiceWorker", error, "No se pudo registrar el modo offline.");
  }
}

async function init() {
  document.title = CONFIG.appName || "UNC Traductor Guarani";
  updateOnlineBadge();
  setupTabs();
  bindEvents();
  state.db = await openDatabase();
  await refreshLocalState();
  await registerServiceWorker();
  restoreSession();
  if (state.session) {
    await bootAuthenticatedApp();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    console.error(error);
    setMessage("#loginMessage", "No se pudo iniciar la aplicacion local.", true);
  });
});
