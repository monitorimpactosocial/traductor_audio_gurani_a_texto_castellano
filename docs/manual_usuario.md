# Manual de usuario

## Objetivo

UNC Traductor Guarani permite trabajar con audios en guarani o castellano para producir una transcripcion, una traduccion y correcciones revisables. La app no entrena automaticamente un traductor: guarda aportes con metadatos para que sean revisados antes de usarse en corpus o modelos.

## Inicio de sesion

1. Abrir la aplicacion.
2. Ingresar usuario y contrasena.
3. Verificar el rol mostrado en la barra superior.

En modo demo local existen usuarios de prueba documentados en `README.md`. En produccion, el administrador debe crear usuarios en el backend.

## Antes de grabar

Para registrar una nueva voz se requiere:

- consentimiento informado aceptado;
- perfil linguistico minimo;
- permiso de microfono del navegador.

No ingresar numero de documento, telefono, direccion exacta ni datos personales innecesarios.

## Traducir audio

El trabajo principal esta en la pestana `Traducir audio`.

1. Elegir la direccion: `Audio guarani -> castellano` o `Audio castellano -> guarani`.
2. Presionar `Grabar` o seleccionar un archivo en `Archivo de audio`.
3. Presionar `Detener` cuando termine la lectura o exposicion.
4. Escuchar el audio con el reproductor.
5. Si no sirve, presionar `Descartar` y repetir.
6. Escribir la transcripcion exacta de lo que se escucha.
7. Escribir la traduccion al otro idioma.
8. Agregar notas si hay ruido, dudas, variante linguistica o datos que deban anonimizarse.
9. Presionar `Guardar aporte`.

El texto sugerido es opcional. Puede usarse para lectura guiada, pero tambien se puede subir o grabar un audio libre.

## Editar o corregir aportes

La pestana `Aportes` muestra las contribuciones guardadas.

- Usar los filtros para buscar por texto, estado de calidad o sincronizacion.
- Presionar `Editar / corregir` en el aporte que se quiere revisar.
- Cambiar transcripcion, traduccion, notas o estado.
- Guardar la correccion.

Si un aporte ya estaba sincronizado y se corrige localmente, vuelve a quedar pendiente para que el backend reciba la version corregida.

## Dashboard

El dashboard resume:

- total de aportes;
- pendientes de revision;
- aprobados y rechazados;
- duracion acumulada;
- cobertura por texto o tema cuando se usan textos sugeridos.

## Traducir texto

El modulo `Traductor texto` permite consultar una API institucional cuando exista. Si la traduccion generada no es correcta, se puede guardar una correccion humana para revision.

## Offline y sincronizacion

Si no hay internet, la app guarda datos en IndexedDB. No borra datos locales hasta confirmar el guardado remoto. Usar `Sync` para reintentar.

## Mensajes de error

La app muestra mensajes simples al usuario y guarda detalles tecnicos en `ERRORES` para revision tecnica.
