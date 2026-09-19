import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const macArchive = join(projectRoot, "mac-blocker/dist/KiddoSproutBlocker-macOS.zip");
const windowsX64Archive = join(projectRoot, "windows-blocker/dist/KiddoSproutBlocker-Windows-x64.zip");
const windowsArm64Archive = join(projectRoot, "windows-blocker/dist/KiddoSproutBlocker-Windows-arm64.zip");
const browserUploadArchive = join(projectRoot, "kiddosprout_blocker_upload.zip");
const browserExtensionFiles = ["blocked.html", "blocked.js", "content.js", "icon128.png", "manifest.json", "popup.html"];
const windowsUISource = readFileSync(join(projectRoot, "windows-blocker/internal/blocker/ui.go"), "utf8");
const windowsInlineScript = windowsUISource.match(/<script nonce="__NONCE__">([\s\S]*?)<\/script>/)?.[1] || "";

assert.ok(windowsInlineScript, "Windows control page must contain its inline controller");
assert.doesNotThrow(() => new Function(windowsInlineScript), "Windows control-page JavaScript must parse");

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function archiveEntries(archive) {
  return execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
}

function archiveFile(archive, name) {
  return execFileSync("unzip", ["-p", archive, name], { maxBuffer: 128 * 1024 * 1024 });
}

function parseChecksums(contents, label) {
  const result = new Map();
  for (const line of String(contents).trim().split(/\r?\n/)) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert.ok(match, `${label} has a malformed SHA-256 line: ${line}`);
    assert.equal(result.has(match[2]), false, `${label} lists ${match[2]} twice`);
    result.set(match[2], match[1]);
  }
  return result;
}

function verifyArchive(archive, rootPrefix) {
  assert.ok(existsSync(archive), `missing package: ${archive}`);
  const entries = archiveEntries(archive);
  const files = entries.filter((entry) => !entry.endsWith("/"));
  for (const entry of entries) {
    assert.equal(entry.startsWith("/"), false, `${archive} contains an absolute path`);
    assert.equal(entry.split("/").includes(".."), false, `${archive} contains path traversal`);
    assert.equal(entry.includes("__MACOSX"), false, `${archive} contains macOS ZIP metadata`);
    assert.equal(entry.endsWith(".DS_Store"), false, `${archive} contains Finder metadata`);
  }

  const checksumEntry = `${rootPrefix}SHA256SUMS.txt`;
  assert.ok(files.includes(checksumEntry), `${archive} must contain its own SHA256SUMS.txt`);
  const checksums = parseChecksums(archiveFile(archive, checksumEntry).toString("utf8"), checksumEntry);
  const expectedFiles = files.filter((entry) => entry !== checksumEntry).map((entry) => entry.slice(rootPrefix.length));
  assert.deepEqual([...checksums.keys()].sort(), expectedFiles.sort(), `${archive} checksum coverage must exactly match its files`);
  for (const [name, expected] of checksums) {
    assert.equal(sha256(archiveFile(archive, `${rootPrefix}${name}`)), expected, `${archive}: ${name} checksum mismatch`);
  }
  return { entries, files };
}

function verifyOuterChecksums(checksumPath, expectedNames) {
  const checksums = parseChecksums(readFileSync(checksumPath, "utf8"), checksumPath);
  assert.deepEqual([...checksums.keys()].sort(), [...expectedNames].sort(), `${checksumPath} must list only its distributed ZIPs`);
  for (const [name, expected] of checksums) {
    assert.equal(sha256(readFileSync(join(dirname(checksumPath), name))), expected, `${name} outer checksum mismatch`);
  }
}

function peMachine(executable) {
  assert.equal(executable.subarray(0, 2).toString("ascii"), "MZ", "Windows executable must start with MZ");
  const peOffset = executable.readUInt32LE(0x3c);
  assert.ok(peOffset > 0 && peOffset + 6 < executable.length, "Windows executable has an invalid PE offset");
  assert.equal(executable.subarray(peOffset, peOffset + 4).toString("binary"), "PE\u0000\u0000", "Windows executable must contain a PE header");
  return executable.readUInt16LE(peOffset + 4);
}

assert.ok(existsSync(browserUploadArchive), "missing standalone browser-extension upload ZIP");
const browserUploadEntries = archiveEntries(browserUploadArchive);
assert.deepEqual(browserUploadEntries.slice().sort(), browserExtensionFiles.slice().sort(),
  "Standalone browser-extension ZIP must contain exactly the current extension files at its root");
for (const extensionFile of browserExtensionFiles) {
  assert.deepEqual(
    archiveFile(browserUploadArchive, extensionFile),
    readFileSync(join(projectRoot, "kiddosprout_blocker", extensionFile)),
    `Standalone browser-extension ZIP has a stale ${extensionFile}`
  );
}

const macRoot = "KiddoSprout Blocker/";
const mac = verifyArchive(macArchive, macRoot);
assert.ok(mac.files.includes(`${macRoot}START HERE.txt`), "Mac ZIP needs START HERE instructions");
assert.ok(mac.files.includes(`${macRoot}BUILD-INFO.txt`), "Mac ZIP needs build transparency");
assert.ok(mac.files.includes(`${macRoot}Source/mac-blocker/Sources/main.m`), "Mac ZIP needs its core source");
assert.ok(mac.files.includes(`${macRoot}Source/mac-blocker/scripts/build-mac-blocker.sh`), "Mac ZIP needs its build script");
assert.ok(mac.files.includes(`${macRoot}Source/mac-blocker/Resources/INSTALL.txt`), "Mac bundled build needs its instruction source");
assert.ok(mac.files.includes(`${macRoot}Source/kiddosprout_logo.png`), "Mac bundled build needs its icon source");
for (const extensionFile of browserExtensionFiles) {
  const liveExtension = readFileSync(join(projectRoot, "kiddosprout_blocker", extensionFile));
  for (const packagedRoot of [`${macRoot}KiddoSprout Browser Blocker/`, `${macRoot}Source/kiddosprout_blocker/`]) {
    const packagedPath = `${packagedRoot}${extensionFile}`;
    assert.ok(mac.files.includes(packagedPath), `Mac ZIP needs ${packagedPath}`);
    assert.deepEqual(archiveFile(macArchive, packagedPath), liveExtension, `Mac packaged ${extensionFile} must match the live browser extension`);
  }
}
const macSource = readFileSync(join(projectRoot, "mac-blocker/Sources/main.m"), "utf8");
const macInfoPlist = readFileSync(join(projectRoot, "mac-blocker/Resources/Info.plist"));
const macBuildScript = readFileSync(join(projectRoot, "mac-blocker/scripts/build-mac-blocker.sh"), "utf8");
assert.deepEqual(archiveFile(macArchive, `${macRoot}Source/mac-blocker/Sources/main.m`), Buffer.from(macSource), "Mac packaged source must match the build source");
assert.deepEqual(archiveFile(macArchive, `${macRoot}Source/mac-blocker/Resources/Info.plist`), macInfoPlist, "Mac packaged Info.plist must match the build source");
assert.deepEqual(
  archiveFile(macArchive, `${macRoot}Source/mac-blocker/scripts/build-mac-blocker.sh`),
  Buffer.from(macBuildScript),
  "Mac packaged build script must match the live build script"
);
assert.doesNotMatch(macBuildScript, /rm\s+-rf[^\n]*\$\{dist_dir\}/, "Mac rebuilds must not remove the live download directory");
assert.match(macBuildScript, /staged_archive[\s\S]*mv -f "\$\{staged_archive\}"/, "Mac rebuilds must publish a complete staged archive atomically");
assert.doesNotMatch(macSource, /requestUserAttention:NSCriticalRequest/, "Mac block notices must not trigger endless critical Dock bouncing");
assert.match(macSource, /requestUserAttention:NSInformationalRequest/, "Mac block notices may use only a one-bounce informational attention request");
assert.match(macSource, /runningApplicationsWithBundleIdentifier:KSBlockerBundleIdentifier/, "Mac launches must hand control to an already-running blocker instance");
assert.match(macSource, /KSProcessIdentity\(application\.processIdentifier, application\.launchDate\)/, "Mac process suppression must distinguish reused PIDs by launch time");
assert.match(macSource, /if \(application\.terminated\)[\s\S]*showBlockedApplicationNotice/, "Mac must confirm termination before claiming an app was blocked");
assert.match(macSource, /!application\.terminated && \(!strongSelf\.enabled \|\| !\[strongSelf applicationIsBlocked:application\]\)[\s\S]*return;[\s\S]*forceTerminate/, "Mac must recheck protection and the app rule before escalating to a forced close");
assert.match(macSource, /if \(NSApp\.isActive\)[\s\S]*setOrChangePIN:[\s\S]*requestUserAttention:NSInformationalRequest/, "Mac must not open its first-run PIN modal while the app is inactive");
assert.match(macSource, /if \(!NSApp\.isActive\)[\s\S]*requestUserAttention:NSInformationalRequest[\s\S]*return;[\s\S]*beginSheetModalForWindow/, "Mac must not present the blocked modal sheet while inactive because AppKit would create a critical Dock bounce");
const setPINImplementation = macSource.match(/- \(BOOL\)setPIN:[\s\S]*?\n}\n\n- \(BOOL\)verifyPIN:/)?.[0] || "";
assert.match(setPINImplementation, /SecItemUpdate/, "changing the Mac PIN must update the Keychain item without deleting the old PIN first");
assert.doesNotMatch(setPINImplementation, /SecItemDelete/, "a failed Mac PIN change must not delete the previously working PIN");
assert.deepEqual(archiveFile(macArchive, `${macRoot}Source/mac-blocker/Resources/INSTALL.txt`), readFileSync(join(projectRoot, "mac-blocker/Resources/INSTALL.txt")), "Mac packaged setup instructions must match their source");
const macBuildInfo = archiveFile(macArchive, `${macRoot}BUILD-INFO.txt`).toString("utf8");
assert.match(macBuildInfo, /Version: 0\.3\.1/);
assert.match(macBuildInfo, /Build: 8/);
assert.match(macBuildInfo, /Architectures: arm64 .* x86_64/);
assert.match(macBuildInfo, /ad-hoc test signature/);
assert.match(macBuildInfo, /notarization: not performed/i);
const macStartHere = archiveFile(macArchive, `${macRoot}START HERE.txt`).toString("utf8");
assert.match(macStartHere, /shasum -a 256 -c SHA256SUMS\.txt/);
assert.match(macStartHere, /Do not disable Gatekeeper[\s\S]*Open Anyway/, "Mac test instructions must explain the safe Gatekeeper override");

const extractionRoot = mkdtempSync(join(tmpdir(), "kiddosprout-mac-package-"));
try {
  execFileSync("ditto", ["-x", "-k", macArchive, extractionRoot]);
  const appPath = join(extractionRoot, "KiddoSprout Blocker", "KiddoSprout Blocker.app");
  const executablePath = join(appPath, "Contents/MacOS/KiddoSproutBlocker");
  const appInfoPath = join(appPath, "Contents/Info.plist");
  const prohibitsDuplicateInstances = execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :LSMultipleInstancesProhibited", appInfoPath], { encoding: "utf8" }).trim();
  assert.equal(prohibitsDuplicateInstances, "true", "Mac app must prohibit duplicate GUI instances");
  const architectures = execFileSync("/usr/bin/lipo", ["-archs", executablePath], { encoding: "utf8" }).trim().split(/\s+/).sort();
  assert.deepEqual(architectures, ["arm64", "x86_64"], "Mac executable must truly be universal");
  execFileSync("/usr/bin/codesign", ["--verify", "--deep", "--strict", appPath]);
  const signature = spawnSync("/usr/bin/codesign", ["-dv", "--verbose=4", appPath], { encoding: "utf8" });
  assert.equal(signature.status, 0, signature.stderr);
  assert.match(signature.stderr, /Signature=adhoc/, "Mac test app must accurately disclose its ad-hoc signature");
  const selfTest = JSON.parse(execFileSync(executablePath, ["--self-test"], { encoding: "utf8" }));
  assert.equal(selfTest.passed, true, "packaged Mac executable self-test must pass");
  assert.equal(selfTest.loginItemRemovalRouting, true, "Mac removal must clear every registered or approval-pending Login Item first");
} finally {
  rmSync(extractionRoot, { recursive: true, force: true });
}

for (const [archive, architecture, machine] of [
  [windowsX64Archive, "x64", 0x8664],
  [windowsArm64Archive, "ARM64", 0xaa64]
]) {
  const windows = verifyArchive(archive, "");
  assert.ok(windows.files.includes("START HERE.txt"), `${architecture} ZIP needs START HERE instructions`);
  assert.ok(windows.files.includes("BUILD-INFO.txt"), `${architecture} ZIP needs build transparency`);
  assert.ok(windows.files.includes("Source/windows-blocker/cmd/kiddosprout-blocker/main_windows.go"), `${architecture} ZIP needs its core source`);
  assert.ok(windows.files.includes("Source/windows-blocker/scripts/build.sh"), `${architecture} ZIP needs its build script`);
  for (const extensionFile of browserExtensionFiles) {
    const liveExtension = readFileSync(join(projectRoot, "kiddosprout_blocker", extensionFile));
    for (const packagedRoot of ["browser-extension/", "Source/kiddosprout_blocker/"]) {
      const packagedPath = `${packagedRoot}${extensionFile}`;
      assert.ok(windows.files.includes(packagedPath), `${architecture} ZIP needs ${packagedPath}`);
      assert.deepEqual(archiveFile(archive, packagedPath), liveExtension, `${architecture} packaged ${extensionFile} must match the live browser extension`);
    }
  }
  for (const sourcePath of [
    "cmd/kiddosprout-blocker/main_windows.go",
    "cmd/kiddosprout-blocker/install_windows.go",
    "cmd/kiddosprout-blocker/monitor_windows.go",
    "cmd/kiddosprout-blocker/startup.go",
    "cmd/kiddosprout-blocker/startup_test.go",
    "cmd/kiddosprout-blocker/winapi_windows.go",
    "internal/blocker/detection.go",
    "internal/blocker/server.go",
    "internal/blocker/ui.go",
    "scripts/build.sh"
  ]) {
    const packagedPath = `Source/windows-blocker/${sourcePath}`;
    assert.ok(windows.files.includes(packagedPath), `${architecture} ZIP needs ${sourcePath}`);
    assert.deepEqual(archiveFile(archive, packagedPath), readFileSync(join(projectRoot, "windows-blocker", sourcePath)), `${architecture} packaged ${sourcePath} must match the build source`);
  }
  const buildInfo = archiveFile(archive, "BUILD-INFO.txt").toString("utf8");
  assert.match(buildInfo, /Version: 0\.1\.0/);
  assert.match(buildInfo, new RegExp(`Architecture: ${architecture}`));
  assert.match(buildInfo, /Executable signature: unsigned/);
  const startHere = archiveFile(archive, "START HERE.txt").toString("utf8");
  assert.equal(startHere.includes("@VERSION@"), false, "version placeholder must be resolved");
  assert.equal(startHere.includes("@ARCHITECTURE@"), false, "architecture placeholder must be resolved");
  assert.equal(peMachine(archiveFile(archive, "KiddoSproutBlocker.exe")), machine, `${architecture} ZIP contains the wrong PE machine type`);
}

const windowsBuildScript = readFileSync(join(projectRoot, "windows-blocker/scripts/build.sh"), "utf8");
const windowsMonitorSource = readFileSync(join(projectRoot, "windows-blocker/cmd/kiddosprout-blocker/monitor_windows.go"), "utf8");
const windowsWinAPISource = readFileSync(join(projectRoot, "windows-blocker/cmd/kiddosprout-blocker/winapi_windows.go"), "utf8");
const windowsMainSource = readFileSync(join(projectRoot, "windows-blocker/cmd/kiddosprout-blocker/main_windows.go"), "utf8");
const windowsInstallSource = readFileSync(join(projectRoot, "windows-blocker/cmd/kiddosprout-blocker/install_windows.go"), "utf8");
assert.doesNotMatch(windowsBuildScript, /rm\s+-f[\s\S]{0,240}?PROJECT_DIR\/dist/, "Windows rebuilds must not remove live downloads before replacements are ready");
assert.match(windowsBuildScript, /STAGE_ROOT\/KiddoSproutBlocker-Windows-\$label\.zip[\s\S]*mv -f/, "Windows rebuilds must assemble downloads in staging before publication");
assert.doesNotMatch(windowsMainSource, /os\.Remove\(path\)[\s\S]{0,160}?os\.Rename\(temporaryPath, path\)/, "Windows runtime records must be replaced without a delete-first availability gap");
assert.doesNotMatch(windowsInstallSource, /os\.Remove\(destination\)[\s\S]{0,220}?os\.Rename\(temporaryPath, destination\)/, "Windows installed files must not be deleted before their complete replacement is ready");
assert.doesNotMatch(windowsInstallSource, /os\.Remove\(path\)[\s\S]{0,180}?os\.Rename\(temporaryPath, path\)/, "Windows uninstall authorization must be replaced without a delete-first gap");
assert.match(windowsMainSource, /mutex, alreadyRunning, mutexErr := acquireSingleInstance\(\)[\s\S]*if mutexErr != nil \{[\s\S]*return[\s\S]*if alreadyRunning \{/, "Windows installers must abort when the single-instance state cannot be checked");
assert.match(windowsMainSource, /if !samePath\(currentExecutable, paths\.executable\) \{\s*\/\/[\s\S]*acquireSingleInstance\(\)/, "Windows must check the process lock even when the installed package is incomplete");
assert.match(windowsWinAPISource, /procTerminateProcess\.Call[\s\S]*processHandleExited\(handle, forcedExitConfirmationTimeout\)/, "Windows must confirm a forced process exit before claiming it was blocked");
assert.match(windowsMonitorSource, /stillBlocked := func\(\) bool \{[\s\S]*ctx\.Err\(\) != nil/, "Windows shutdown must cancel an in-progress monitor before it force-closes another app");
assert.match(windowsUISource, /id="runtime-warning"[\s\S]*runtime\.startupWarning[\s\S]*runtime\.lastError/, "Windows control page must show startup and monitor failures");

const macNoticeImplementation = macSource.match(/- \(void\)showApplicationNoticeTitle:[\s\S]*?\n}\n\n- \(void\)showBlockedApplicationNotice:/)?.[0] || "";
assert.ok(macNoticeImplementation, "Mac source must include its blocked-app notice implementation");
assert.ok(
  macNoticeImplementation.indexOf("self.blockedNoticeVisible || self.window.attachedSheet") < macNoticeImplementation.indexOf("makeKeyAndOrderFront"),
  "Mac must suppress a repeated blocked-app alert before reactivating the app window"
);

const macInstructions = readFileSync(join(projectRoot, "mac-blocker/Resources/INSTALL.txt"), "utf8");
const windowsInstructions = readFileSync(join(projectRoot, "windows-blocker/packaging/START HERE.txt"), "utf8");
assert.match(macInstructions, /PIN protects only the app's normal controls[\s\S]*not tamper-proof/i, "Mac instructions must state the actual current-user PIN boundary");
assert.match(windowsInstructions, /normal in-app controls[\s\S]*PIN[\s\S]*same[\s\S]*signed-in Windows user[\s\S]*without/i, "Windows instructions must state the actual current-user PIN boundary");

verifyOuterChecksums(join(projectRoot, "mac-blocker/dist/SHA256SUMS.txt"), ["KiddoSproutBlocker-macOS.zip"]);
verifyOuterChecksums(join(projectRoot, "windows-blocker/dist/SHA256SUMS.txt"), [
  "KiddoSproutBlocker-Windows-x64.zip",
  "KiddoSproutBlocker-Windows-arm64.zip"
]);

assert.equal(existsSync(join(projectRoot, "mac-blocker/dist/KiddoSproutBlocker-macOS.pkg")), false, "an unsigned stray Mac installer must not remain in dist");
assert.equal(existsSync(join(projectRoot, "windows-blocker/kiddosprout-blocker.exe")), false, "an unlabelled Windows executable must not remain at source root");
const dockerfile = readFileSync(join(projectRoot, "Dockerfile.blocker"), "utf8");
assert.equal(/COPY\s+windows-blocker\/\s/i.test(dockerfile), false, "Docker must never copy the whole Windows blocker source directory");
assert.equal(dockerfile.includes("windows-blocker/kiddosprout-blocker.exe"), false, "Docker must never serve the stray source-root executable");
assert.equal(/chown[^\n]*\/app\/downloads/.test(dockerfile), false, "Docker downloads should remain root-owned and read-only to the API user");

console.log("Browser, Mac, and Windows blocker package validation passed.");
