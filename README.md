# UNC_TRADUCTOR_GUARANI

Aplicacion web progresiva para recolectar grabaciones de voz en guarani, textos monolingues, pares guarani-espanol, correcciones humanas y metadatos auditables. La app es la puerta de entrada del dato; el entrenamiento de modelos debe ocurrir despues, en servidor institucional UNC, solo con datos validados.

## Diagnostico de la ruta revisada

La ruta contenia una app Flask minima:

- `app.py`: sirve una pantalla simple, selecciona prompts al azar desde CSV y guarda audios en carpeta local `recordings/`.
- `templates/index.html`: formulario basico con usuario opcional, texto, grabar, reproducir y enviar.
- `static/app.js`: usa `MediaRecorder`, sube un `FormData` y permite transcripcion opcional.
- `static/style.css`: estilos minimos.
- `db_init.py`: crea una tabla SQLite `recordings` con pocos campos.
- `export_dataset.py`: exporta `dataset.jsonl` con ruta local y texto.
- `prompts/prompts.csv`: cinco frases sueltas sin columnas ni metadatos.
- `requirements.txt`: Flask y Flask-Cors.
- `Manual maestro para creacion de appweb.txt`: guia institucional PARACEL.

No existian `manifest.json`, `service-worker.js`, `config.js`, `gas/`, `data/`, `docs/`, `assets/`, `.github/`, scripts de despliegue, modulo de usuarios, consentimiento, perfil linguistico, roles, IndexedDB, cola offline, auditoria, errores, administracion, dashboard ni exportaciones especializadas.

## Que se conserva

- La prueba local Flask y su endpoint de carga son utiles como prototipo historico.
- La idea de usar `MediaRecorder` se conserva.
- `prompts/prompts.csv` queda como insumo inicial, pero no debe ser la fuente principal en produccion porque no versiona textos ni metadatos.

## Que se agrego

- Frontend PWA en `index.html`, `styles.css`, `config.js`, `app.js`.
- `manifest.json` y `service-worker.js`.
- IndexedDB para prompts, participantes, grabaciones, logs, errores y feedback.
- Login demo con roles.
- Consentimiento informado y perfil linguistico minimo.
- Lectura guiada con seleccion por baja cobertura.
- Grabacion con validacion de duracion, tamano, MIME type, hash SHA-256 y volumen aproximado.
- Cola offline y sincronizacion segura.
- Registros, revision manual, dashboard y exportaciones.
- Backend Google Apps Script modular en `gas/`.
- Documentacion en `docs/`.
- Datos de ejemplo en `data/`.
- Carpetas de corpus: `audio/raw/`, `audio/validated/`, `audio/rejected/`, `metadata/`, `transcripts/`, `parallel_text/`, `exports/`.

## Arquitectura propuesta

- Frontend: HTML, CSS y JavaScript sin framework, desplegable en GitHub Pages o servido por Google Apps Script.
- Backend operativo: Google Apps Script con Google Sheets para metadatos y Google Drive para audios.
- Backend institucional futuro: API UNC para recepcion, corpus versionado, entrenamiento, evaluacion, registro de modelos e inferencia.
- Base operativa: hojas `CONFIG`, `USUARIOS`, `PARTICIPANTES`, `PROMPTS`, `RECORDINGS`, `ARCHIVOS`, `LOG`, `ERRORES`, `VERSIONES`, `EXPORTS`.
- Offline: `service-worker.js` + IndexedDB + sincronizacion manual/automatica.
- Seguridad: roles en frontend y validacion backend; contrasenas hasheadas en Sheets; credenciales por PropertiesService, no en frontend.
- Privacidad: `participant_id` anonimo o seudonimo; no se almacenan datos personales directos salvo justificacion y consentimiento.

## Modo demo local

Abrir `index.html` con un servidor local:

```bash
python3 -m http.server 5173
```

Luego entrar a:

```text
http://127.0.0.1:5173
```

Usuarios demo:

- `admin.demo` / `admin-demo`
- `linguista.demo` / `linguista-demo`
- `cargador.demo` / `cargador-demo`

Estos usuarios son solo para piloto local. En produccion se deben gestionar usuarios desde la hoja `USUARIOS` y el backend Apps Script o la API UNC.

## Despliegue con Google Apps Script

1. Crear un Google Sheet operativo.
2. Crear una carpeta en Google Drive para audios.
3. Crear un proyecto de Apps Script.
4. Copiar los archivos de `gas/`.
5. Configurar Script Properties:

```text
SPREADSHEET_ID=1x7uBb_rsj29yjt2mQOiKPHKFiE8Cr0JrheWHxAEl32c
DRIVE_FOLDER_ID=1uR9AEYUN89hE-HpURiUXEI1ro3kGQuMC
APP_VERSION=0.1.0-piloto
```

6. Ejecutar `setupDatabase()` desde Apps Script.
7. Crear el primer usuario con `bootstrapAdmin("admin", "cambiar-esta-clave", "Administrador", "correo@unc.edu.py")`.
8. Desplegar como Web App.
9. En `config.js`, cambiar:

```js
backendMode: "gas",
gasWebAppUrl: "https://script.google.com/macros/s/XXXXX/exec"
```

Para produccion estable, se recomienda servir el frontend desde el mismo Apps Script o desde una API UNC con CORS controlado.

Recursos configurados para este piloto:

- Sheet operativo: https://docs.google.com/spreadsheets/d/1x7uBb_rsj29yjt2mQOiKPHKFiE8Cr0JrheWHxAEl32c/edit
- Carpeta Drive de audios: https://drive.google.com/drive/folders/1uR9AEYUN89hE-HpURiUXEI1ro3kGQuMC
- Repositorio objetivo: https://github.com/monitorimpactosocial/traductor_audio_gurani_a_texto_castellano.git

El backend Apps Script del piloto esta subido y desplegado en:

```text
https://script.google.com/macros/s/AKfycbwHed3yKFi85-mO38zeXAIql4FqU1wUkiC8uGPjPPRj8oDi_f-9OmBSmLeWdW-Ucbglww/exec
```

El Web App todavia requiere autorizacion inicial del propietario en Apps Script para poder responder anonimamente. Por eso la PWA publicada queda en `backendMode: "demo"` hasta completar esa autorizacion. Luego cambiar `backendMode` a `"gas"` en `config.js`.

## Servidor institucional UNC

La app no entrena el traductor por si sola. El servidor UNC debe centralizar datos validados, versionar corpus, ejecutar limpieza, entrenamiento, evaluacion y publicar modelos solo si superan metricas minimas. Cada traduccion debe registrar `model_version` y `request_id`.

Componentes recomendados:

- API de recepcion de audios, textos, traducciones y correcciones.
- Base relacional para metadatos, permisos, corpus, auditoria y versiones.
- Almacenamiento de objetos para audios.
- Repositorio de corpus versionado.
- Pipeline de normalizacion, validacion automatica, revision humana, entrenamiento, evaluacion y despliegue.
- Registro de modelos con rollback.
- API de inferencia para traduccion y consulta de version.

Estados del ciclo incremental:

```text
RECIBIDO -> VALIDACION_AUTOMATICA -> PENDIENTE_REVISION_HUMANA -> VALIDADO -> INCORPORADO_A_CORPUS -> USADO_EN_ENTRENAMIENTO
```

Los datos rechazados quedan trazados pero no se usan para entrenamiento.

## Archivos principales

```text
index.html
app.js
styles.css
config.js
manifest.json
service-worker.js
data/
docs/
gas/
assets/
exports/
audio/
metadata/
transcripts/
parallel_text/
```

## Checklist de aceptacion piloto

- Login y roles demo.
- Consentimiento informado.
- Perfil linguistico minimo.
- Textos en guarani desde JSON/IndexedDB.
- Grabacion con `MediaRecorder`.
- Reproduccion y repeticion.
- Audio guardado como `Blob` local y preparado como archivo remoto.
- Metadatos estructurados con `participant_id` y `prompt_id`.
- Indicador online/offline.
- Cola local sin borrado prematuro.
- LOG y ERRORES locales; LOG/ERRORES en GAS.
- Revision manual de calidad.
- Exportaciones ASR, participantes, prompts, paralelo y calidad.
- Separacion de corpus acustico, monolingue y paralelo.

## Riesgos pendientes

- El modo demo no reemplaza autenticacion real.
- Google Apps Script puede requerir servir el frontend desde el mismo dominio o usar API UNC para evitar restricciones CORS en algunos navegadores.
- Los audios grandes pueden superar limites de Apps Script; para produccion conviene API UNC con subida multipart directa a almacenamiento de objetos.
- La base Flask previa queda como prototipo local, no como arquitectura recomendada de produccion.
