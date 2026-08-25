# MULTI HUB 24 Auto Print Agent

Windows desktop agent for MULTI HUB 24.

## Compatibility

- Windows 11 (64-bit)
- Windows 10 (32/64-bit)
- Windows 7 SP1 (32/64-bit legacy mode)
- .NET Framework 4.8
- TLS 1.2
- Any printer installed in Windows

## Build

1. Open `SunilAutoPrintAgent.csproj` in Visual Studio 2019 or 2022.
2. Restore NuGet package Newtonsoft.Json 13.0.3.
3. Build Release / Any CPU (Prefer 32-bit is enabled).
4. Put `SumatraPDF.exe` beside `MultiHub24AutoPrintAgent.exe` for silent PDF printing.
5. Package both files with the installer.

## Pairing

1. In MULTI HUB 24 open Auto Print > Install.
2. Click **Pair this PC**.
3. Copy the one-time Device Token.
4. Start Agent, paste the token, select the printer and click **Save & Start**.

The token is encrypted with Windows DPAPI for the current Windows user. It is never saved as plain text in the database; only its SHA-256 hash is stored.

## Current phase

The API, secure pairing, heartbeat, queue claim, private signed downloads, image/ID printing and job completion are implemented. Installer signing, Windows startup registration, tray icon and bundled PDF renderer are the remaining packaging tasks.


Build release: Manual UPI approval release — 2026-08-25.
