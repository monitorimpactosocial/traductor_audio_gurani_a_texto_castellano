# Manual tecnico

## Componentes

- `index.html`: estructura de interfaz.
- `styles.css`: estilos institucionales responsive.
- `config.js`: version, modo backend, endpoints, roles y parametros de audio.
- `app.js`: login, roles, IndexedDB, MediaRecorder, sincronizacion, dashboard y exportaciones.
- `manifest.json`: instalacion PWA.
- `service-worker.js`: cache offline.
- `gas/`: backend Google Apps Script modular.
- `data/`: datos de ejemplo.

## Modos de backend

### `demo`

No llama servidor. Guarda datos en IndexedDB y marca sincronizacion como `LOCAL_DEMO`.

### `gas`

Envia acciones a Google Apps Script:

- `login`
- `getPrompts`
- `syncRecording`
- `reviewRecording`
- `exportData`

Los audios se envian como base64 en la solicitud para que Apps Script cree un archivo en Drive. La base64 no se guarda en Sheets.

URL Web App del piloto:

```text
https://script.google.com/macros/s/AKfycbwHed3yKFi85-mO38zeXAIql4FqU1wUkiC8uGPjPPRj8oDi_f-9OmBSmLeWdW-Ucbglww/exec
```

Si devuelve `403 Acceso denegado`, abrir el proyecto Apps Script con la cuenta propietaria, ejecutar una funcion una vez para autorizar scopes, y redeployar el Web App con acceso `Anyone, even anonymous`.

### `unc-api`

Reservado para la API institucional UNC. Debe exponer endpoints para traduccion, correcciones, audios, prompts y tareas priorizadas.

## IndexedDB

Base: `unc_traductor_guarani`

Stores:

- `prompts`
- `participants`
- `recordings`
- `logs`
- `errors`
- `feedback`

Los audios quedan como `Blob` en `recordings.audio_blob` hasta confirmacion remota.

## Google Apps Script

Configurar Script Properties:

- `SPREADSHEET_ID`
- `DRIVE_FOLDER_ID`
- `APP_VERSION`

Para este piloto:

```text
SPREADSHEET_ID=1x7uBb_rsj29yjt2mQOiKPHKFiE8Cr0JrheWHxAEl32c
DRIVE_FOLDER_ID=1uR9AEYUN89hE-HpURiUXEI1ro3kGQuMC
APP_VERSION=0.1.0-piloto
```

Ejecutar:

```js
setupDatabase()
bootstrapAdmin("admin", "cambiar-esta-clave", "Administrador", "correo@unc.edu.py")
```

Publicar como Web App con acceso controlado segun politica institucional.

## Seguridad

- No guardar credenciales reales en `config.js`.
- Usar hashes `sha256$salt$hash` en `USUARIOS.password_hash`.
- Validar permisos en Apps Script con `requireRole`.
- Registrar eventos en `LOG`.
- Registrar errores en `ERRORES`.
- No guardar audios base64 en Sheets.

## Servidor UNC recomendado

Para produccion robusta, Apps Script puede ser etapa operativa inicial. La arquitectura final debe incluir:

- API backend con autenticacion fuerte.
- PostgreSQL o base relacional equivalente.
- almacenamiento de objetos para audio;
- pipeline ETL;
- versionamiento de corpus;
- registro de modelos;
- API de inferencia.

## Entrenamiento incremental

Los datos nuevos pasan por:

```text
RECIBIDO
VALIDACION_AUTOMATICA
PENDIENTE_REVISION_HUMANA
VALIDADO
RECHAZADO
INCORPORADO_A_CORPUS
USADO_EN_ENTRENAMIENTO
```

El entrenamiento se ejecuta por lotes, no en tiempo real. Cada modelo registra corpus, parametros, metricas, revision humana y estado de despliegue.

## Evaluacion

ASR:

- WER;
- CER;
- calidad de alineacion;
- errores por variante;
- errores por longitud.

Traduccion:

- revision humana de sentido;
- gramaticalidad;
- adecuacion cultural;
- BLEU o chrF;
- conjunto fijo de prueba no usado en entrenamiento.
