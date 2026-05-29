window.UNC_CONFIG = {
  appName: "UNC Traductor Guarani",
  appVersion: "0.1.0-piloto",
  environment: "desarrollo",
  consentVersion: "CONS-UNC-GN-2026-05-29-v1",
  backendMode: "demo",
  gasWebAppUrl: "",
  uncApiBaseUrl: "",
  sheetId: "1x7uBb_rsj29yjt2mQOiKPHKFiE8Cr0JrheWHxAEl32c",
  driveFolderId: "1uR9AEYUN89hE-HpURiUXEI1ro3kGQuMC",
  sheetUrl: "https://docs.google.com/spreadsheets/d/1x7uBb_rsj29yjt2mQOiKPHKFiE8Cr0JrheWHxAEl32c/edit",
  driveFolderUrl: "https://drive.google.com/drive/folders/1uR9AEYUN89hE-HpURiUXEI1ro3kGQuMC",
  minDurationMs: 1200,
  maxDurationMs: 90000,
  maxAudioBytes: 25 * 1024 * 1024,
  preferredMimeTypes: [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus"
  ],
  roles: ["admin", "supervisor", "linguista", "cargador", "viewer"],
  permissions: {
    admin: ["capture", "review", "dashboard", "admin", "exports", "logs", "translate"],
    supervisor: ["capture", "review", "dashboard", "exports", "logs", "translate"],
    linguista: ["capture", "review", "dashboard", "exports", "translate"],
    cargador: ["capture", "dashboard", "translate"],
    viewer: ["dashboard", "translate"]
  },
  demoUsers: [
    {
      usuario: "admin.demo",
      password: "admin-demo",
      nombre: "Administrador Demo",
      correo: "admin.demo@example.edu.py",
      rol: "admin",
      activo: true
    },
    {
      usuario: "linguista.demo",
      password: "linguista-demo",
      nombre: "Linguista Demo",
      correo: "linguista.demo@example.edu.py",
      rol: "linguista",
      activo: true
    },
    {
      usuario: "cargador.demo",
      password: "cargador-demo",
      nombre: "Cargador Demo",
      correo: "cargador.demo@example.edu.py",
      rol: "cargador",
      activo: true
    }
  ],
  qualityStatuses: ["PENDIENTE_REVISION", "APROBADO", "OBSERVADO", "RECHAZADO"],
  corpusStates: [
    "RECIBIDO",
    "VALIDACION_AUTOMATICA",
    "PENDIENTE_REVISION_HUMANA",
    "VALIDADO",
    "RECHAZADO",
    "INCORPORADO_A_CORPUS",
    "USADO_EN_ENTRENAMIENTO"
  ]
};
