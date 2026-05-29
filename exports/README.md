# Exportaciones

Esta carpeta documenta los archivos esperados para entrenamiento y auditoria. La app puede generarlos localmente desde IndexedDB o el backend puede generarlos desde Google Sheets/Drive.

## Archivos esperados

- `metadata_recordings.csv`
- `participants_anonymized.csv`
- `prompts.csv`
- `manifest_asr.jsonl`
- `parallel_guarani_spanish.csv`
- `quality_review.csv`

## Separacion recomendada

```text
audio/raw/
audio/validated/
audio/rejected/
metadata/
transcripts/
parallel_text/
exports/
```

## Regla principal

Los datos crudos, validados y rechazados deben exportarse por separado. Los datos rechazados quedan para auditoria, no para entrenamiento.
