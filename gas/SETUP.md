# Configuracion Google Apps Script

## Recursos entregados

- Google Sheet: `1x7uBb_rsj29yjt2mQOiKPHKFiE8Cr0JrheWHxAEl32c`
- Carpeta Drive audios: `1uR9AEYUN89hE-HpURiUXEI1ro3kGQuMC`

## Script Properties

Configurar en Apps Script:

```text
SPREADSHEET_ID=1x7uBb_rsj29yjt2mQOiKPHKFiE8Cr0JrheWHxAEl32c
DRIVE_FOLDER_ID=1uR9AEYUN89hE-HpURiUXEI1ro3kGQuMC
APP_VERSION=0.1.0-piloto
```

## Pasos

1. Crear un proyecto Apps Script vinculado o independiente.
2. Copiar todos los archivos `.gs` y `appsscript.json`.
3. Ejecutar `setupDatabase()`.
4. Ejecutar `bootstrapAdmin("admin", "cambiar-esta-clave", "Administrador", "correo@unc.edu.py")`.
5. Desplegar como Web App.
6. Copiar la URL `/exec` del despliegue.
7. Actualizar `config.js`:

```js
backendMode: "gas",
gasWebAppUrl: "https://script.google.com/macros/s/XXXXX/exec"
```

Sin la URL del Web App, el frontend queda en modo demo local aunque ya conozca el Sheet y la carpeta Drive.
