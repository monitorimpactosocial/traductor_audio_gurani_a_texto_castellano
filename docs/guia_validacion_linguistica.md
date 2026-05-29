# Guia de validacion linguistica

## Objetivo

Estandarizar la revision de audios, textos, traducciones y correcciones antes de incorporar datos al corpus institucional.

## Estados de calidad

- `PENDIENTE_REVISION`: recibido, aun no revisado.
- `APROBADO`: audio o texto utilizable.
- `OBSERVADO`: requiere nota o posible correccion.
- `RECHAZADO`: no debe usarse para entrenamiento.

## Criterios para audio

Aprobar si:

- corresponde al texto mostrado;
- se escucha con claridad suficiente;
- no esta vacio;
- respeta duracion minima y maxima;
- no contiene datos personales sensibles;
- no hay interrupciones graves.

Observar si:

- hay ruido moderado;
- hay duda dialectal o de pronunciacion;
- el participante corrige una parte;
- falta confirmar transcripcion.

Rechazar si:

- el audio no corresponde al texto;
- contiene silencio casi completo;
- contiene informacion personal directa no consentida;
- es ininteligible;
- esta duplicado sin utilidad.

## Criterios para texto guarani

- Mantener `text_guarani` original y `text_guarani_normalized` separado.
- No reemplazar variantes validas sin registrar decision.
- Versionar todo cambio de texto.
- Registrar fuente, tema, dificultad y responsable.

## Criterios para traduccion

Evaluar:

- conservacion del sentido;
- gramaticalidad;
- adecuacion cultural;
- naturalidad;
- tratamiento de variantes;
- consistencia terminologica.

Las correcciones humanas entran como `PENDIENTE_REVISION_HUMANA`. Solo pares aprobados pasan al corpus paralelo.

## Aprendizaje activo

Priorizar tareas que cubran:

- textos con pocas grabaciones;
- palabras poco representadas;
- variantes dialectales con baja cobertura;
- frases donde el modelo falla;
- expresiones idiomaticas;
- pares de alta utilidad practica.
