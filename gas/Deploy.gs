function configurePilotProperties() {
  PropertiesService.getScriptProperties().setProperties({
    SPREADSHEET_ID: '1x7uBb_rsj29yjt2mQOiKPHKFiE8Cr0JrheWHxAEl32c',
    DRIVE_FOLDER_ID: '1uR9AEYUN89hE-HpURiUXEI1ro3kGQuMC',
    APP_VERSION: '0.1.1-piloto'
  }, true);
  return setupDatabase();
}

function getDeploymentConfig() {
  return {
    ok: true,
    spreadsheet_id: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'),
    drive_folder_id: PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID'),
    app_version: getAppVersion()
  };
}
