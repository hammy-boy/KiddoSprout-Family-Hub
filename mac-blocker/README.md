# KiddoSprout Blocker for macOS

This is the local macOS test companion for KiddoSprout. It watches applications launched by the currently signed-in Mac user, automatically closes detected games, and can also close parent-selected apps. The protected ZIP includes a Chrome companion that redirects game websites to the KiddoSprout blocked page. The Mac app is intentionally unsandboxed because macOS does not allow a sandboxed app to terminate other applications.

## Build locally

```sh
zsh mac-blocker/scripts/build-mac-blocker.sh
```

The build creates:

- `mac-blocker/dist/KiddoSproutBlocker-macOS.zip`
- `mac-blocker/dist/SHA256SUMS.txt`

The ZIP contains a universal `arm64`/`x86_64` app, clear START HERE instructions, build/source transparency, and checksums for its extracted files. The app is ad-hoc signed for local testing; the build deliberately does not create a potentially confusing unsigned installer package. Public distribution requires a Developer ID certificate and Apple notarization.

## Safe test

1. From the parent dashboard, open **Device Protection → Set Up Mac Blocker** and download the protected ZIP.
2. Unzip it, open **START HERE**, and move **KiddoSprout Blocker.app** into `/Applications` using the parent administrator account.
3. Sign into the child's Standard Mac account, then open the blocker with the parent present.
4. Create the same 4–8 digit PIN used for the protected download. Both clearly labelled boxes accept numbers only; harmless pasted spaces are ignored.
5. Start blocking, enable **Start at Login**, and confirm a detected game closes with **Blocked this app**. An app with missing game metadata can still be added manually; do not select macOS system applications.
6. In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the included **KiddoSprout Browser Blocker** folder.
7. Open a known game website and confirm it redirects to **Blocked by KiddoSprout**.

Because this colleague-test build is ad-hoc signed and not notarized, Gatekeeper
can refuse its first launch. Do not disable Gatekeeper. After the blocked launch,
use **System Settings → Privacy & Security → Open Anyway** for KiddoSprout
Blocker only after its SHA-256 checksums pass, then confirm the one-time warning.
Developer ID signing and Apple notarization are required before wider distribution.

If an older test copy is already running without a saved PIN, quit it with Command-Q, download the new ZIP again, and replace the old copy in `/Applications`.

The PIN is slow-hashed with PBKDF2-HMAC-SHA256 and saved in the current user’s Keychain. The block list is stored with user-only file permissions.

## Security boundary

This build is a current-user, terminate-after-launch tester. Detection relies on app metadata and known launcher signals, so a game with missing or misleading metadata may need a manual rule. The PIN protects the app's normal controls; it is not an operating-system security boundary. The signed-in Mac user can force quit their own process, disable their user Login Item, clear their Keychain/configuration, or disable the unpacked Chrome extension without the PIN. A Mac administrator can also remove the app. Keep the parent as the only administrator and use a Standard account for the child, but do not describe this test build as tamper-proof.

Production-grade pre-launch blocking requires an Apple-entitled Endpoint Security system extension, Developer ID signing, user/admin approval, and notarization.
