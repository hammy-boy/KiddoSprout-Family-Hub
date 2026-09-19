import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const moduleSource = await readFile(new URL("../passcode-security.js", import.meta.url), "utf8");
const mainSource = await readFile(new URL("../js.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../index.html", import.meta.url), "utf8");

function loadPasscodeApi(cryptoApi = webcrypto) {
  const context = vm.createContext({
    TextEncoder,
    Uint8Array,
    window: {
      crypto: cryptoApi,
      btoa(value) {
        return Buffer.from(value, "binary").toString("base64");
      },
      atob(value) {
        return Buffer.from(value, "base64").toString("binary");
      }
    }
  });
  new vm.Script(moduleSource, { filename: "passcode-security.js" }).runInContext(context);
  return context.window.KiddoSproutPasscode;
}

const passcodes = loadPasscodeApi();
const first = await passcodes.create("4321");
const second = await passcodes.create("4321");

assert.equal(first.version, 1);
assert.equal(first.algorithm, "PBKDF2-SHA-256");
assert.equal(first.iterations, 310000);
assert.equal(passcodes.isRecord(first), true);
assert.equal(await passcodes.verify("4321", first), true);
assert.equal(await passcodes.verify("4322", first), false);
assert.equal(await passcodes.verify("not-digits", first), false);
assert.notEqual(first.salt, second.salt, "each PIN record must use a new random salt");
assert.equal(JSON.stringify(first).includes("4321"), false, "the readable PIN must not be stored in its record");

assert.equal(passcodes.isRecord({ ...first, iterations: 1 }), false);
assert.equal(passcodes.isRecord({ ...first, iterations: 1000001 }), false);
assert.equal(passcodes.isRecord({ ...first, digest: "not-base64" }), false);
assert.equal(await passcodes.verify("4321", { ...first, algorithm: "SHA-1" }), false);
await assert.rejects(passcodes.create("12"), /4–8 digit/);
await assert.rejects(passcodes.create("abcd"), /4–8 digit/);

const unavailable = loadPasscodeApi({});
await assert.rejects(unavailable.create("4321"), /not supported/);

assert.match(mainSource, /parentPasscodeRecord/);
assert.match(mainSource, /parentPasscodeMigrationPromise = migrateLegacyParentPasscode\(\)/);
assert.match(mainSource, /normalized\.parentPasscode = \/\^\\d\{4,8\}\$\//,
  "a valid legacy PIN must remain in memory until its one-way verifier is created");
assert.match(mainSource, /removeBrowserStorage\(window\.localStorage, FAMILY_STATE_KEY\)/,
  "the old readable family state must be removed after protected migration");
assert.match(mainSource, /const migration = await familyStateApi\.migrate\(state, \{ expectedOwnerId: ownerId \}\)/,
  "the owner migration must upload the cleaned state containing the one-way PIN verifier");
assert.doesNotMatch(mainSource, /familyStateApi\.migrate\(legacyLocalFamilyState\)/,
  "the original readable legacy object must never be uploaded");
assert.match(mainSource, /async function unlockParent\(\)/);
assert.match(mainSource, /async function unlockAchievementControls\(\)/);
assert.match(mainSource, /await verifyParentPasscode\(achievementPasscode\.value\)/);
assert.match(mainSource, /state\.parentPasscodeRecord = passcodeRecord;\s*state\.parentPasscode = "";/);
assert.match(mainSource, /if \(!await saveState\(\)\) throw new Error\("The upgraded PIN could not be saved\."\);/);
assert.match(mainSource, /Email confirmed, but secure family storage could not save the new PIN/);
assert.doesNotMatch(mainSource, /state\.parentPasscode = (?:passcode|newPasscode|nextPasscode);/);
assert.doesNotMatch(mainSource, /currentParentPasscode/);
assert.match(htmlSource, /passcode-security\.js\?v=1/);
assert.match(htmlSource, /placeholder="Enter a new 4–8 digit PIN"/);

console.log("Passcode security tests passed.");
