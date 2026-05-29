# Manual de usuario

## Objetivo

UNC Traductor Guarani permite recolectar grabaciones de lectura en guarani, registrar metadatos linguisticos minimos y enviar datos a revision. Las grabaciones alimentan un corpus acustico; no entrenan automaticamente un traductor.

## Inicio de sesion

1. Abrir la aplicacion.
2. Ingresar usuario y contrasena.
3. Verificar el rol mostrado en la barra superior.

En modo demo local existen usuarios de prueba documentados en `README.md`. En produccion, el administrador debe crear usuarios en el backend.

## Consentimiento

Antes de grabar:

1. Leer el texto de consentimiento.
2. Indicar alias o elegir participacion anonima.
3. Marcar aceptacion explicita.
4. Guardar consentimiento.

La app registra version del consentimiento, fecha, version de app y datos tecnicos del dispositivo.

## Perfil linguistico

Completar solo datos minimos:

- rango de edad;
- departamento, distrito o comunidad si corresponde;
- lengua materna;
- nivel de guarani;
- variante o forma de habla;
- otros idiomas.

No ingresar numero de documento, telefono, direccion exacta ni datos personales innecesarios.

## Grabacion

1. Abrir `Grabar`.
2. Leer el texto mostrado.
3. Presionar `Grabar`.
4. Leer en voz clara.
5. Presionar `Detener`.
6. Escuchar el audio.
7. Si no sirve, usar `Descartar` y repetir.
8. Si sirve, usar `Guardar en cola`.
9. Sincronizar cuando haya conexion.

La app valida duracion minima, maxima, tamano y tipo de audio.

## Registros y dashboard

Segun el rol, se puede revisar:

- grabaciones cargadas;
- estado de sincronizacion;
- estado de calidad;
- cobertura por texto y tema;
- duracion total acumulada;
- pendientes de revision.

## Traductor y correcciones

El modulo `Traductor` permite consultar una API institucional cuando exista. Las correcciones humanas se guardan como datos pendientes de revision. Solo correcciones validadas deben entrar al corpus paralelo.

## Offline

Si no hay internet, la app guarda datos en IndexedDB. No se borran datos locales hasta confirmar guardado remoto. Usar `Sync` para reintentar.

## Mensajes de error

La app muestra mensajes simples al usuario y guarda detalles tecnicos en `ERRORES` para revision tecnica.
