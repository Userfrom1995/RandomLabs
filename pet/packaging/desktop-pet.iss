; Desktop Pet installer for Windows (Inno Setup 6).
; Per-user install: Start Menu entry, optional launch-at-login task,
; clean uninstaller. Saves live in %APPDATA%\DesktopPet and are left
; in place on uninstall (see the uninstall notes below).
; Version is single-sourced from pet/__init__.py: the release pipeline
; and build-windows.ps1 pass /DMyAppVersion=<version> on the iscc
; command line. Do not literal a version here.
; Build the binary first: powershell -File pet\packaging\build-windows.ps1
; Compile: iscc /DMyAppVersion=<version> pet\packaging\desktop-pet.iss

#ifndef MyAppVersion
#define MyAppVersion "0.0.0-dev"
#endif
#define MyAppName "Desktop Pet"
#define MyAppPublisher "RandomLabs"
#define MyAppExe "desktop-pet.exe"

[Setup]
AppId={{3F2A1B4C-7D9E-4A6B-8C5D-1E2F3A4B5C6D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\DesktopPet
PrivilegesRequired=lowest
OutputDir=..\..\dist
OutputBaseFilename=desktop-pet-setup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
UninstallDisplayName={#MyAppName}
UninstallDisplayIcon={app}\{#MyAppExe}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "startup"; Description: "Start Desktop Pet at login (background service)"; \
  GroupDescription: "Startup:"; Flags: unchecked

[Files]
Source: "..\..\dist\desktop-pet.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\Desktop Pet"; Filename: "{app}\{#MyAppExe}"; \
  Parameters: "gui"; WorkingDir: "{app}"
Name: "{autoprograms}\Desktop Pet Settings"; Filename: "{app}\{#MyAppExe}"; \
  Parameters: "settings"; WorkingDir: "{app}"

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; ValueName: "DesktopPet"; ValueData: """{app}\{#MyAppExe}"" service loop"; \
  Tasks: startup

[Run]
Filename: "{app}\{#MyAppExe}"; Parameters: "selftest"; \
  StatusMsg: "Verifying the installed pet..."; Flags: runhidden
Filename: "{app}\{#MyAppExe}"; Description: "Launch Desktop Pet now"; \
  Parameters: "gui"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\{#MyAppExe}"; Parameters: "service stop"; \
  Flags: runhidden; RunOnceId: "StopService"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
  begin
    { Remove the launch-at-login entry even if the task box state changed. }
    RegDeleteValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Run', 'DesktopPet');
    { Saves in %APPDATA%\DesktopPet are intentionally left in place so a
      reinstall keeps the pet, its name, and its character. Delete that
      folder by hand for a full wipe. }
  end;
end;
