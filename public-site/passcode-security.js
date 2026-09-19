(function () {
  "use strict";

  if (window.KiddoSproutPasscode) return;

  const VERSION = 1;
  const ITERATIONS = 310000;
  const MIN_ITERATIONS = 210000;
  const MAX_ITERATIONS = 1000000;
  const SALT_BYTES = 16;
  const DIGEST_BYTES = 32;

  function requireCrypto() {
    if (!window.crypto?.subtle || typeof window.crypto.getRandomValues !== "function") {
      throw new Error("Secure PIN storage is not supported in this browser.");
    }
    return window.crypto;
  }

  function encodeBase64(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return window.btoa(binary);
  }

  function decodeBase64(value, expectedLength) {
    const text = String(value || "");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return null;
    try {
      const binary = window.atob(text);
      if (binary.length !== expectedLength) return null;
      return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } catch (error) {
      return null;
    }
  }

  function normalizeRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const version = Number(value.version);
    const iterations = Number(value.iterations);
    const salt = decodeBase64(value.salt, SALT_BYTES);
    const digest = decodeBase64(value.digest, DIGEST_BYTES);
    if (version !== VERSION
        || value.algorithm !== "PBKDF2-SHA-256"
        || !Number.isSafeInteger(iterations)
        || iterations < MIN_ITERATIONS
        || iterations > MAX_ITERATIONS
        || !salt
        || !digest) {
      return null;
    }
    return { version, algorithm: "PBKDF2-SHA-256", iterations, salt, digest };
  }

  async function derive(pin, salt, iterations) {
    const cryptoApi = requireCrypto();
    const key = await cryptoApi.subtle.importKey(
      "raw",
      new TextEncoder().encode(pin),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await cryptoApi.subtle.deriveBits({
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations
    }, key, DIGEST_BYTES * 8);
    return new Uint8Array(bits);
  }

  async function create(pin) {
    const normalizedPin = String(pin || "");
    if (!/^\d{4,8}$/.test(normalizedPin)) {
      throw new Error("Use a 4–8 digit parent PIN.");
    }
    const salt = requireCrypto().getRandomValues(new Uint8Array(SALT_BYTES));
    const digest = await derive(normalizedPin, salt, ITERATIONS);
    return {
      version: VERSION,
      algorithm: "PBKDF2-SHA-256",
      iterations: ITERATIONS,
      salt: encodeBase64(salt),
      digest: encodeBase64(digest)
    };
  }

  async function verify(pin, value) {
    const record = normalizeRecord(value);
    if (!record || !/^\d{4,8}$/.test(String(pin || ""))) return false;
    const candidate = await derive(String(pin), record.salt, record.iterations);
    let difference = 0;
    for (let index = 0; index < DIGEST_BYTES; index += 1) {
      difference |= candidate[index] ^ record.digest[index];
    }
    return difference === 0;
  }

  function isRecord(value) {
    return normalizeRecord(value) !== null;
  }

  window.KiddoSproutPasscode = Object.freeze({ create, verify, isRecord });
}());
