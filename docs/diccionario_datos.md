# Diccionario de datos

## CONFIG

| Campo | Tipo | Regla |
| --- | --- | --- |
| parametro | texto | clave unica |
| valor | texto | requerido |
| descripcion | texto | opcional |
| activo | booleano | `TRUE` o `FALSE` |

## USUARIOS

| Campo | Tipo | Regla |
| --- | --- | --- |
| usuario | texto | clave unica |
| password_hash | texto | formato `sha256$salt$hash` |
| nombre | texto | requerido |
| correo | texto | opcional |
| rol | enum | `admin`, `supervisor`, `linguista`, `cargador`, `viewer` |
| activo | booleano | requerido |
| fecha_creacion | datetime | ISO 8601 |
| ultimo_acceso | datetime | ISO 8601 |
| observacion | texto | opcional |

## PARTICIPANTES

| Campo | Tipo | Regla |
| --- | --- | --- |
| participant_id | texto | clave primaria anonima |
| alias | texto | opcional, seudonimo |
| rango_edad | enum | no usar fecha de nacimiento |
| departamento | texto | opcional |
| distrito | texto | opcional |
| comunidad | texto | opcional |
| lengua_materna | texto | requerido |
| nivel_guarani | enum | `Basico`, `Intermedio`, `Avanzado`, `Nativo`, `No declara` |
| variante_guarani | texto | opcional |
| otros_idiomas | texto | lista separada por coma |
| consent_version | texto | requerido |
| consent_accepted | booleano | requerido |
| created_at | datetime | ISO 8601 |
| app_version | texto | requerido |

## PROMPTS

| Campo | Tipo | Regla |
| --- | --- | --- |
| prompt_id | texto | clave primaria estable |
| text_guarani | texto | requerido |
| text_guarani_normalized | texto | requerido |
| text_spanish | texto | opcional, corpus paralelo si validado |
| source | texto | fuente o responsable |
| topic | texto | catalogo |
| difficulty_level | enum | `basico`, `intermedio`, `avanzado` |
| token_count | numero | calculado |
| character_count | numero | calculado |
| status | enum | `ACTIVO`, `INACTIVO`, `RETIRADO` |
| version | texto | incrementa si cambia el texto |
| created_at | datetime | ISO 8601 |
| updated_at | datetime | ISO 8601 |

## RECORDINGS

| Campo | Tipo | Regla |
| --- | --- | --- |
| recording_id | texto | clave primaria |
| participant_id | texto | FK a `PARTICIPANTES` |
| prompt_id | texto | FK a `PROMPTS` |
| attempt_number | numero | incrementa por participante y prompt |
| audio_file_id | texto | FK logica a `ARCHIVOS` |
| audio_url | texto | enlace Drive o storage |
| audio_filename | texto | `participantId_promptId_attempt_timestamp.webm` |
| audio_mime_type | texto | MIME real del navegador |
| audio_duration_ms | numero | requerido |
| audio_size_bytes | numero | requerido |
| hash_audio | texto | SHA-256 |
| created_at | datetime | ISO 8601 |
| origin | enum | `online`, `offline` |
| sync_status | enum | `PENDIENTE`, `SINCRONIZADO`, `ERROR_SYNC`, `LOCAL_DEMO` |
| quality_status | enum | `PENDIENTE_REVISION`, `APROBADO`, `OBSERVADO`, `RECHAZADO` |
| review_status | enum | estado de revision humana |
| reviewer_user | texto | usuario revisor |
| reviewed_at | datetime | ISO 8601 |
| review_notes | texto | observaciones |
| app_version | texto | requerido |
| device_type | texto | `movil` o `desktop` |
| browser | texto | navegador |

## ARCHIVOS

| Campo | Tipo | Regla |
| --- | --- | --- |
| file_id | texto | clave primaria |
| recording_id | texto | FK a `RECORDINGS` |
| participant_id | texto | FK |
| prompt_id | texto | FK |
| filename | texto | requerido |
| mime_type | texto | requerido |
| drive_file_id | texto | id del archivo en Drive |
| drive_url | texto | URL del archivo |
| upload_status | enum | `OK`, `ERROR` |
| created_at | datetime | ISO 8601 |
| size_bytes | numero | requerido |
| hash_file | texto | SHA-256 |

## LOG

| Campo | Tipo |
| --- | --- |
| fecha_hora | datetime |
| evento | texto |
| usuario | texto |
| rol | texto |
| participant_id | texto |
| recording_id | texto |
| prompt_id | texto |
| modulo | texto |
| detalle | texto/json |
| device_info | texto/json |
| app_version | texto |

## ERRORES

| Campo | Tipo |
| --- | --- |
| fecha_hora | datetime |
| modulo | texto |
| funcion | texto |
| tipo_error | texto |
| mensaje_tecnico | texto |
| mensaje_usuario | texto |
| usuario | texto |
| device_info | texto/json |
| app_version | texto |

## VERSIONES, EXPORTS y modelos

`VERSIONES` registra versiones de app. `EXPORTS` registra cada exportacion. En servidor UNC se agrega tabla de modelos con `model_id`, `model_version`, `training_date`, `corpus_version`, metricas, estado de despliegue y responsable.
