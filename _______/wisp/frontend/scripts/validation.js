export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value) {
  const digits = value.replace(/[\s()+-]/g, "");
  return /^\d{7,15}$/.test(digits);
}

export function isValidPassword(value) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);
}

export function bindField(inputEl, errorEl, validatorFn) {
  function run() {
    const message = validatorFn(inputEl.value);
    if (message) {
      inputEl.setAttribute("aria-invalid", "true");
      errorEl.textContent = message;
      errorEl.classList.add("is-visible");
    } else {
      inputEl.removeAttribute("aria-invalid");
      errorEl.textContent = "";
      errorEl.classList.remove("is-visible");
    }
    return !message;
  }
  inputEl.addEventListener("blur", run);
  inputEl.addEventListener("input", () => {
    if (inputEl.getAttribute("aria-invalid") === "true") run();
  });
  return run;
}

export function showBanner(bannerEl, message, type = "error") {
  bannerEl.textContent = message;
  bannerEl.className = `form-banner is-visible ${type}`;
}
export function hideBanner(bannerEl) {
  bannerEl.classList.remove("is-visible");
}
export function setLoading(buttonEl, isLoading, loadingText, defaultText) {
  buttonEl.disabled = isLoading;
  buttonEl.textContent = isLoading ? loadingText : defaultText;
}
export function wireVisibilityToggle(buttonEl, inputEl) {
  buttonEl.addEventListener("click", () => {
    const isHidden = inputEl.type === "password";
    inputEl.type = isHidden ? "text" : "password";
    buttonEl.textContent = isHidden ? "Hide" : "Show";
  });
}
