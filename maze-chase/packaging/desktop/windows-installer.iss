; Inno Setup script for the Maze Chase desktop game.
;
; Build with windows-installer.ps1, which supplies MyAppVersion,
; MySourceDir, and the output directory on the iscc command line.
; The installer is per-user by default (no administrator prompt), adds a
; Start menu shortcut, and registers a standard uninstaller.

#ifndef MyAppVersion
  #define MyAppVersion "0.0.0"
#endif

#ifndef MySourceDir
  #define MySourceDir "."
#endif

[Setup]
AppId={{8E4B2C1A-7F3D-4A6E-9C21-5B0D8E7A6F42}
AppName=Maze Chase
AppVersion={#MyAppVersion}
AppVerName=Maze Chase {#MyAppVersion}
AppPublisher=RandomLabs
AppPublisherURL=https://github.com/Userfrom1995/RandomLabs/tree/main/maze-chase
AppSupportURL=https://github.com/Userfrom1995/RandomLabs/issues
DefaultDirName={autopf}\Maze Chase
DefaultGroupName=Maze Chase
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputBaseFilename=maze-chase-desktop-{#MyAppVersion}-windows-x86_64-setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\maze-chase-desktop.exe
UninstallDisplayName=Maze Chase

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "{#MySourceDir}\maze-chase-desktop.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#MySourceDir}\README-desktop.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#MySourceDir}\LICENSE"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\Maze Chase"; Filename: "{app}\maze-chase-desktop.exe"
Name: "{autodesktop}\Maze Chase"; Filename: "{app}\maze-chase-desktop.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"

[Run]
Filename: "{app}\maze-chase-desktop.exe"; Description: "Launch Maze Chase"; Flags: nowait postinstall skipifsilent
