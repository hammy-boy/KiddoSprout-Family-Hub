# KiddoSprout Blocker for Windows

This folder builds the first transparent, current-user Windows colleague test.
It has no administrator installer and makes no claim to detect every game.

## Included behavior

- Windows x64 and Windows ARM64 GUI executables (no console window)
- self-install to `%LOCALAPPDATA%\KiddoSprout\Blocker`
- current-user start-at-sign-in through the documented HKCU Run key
- process monitoring limited to the current Windows session
- conservative exclusions for core Windows, Microsoft Defender, common browser, and KiddoSprout processes
- detection of known launchers/executables, common game-library paths, and parent-added exact `.exe` rules
- visible “Blocked this app” message after a detected process is closed
- 4–8 digit parent PIN for pause, PIN/rule changes, quit, and uninstall
- PBKDF2-HMAC-SHA256 PIN record with random salt, constant-time comparison, and persistent attempt lockout
- loopback-only control page with a one-time bootstrap URL, HttpOnly SameSite cookie, Origin check, and CSRF token
- fixed-target uninstall helper that removes only KiddoSprout's known current-user files
- the existing Chrome/Edge website blocker in each ZIP

## Build

From this folder:

```sh
GO_BIN=/path/to/go ./scripts/build.sh
```

The build uses only the Go standard library and creates:

- `dist/KiddoSproutBlocker-Windows-x64.zip`
- `dist/KiddoSproutBlocker-Windows-arm64.zip`
- `dist/SHA256SUMS.txt`

The Docker download service copies those exact ZIP names.
Each ZIP also includes architecture/version/signing details, the source and build
script used for the native executable, and an internal SHA-256 manifest. The
top-level `dist/SHA256SUMS.txt` verifies the two ZIP files themselves. Build
outputs are staged outside the source tree so no unlabelled executable is served.

## Verification boundary

Platform-neutral unit tests and Windows cross-compilation can run on macOS. The
process, registry, start-at-sign-in, browser-launch, GUI-subsystem, notification,
and uninstall paths still need a smoke test on an actual Windows 10/11 x64 or
ARM64 computer before release.

The binaries are unsigned colleague-test builds. Do not tell testers to disable
Windows Security. Public distribution requires normal Windows code signing and
reputation work; self-signing does not create public SmartScreen reputation.

The parent PIN protects the app's normal controls; it is not an operating-system
security boundary. Because this transparent tester, its HKCU Run entry, and its
settings live in the signed-in user's profile, that same Windows user can force
stop it, remove the startup entry, or delete its files without the PIN. Real
enforcement needs a parent-administered installation/service and managed browser
policy. Do not describe this current-user package as tamper-proof.
