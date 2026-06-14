    const navButtons = document.querySelectorAll("[data-jump]");
    const tabButtons = document.querySelectorAll("[data-filter]");
    const hubCards = document.querySelectorAll(".hub-card");
    const toast = document.querySelector("#toast");
    const burstLayer = document.querySelector("#burstLayer");
    const appModal = document.querySelector("#appModal");
    const appTitle = document.querySelector("#appTitle");
    const appSubtitle = document.querySelector("#appSubtitle");
    const appBody = document.querySelector("#appBody");
    const parentGate = document.querySelector("#parentGate");
    const lockBox = document.querySelector(".lock-box");
    const passcodeInput = document.querySelector("#passcodeInput");
    const viewPassword = document.querySelector("#viewPassword");
    const passcodeSetting = document.querySelector("#passcodeSetting");
    const viewSettingPassword = document.querySelector("#viewSettingPassword");
    const passcodeSettingStatus = document.querySelector("#passcodeSettingStatus");
    const signupFamily = document.querySelector("#signupFamily");
    const signupParent = document.querySelector("#signupParent");
    const signupEmail = document.querySelector("#signupEmail");
    const signupPasscode = document.querySelector("#signupPasscode");
    const viewSignupPassword = document.querySelector("#viewSignupPassword");
    const signupStatus = document.querySelector("#signupStatus");
    const forgotPanel = document.querySelector("#forgotPanel");
    const recoveryEmail = document.querySelector("#recoveryEmail");
    const recoveryCode = document.querySelector("#recoveryCode");
    const recoveryPasscode = document.querySelector("#recoveryPasscode");
    const viewRecoveryPassword = document.querySelector("#viewRecoveryPassword");
    const rulesInput = document.querySelector("#rulesInput");
    const choresInput = document.querySelector("#choresInput");
    const rewardsInput = document.querySelector("#rewardsInput");
    const focusInput = document.querySelector("#focusInput");
    const newChildName = document.querySelector("#newChildName");
    const newChildDob = document.querySelector("#newChildDob");
    const newChildDevice = document.querySelector("#newChildDevice");
    const newChildAvatarIcon = document.querySelector("#newChildAvatarIcon");
    const newChildAvatarColor = document.querySelector("#newChildAvatarColor");
    const newChildSchoolYear = document.querySelector("#newChildSchoolYear");
    const newChildEmergencyContact = document.querySelector("#newChildEmergencyContact");
    const newChildCareNote = document.querySelector("#newChildCareNote");
    const newChildWarning = document.querySelector("#newChildWarning");
    const removeChildButton = document.querySelector("#removeChild");
    const removeChildStatus = document.querySelector("#removeChildStatus");
    const editChildName = document.querySelector("#editChildName");
    const editChildDob = document.querySelector("#editChildDob");
    const editChildDevice = document.querySelector("#editChildDevice");
    const editChildAvatarIcon = document.querySelector("#editChildAvatarIcon");
    const editChildAvatarColor = document.querySelector("#editChildAvatarColor");
    const editChildSchoolYear = document.querySelector("#editChildSchoolYear");
    const editChildEmergencyContact = document.querySelector("#editChildEmergencyContact");
    const editChildCareNote = document.querySelector("#editChildCareNote");
    const editChildWarning = document.querySelector("#editChildWarning");
    const kidAvatarIcon = document.querySelector("#kidAvatarIcon");
    const kidAvatarColor = document.querySelector("#kidAvatarColor");
    const kidCostume = document.querySelector("#kidCostume");
    const kidAvatarPreview = document.querySelector("#kidAvatarPreview");
    const kidAvatarName = document.querySelector("#kidAvatarName");
    const kidCostumePreview = document.querySelector("#kidCostumePreview");
    const passcodeStatus = document.querySelector("#passcodeStatus");
    const unlockParentButton = document.querySelector("#unlockParent");
    const reportColors = {
      Explorer: "#147d7f",
      Stories: "#8c5aa8",
      Movement: "#df604a",
      Money: "#5d9b3a",
      Games: "#f1b43f"
    };
    const requestNames = [
      ["Galaxy Game", "G", "Game app"],
      ["Clip Studio", "C", "Video app"],
      ["Puzzle Arcade", "P", "Game app"],
      ["Stream Box", "S", "Video app"],
      ["Sketch Pad", "S", "Creative app"]
    ];
    const todayTasks = [
      { id: "money", title: "Chore Check", detail: "Add allowance and review one saving goal.", report: "Money", minutes: 5 },
      { id: "explore", title: "Nature Quest", detail: "Open Explorer Lab and finish one fact card.", report: "Explorer", minutes: 8 },
      { id: "move", title: "Move Reset", detail: "Complete one movement break before games.", report: "Movement", minutes: 5 },
      { id: "story", title: "Read Aloud", detail: "Read one Story Theater page before bedtime.", report: "Stories", minutes: 10 }
    ];
    const dailyGoalItems = [
      { id: "learn", title: "Learn", detail: "Open a learning hub", report: "Explorer", minutes: 5 },
      { id: "move", title: "Move", detail: "Take one active break", report: "Movement", minutes: 5 },
      { id: "read", title: "Read", detail: "Log reading time", report: "Stories", minutes: 5 },
      { id: "kind", title: "Kind", detail: "Finish a kindness quest", report: "Stories", minutes: 2 },
      { id: "safe", title: "Safe", detail: "Review a family rule", report: "Explorer", minutes: 2 }
    ];
    const kindnessPrompts = [
      "Say one kind thing to someone at home.",
      "Help tidy one shared space for two minutes.",
      "Ask someone how their day is going and listen.",
      "Draw or write a thank-you note.",
      "Let someone else choose the next family activity.",
      "Teach someone one fun fact you learned today.",
      "Put away one thing without being asked.",
      "Use calm words to solve a tiny problem."
    ];
    const DEFAULT_STATE = {
      "activeChild": "ava",
      "familyName": "Safe Sprout Family",
      "parentName": "Parent",
      "parentEmail": "",
      "parentPasscode": "4321",
      "wellbeingGoals": {
            "water": 4,
            "eyeBreaks": 3
      },
      "safetyAlerts": [],
      "moodCheckins": [],
      "problemReports": [],
      "scanHistory": [],
      "trustedContacts": [
            "Parent or guardian",
            "Teacher",
            "School office"
      ],
      "familyRules": [
            "Ask before downloading a new app.",
            "Use kind words in chats and comments.",
            "Take a movement break after long screen time."
      ],
      "chores": [
            {
                  "title": "Tidy desk",
                  "reward": 2
            },
            {
                  "title": "Read 10 minutes",
                  "reward": 3
            },
            {
                  "title": "Pack school bag",
                  "reward": 2
            }
      ],
      "rewards": [
            {
                  "title": "Choose movie night",
                  "cost": 8
            },
            {
                  "title": "Extra story",
                  "cost": 5
            },
            {
                  "title": "Small toy fund",
                  "cost": 12
            }
      ],
      "focusGoal": "Read or learn for 15 minutes",
      "children": {
            "ava": {
                  "name": "Ava",
                  "device": "tablet",
                  "dailyLimit": 120,
                  "usedToday": 24,
                  "pending": 1,
                  "blockedHits": 42,
                  "bedtime": false,
                  "currentRequest": [
                        "Galaxy Game",
                        "Game app requested from Ava's tablet",
                        "G"
                  ],
                  "report": {
                        "Explorer": 184,
                        "Stories": 148,
                        "Movement": 116,
                        "Money": 72,
                        "Games": 48
                  }
            },
            "noah": {
                  "name": "Noah",
                  "device": "phone",
                  "dailyLimit": 90,
                  "usedToday": 51,
                  "pending": 2,
                  "blockedHits": 18,
                  "bedtime": true,
                  "currentRequest": [
                        "Clip Studio",
                        "Video app requested from Noah's phone",
                        "C"
                  ],
                  "report": {
                        "Explorer": 92,
                        "Stories": 64,
                        "Movement": 143,
                        "Money": 35,
                        "Games": 112
                  }
            },
            "mia": {
                  "name": "Mia",
                  "device": "tablet",
                  "dailyLimit": 150,
                  "usedToday": 38,
                  "pending": 0,
                  "blockedHits": 27,
                  "bedtime": false,
                  "currentRequest": [
                        "Puzzle Arcade",
                        "Game app requested from Mia's tablet",
                        "P"
                  ],
                  "report": {
                        "Explorer": 132,
                        "Stories": 201,
                        "Movement": 87,
                        "Money": 44,
                        "Games": 66
                  }
            }
      }
};

    let state = null;
    let requestIndex = 0;
    let saveTimer = null;
    let moveTimer = null;
    let moveSeconds = 30;
    let focusTimer = null;
    let focusSeconds = 900;
    let closeTimer = null;
    let viewMode = (window.location.hash || "#child").slice(1);
    if (!["child", "parent", "signup"].includes(viewMode)) {
      viewMode = "child";
    }
    let parentUnlocked = window.sessionStorage.getItem("parentUnlocked") === "true";
    let failedPasscodeAttempts = Number(window.sessionStorage.getItem("failedPasscodeAttempts") || "0");
    let lockoutUntil = Number(window.sessionStorage.getItem("lockoutUntil") || "0");
    let lockoutTimer = null;
    let oneTimeCode = "";
    let pendingRemoveChildId = "";

    function currentChild() {
      state.children ??= {};
      if (!Object.keys(state.children).length) {
        state.children.ava = createDefaultChild("Ava", "", "", "Tablet", "star", "#147d7f", "Explorer", "", "", "");
        state.activeChild = "ava";
      }
      if (!state.children[state.activeChild]) {
        state.activeChild = Object.keys(state.children)[0];
      }
      const child = state.children[state.activeChild];
      ensureChildAppState(child);
      return child;
    }

    function currentParentPasscode() {
      return state.parentPasscode || "4321";
    }

    function formatMinutes(minutes) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (!hours) {
        return mins + "m";
      }
      return mins ? hours + "h " + mins + "m" : hours + "h";
    }

    function formatClock(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = String(seconds % 60).padStart(2, "0");
      return mins + ":" + secs;
    }

    function decorateRange(input) {
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const value = Number(input.value || min);
      const progress = ((value - min) / (max - min)) * 100;
      input.style.setProperty("--range-progress", progress + "%");
    }

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      window.clearTimeout(showToast.timer);
      showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
    }

    function celebrate(x = window.innerWidth / 2, y = window.innerHeight * 0.38) {
      const colors = ["#147d7f", "#5d9b3a", "#f1b43f", "#df604a", "#346f9f"];
      for (let index = 0; index < 18; index += 1) {
        const piece = document.createElement("span");
        const angle = (Math.PI * 2 * index) / 18;
        const distance = 72 + ((index % 4) * 14);
        piece.className = "burst-piece";
        piece.style.setProperty("--x", x + "px");
        piece.style.setProperty("--y", y + "px");
        piece.style.setProperty("--tx", (Math.cos(angle) * distance) + "px");
        piece.style.setProperty("--ty", (Math.sin(angle) * distance) + "px");
        piece.style.setProperty("--c", colors[index % colors.length]);
        burstLayer.appendChild(piece);
        window.setTimeout(() => piece.remove(), 820);
      }
    }

    function celebrateElement(element) {
      const box = element.getBoundingClientRect();
      celebrate(box.left + (box.width / 2), box.top + (box.height / 2));
    }

    function addButtonRipple(event) {
      const button = event.target.closest("button");
      if (!button || button.disabled) {
        return;
      }
      const box = button.getBoundingClientRect();
      const size = Math.max(box.width, box.height);
      const ripple = document.createElement("span");
      ripple.className = "tap-ripple";
      ripple.style.setProperty("--rx", (event.clientX - box.left) + "px");
      ripple.style.setProperty("--ry", (event.clientY - box.top) + "px");
      ripple.style.setProperty("--rs", size + "px");
      button.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 620);
    }

    async function saveState(showMessage = false) {
      window.localStorage.setItem("safesproutState", JSON.stringify(state));
      if (showMessage) {
        showToast("Family settings saved.");
      }
    }

    function queueSave() {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => saveState(), 450);
    }

    function updateRoute(mode) {
      const nextHash = "#" + mode;
      if (window.location.hash !== nextHash) {
        window.history.pushState({ mode }, "", nextHash);
      }
    }

    function showParentGate() {
      parentGate.classList.add("open");
      parentGate.setAttribute("aria-hidden", "false");
      lockBox.classList.remove("success", "slide-away");
      passcodeInput.value = "";
      passcodeInput.type = "password";
      viewPassword.checked = false;
      forgotPanel.style.display = "none";
      passcodeStatus.textContent = "";
      updatePasscodeLockout();
      checkServerLockout();
      passcodeInput.focus();
    }

    function hideParentGate() {
      parentGate.classList.remove("open");
      parentGate.setAttribute("aria-hidden", "true");
    }

    function setMode(mode, options = {}) {
      if (mode === "parent" && !parentUnlocked && !options.unlocked) {
        updateRoute("parent");
        showParentGate();
        return;
      }
      if (mode === "child" || mode === "signup") {
        parentUnlocked = false;
        window.sessionStorage.removeItem("parentUnlocked");
      }
      viewMode = mode;
      updateRoute(mode);
      document.body.classList.toggle("mode-child", mode === "child");
      document.body.classList.toggle("mode-signup", mode === "signup");
      document.querySelector("#modeToggle").textContent = mode === "child" ? "Parent Site" : "Child Site";
      document.querySelector("#siteTitle").textContent = mode === "child" ? "Safe Sprout Child Site" : mode === "signup" ? "Safe Sprout Sign Up" : "Safe Sprout Parent Dashboard";
      document.querySelector("#heroTitle").textContent = mode === "child" ? "Your safe space for today." : mode === "signup" ? "Create your family hub." : "One calm command center for kids online.";
      hideParentGate();
      closeApp();
      if (state) {
        render();
      }
      if (!options.quiet) {
        showToast(mode === "child" ? "Child Site opened." : mode === "signup" ? "Sign up opened." : "Parent Dashboard opened.");
      }
    }

    function unlockParent() {
      if (Date.now() < lockoutUntil) {
        updatePasscodeLockout();
        return;
      }

      if (passcodeInput.value === currentParentPasscode()) {
        parentUnlocked = true;
        failedPasscodeAttempts = 0;
        lockoutUntil = 0;
        window.sessionStorage.setItem("parentUnlocked", "true");
        window.localStorage.removeItem("safeSproutLockoutUntil");
        window.localStorage.removeItem("safeSproutFailedAttempts");
        window.sessionStorage.removeItem("failedPasscodeAttempts");
        window.sessionStorage.removeItem("lockoutUntil");
        showPasscodeSuccess("Welcome");
        window.setTimeout(() => lockBox.classList.add("slide-away"), 520);
        window.setTimeout(() => setMode("parent", { unlocked: true }), 1780);
        return;
      }

      failedPasscodeAttempts = Number(window.localStorage.getItem("safeSproutFailedAttempts") || "0") + 1;
      window.localStorage.setItem("safeSproutFailedAttempts", String(failedPasscodeAttempts));
      window.sessionStorage.setItem("failedPasscodeAttempts", String(failedPasscodeAttempts));
      passcodeInput.value = "";
      shakePasscodeBox();

      if (failedPasscodeAttempts >= 3) {
        lockoutUntil = Date.now() + 30000;
        window.localStorage.setItem("safeSproutLockoutUntil", String(lockoutUntil));
        window.sessionStorage.setItem("lockoutUntil", String(lockoutUntil));
        updatePasscodeLockout();
        showToast("Too many attempts. Try again in 30 seconds.");
        return;
      }

      unlockParentButton.disabled = false;
      const triesLeft = 3 - failedPasscodeAttempts;
      passcodeStatus.textContent = "Incorrect password. " + triesLeft + " tries left.";
      showToast(passcodeStatus.textContent);
    }

    function checkServerLockout() {
      const sharedLockout = Number(window.localStorage.getItem("safeSproutLockoutUntil") || "0");
      if (sharedLockout > Date.now()) {
        lockoutUntil = sharedLockout;
        window.sessionStorage.setItem("lockoutUntil", String(lockoutUntil));
        updatePasscodeLockout();
      }
    }

    function shakePasscodeBox() {
      lockBox.classList.remove("shake");
      void lockBox.offsetWidth;
      lockBox.classList.add("shake");
    }

    function showPasscodeSuccess(message) {
      passcodeStatus.textContent = message;
      passcodeStatus.classList.add("success");
      lockBox.classList.add("success");
      window.setTimeout(() => {
        passcodeStatus.classList.remove("success");
        lockBox.classList.remove("success", "slide-away");
      }, 900);
    }

    function saveParentPasscode() {
      const nextPasscode = passcodeSetting.value.trim();
      if (!nextPasscode) {
        passcodeSettingStatus.textContent = "Required";
        showToast("Passcode cannot be empty.");
        return;
      }
      state.parentPasscode = nextPasscode;
      passcodeSettingStatus.textContent = "Saved";
      passcodeSettingStatus.style.color = "#147d46";
      queueSave();
      showToast("Parent passcode updated.");
      window.setTimeout(() => {
        passcodeSettingStatus.style.color = "";
      }, 900);
    }

    function createAccount() {
      const familyName = signupFamily.value.trim();
      const parentName = signupParent.value.trim();
      const parentEmail = signupEmail.value.trim().toLowerCase();
      const passcode = signupPasscode.value.trim();

      if (!familyName || !parentName || !parentEmail || !passcode) {
        signupStatus.textContent = "Complete every field";
        showToast("Complete every sign up field.");
        return;
      }

      state.familyName = familyName;
      state.parentName = parentName;
      state.parentEmail = parentEmail;
      state.parentPasscode = passcode;
      signupStatus.textContent = "Welcome";
      signupStatus.classList.add("success");
      parentUnlocked = true;
      window.sessionStorage.setItem("parentUnlocked", "true");
      saveState();
      window.setTimeout(() => {
        signupStatus.classList.remove("success");
        setMode("parent", { unlocked: true });
      }, 650);
    }

    function sendRecoveryCode() {
      const email = recoveryEmail.value.trim().toLowerCase();
      const savedEmail = (state.parentEmail || "").toLowerCase();

      if (!savedEmail || email !== savedEmail) {
        passcodeStatus.textContent = "Email not found";
        shakePasscodeBox();
        showToast("Email not found");
        return;
      }

      oneTimeCode = String(Math.floor(100000 + Math.random() * 900000));
      passcodeStatus.textContent = "One-time code: " + oneTimeCode;
      passcodeStatus.classList.add("success");
      window.setTimeout(() => passcodeStatus.classList.remove("success"), 1200);
    }

    function resetPasscodeWithCode() {
      const newPasscode = recoveryPasscode.value.trim();

      if (!oneTimeCode || recoveryCode.value.trim() !== oneTimeCode) {
        passcodeStatus.textContent = "Incorrect one-time code";
        shakePasscodeBox();
        showToast("Incorrect one-time code");
        return;
      }

      if (!newPasscode) {
        passcodeStatus.textContent = "Enter a new password";
        showToast("Enter a new password");
        return;
      }

      state.parentPasscode = newPasscode;
      oneTimeCode = "";
      failedPasscodeAttempts = 0;
      lockoutUntil = 0;
      window.sessionStorage.removeItem("failedPasscodeAttempts");
      window.sessionStorage.removeItem("lockoutUntil");
      saveState();
      passcodeInput.value = "";
      recoveryCode.value = "";
      recoveryPasscode.value = "";
      showPasscodeSuccess("Password reset");
      showToast("Parent passcode reset.");
    }

    function updatePasscodeLockout() {
      window.clearInterval(lockoutTimer);
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);

      if (remaining <= 0) {
        lockoutUntil = 0;
        failedPasscodeAttempts = 0;
        window.sessionStorage.removeItem("lockoutUntil");
        window.sessionStorage.removeItem("failedPasscodeAttempts");
        passcodeInput.disabled = false;
        unlockParentButton.disabled = false;
        passcodeStatus.textContent = "";
        return;
      }

      passcodeInput.disabled = true;
      unlockParentButton.disabled = true;
      passcodeStatus.textContent = "Too many attempts. Try again in " + remaining + " seconds.";
      lockoutTimer = window.setInterval(updatePasscodeLockout, 1000);
    }

    function ensureChildAppState(child) {
      state.wellbeingGoals ??= { water: 4, eyeBreaks: 3 };
      state.wellbeingGoals.water = Math.max(1, Number(state.wellbeingGoals.water || 4));
      state.wellbeingGoals.eyeBreaks = Math.max(1, Number(state.wellbeingGoals.eyeBreaks || 3));
      state.problemReports ??= [];
      state.scanHistory ??= [];
      state.trustedContacts ??= ["Parent or guardian", "Teacher", "School office"];
      child.name ??= "Child";
      child.device ??= "Tablet";
      child.dailyLimit = Number(child.dailyLimit ?? 120);
      child.usedToday = Number(child.usedToday ?? 0);
      child.pending = Number(child.pending ?? 0);
      child.blockedHits = Number(child.blockedHits ?? 0);
      child.bedtime ??= false;
      child.currentRequest ??= ["No request", "No pending request", "-"];
      child.report ??= {};
      child.report.Explorer ??= 0;
      child.report.Stories ??= 0;
      child.report.Movement ??= 0;
      child.report.Money ??= 0;
      child.report.Games ??= 0;
      child.moneyBalance ??= 18;
      child.savingsGoal ??= 40;
      child.weeklyAllowance ??= 5;
      child.savingsGoalName ??= "New Football";
      child.spendingHistory ??= [];
      child.streaks ??= { reading: 0, homework: 0, exercise: 0, chores: 0 };
      child.streaks.reading ??= 0;
      child.streaks.homework ??= 0;
      child.streaks.exercise ??= 0;
      child.streaks.chores ??= 0;
      child.homeworkMode ??= false;
      child.creatorQueue ??= [];
      child.explorerFact ??= 0;
      child.storyPage ??= 0;
      child.completedTasks ??= [];
      child.avatarIcon ??= "star";
      child.avatarColor ??= "#147d7f";
      child.costume ??= "Explorer";
      child.dailyWins ??= {};
      child.kindnessPoints ??= 0;
      child.kindnessPrompt ??= 0;
      child.readingLog ??= [];
      child.waterCount ??= 0;
      child.eyeBreaks ??= 0;
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character]));
    }

    function makeChildId(name) {
      const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "child";
      let id = base;
      let count = 2;
      while (state.children[id]) {
        id = base + "-" + count;
        count += 1;
      }
      return id;
    }

    function calculateAge(dateOfBirth) {
      if (!dateOfBirth) {
        return "";
      }
      const birthday = new Date(dateOfBirth + "T00:00:00");
      if (Number.isNaN(birthday.getTime())) {
        return "";
      }
      const today = new Date();
      let age = today.getFullYear() - birthday.getFullYear();
      const monthDelta = today.getMonth() - birthday.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthday.getDate())) {
        age -= 1;
      }
      return Math.max(0, age);
    }

    function avatarSymbol(icon, fallbackName) {
      const symbols = {
        star: "*",
        bolt: "!",
        book: "B",
        rocket: "^",
        heart: "+",
        smile: ":)"
      };
      return symbols[icon] || (fallbackName || "?").slice(0, 1).toUpperCase();
    }

    function safeAvatarColor(color) {
      return /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#147d7f";
    }

    function createDefaultChild(name, dateOfBirth, age, device, avatarIcon, avatarColor, costume, schoolYear, emergencyContact, careNote) {
      return {
        name,
        dateOfBirth,
        age,
        device,
        avatarIcon,
        avatarColor,
        costume,
        schoolYear,
        emergencyContact,
        careNote,
        dailyLimit: 120,
        usedToday: 0,
        pending: 0,
        blockedHits: 0,
        bedtime: false,
        currentRequest: ["No request", "No pending request", "-"],
        report: {
          Explorer: 0,
          Stories: 0,
          Movement: 0,
          Money: 0,
          Games: 0
        },
        moneyBalance: 18,
        savingsGoal: 40,
        weeklyAllowance: 5,
        savingsGoalName: "New Football",
        spendingHistory: [],
        streaks: {
          reading: 0,
          homework: 0,
          exercise: 0,
          chores: 0
        },
        homeworkMode: false,
        creatorQueue: [],
        explorerFact: 0,
        storyPage: 0,
        completedTasks: [],
        dailyWins: {},
        kindnessPoints: 0,
        kindnessPrompt: 0,
        readingLog: [],
        waterCount: 0,
        eyeBreaks: 0
      };
    }

    function setUnderFiveWarning(target, age) {
      if (age !== "" && age < 5) {
        target.textContent = "Warning: for children under 5, this app may not be needed. Simple supervised screen time is usually better.";
        return;
      }
      target.textContent = "";
    }

    function updateNewChildWarning() {
      const age = calculateAge(newChildDob.value);
      setUnderFiveWarning(newChildWarning, age);
    }

    function updateEditChildWarning() {
      const age = calculateAge(editChildDob.value);
      setUnderFiveWarning(editChildWarning, age);
    }

    function renderChildEditor() {
      const child = currentChild();
      const device = child.device || "Tablet";
      const normalizedDevice = device.charAt(0).toUpperCase() + device.slice(1);
      editChildName.value = child.name || "";
      editChildDob.value = child.dateOfBirth || "";
      editChildDevice.value = ["Tablet", "Phone", "Laptop", "Shared device"].includes(device) ? device : normalizedDevice;
      if (!editChildDevice.value) {
        editChildDevice.value = "Tablet";
      }
      editChildAvatarIcon.value = child.avatarIcon || "star";
      editChildAvatarColor.value = safeAvatarColor(child.avatarColor);
      child.costume ??= "Explorer";
      editChildSchoolYear.value = child.schoolYear || "";
      editChildEmergencyContact.value = child.emergencyContact || "";
      editChildCareNote.value = child.careNote || "";
      updateEditChildWarning();
    }

    function saveSelectedChildProfile() {
      const child = currentChild();
      const name = editChildName.value.trim();
      if (!name) {
        showToast("Child name cannot be empty.");
        editChildName.focus();
        return;
      }
      child.name = name;
      child.dateOfBirth = editChildDob.value;
      child.age = calculateAge(child.dateOfBirth);
      child.device = editChildDevice.value;
      child.avatarIcon = editChildAvatarIcon.value;
      child.avatarColor = safeAvatarColor(editChildAvatarColor.value);
      child.costume ??= "Explorer";
      child.schoolYear = editChildSchoolYear.value;
      child.emergencyContact = editChildEmergencyContact.value.trim();
      child.careNote = editChildCareNote.value.trim();
      render();
      queueSave();
      showToast(child.name + "'s details saved.");
    }

    function addChildProfile() {
      const name = newChildName.value.trim();
      const dateOfBirth = newChildDob.value;
      const age = calculateAge(dateOfBirth);
      const device = newChildDevice.value;
      const avatarIcon = newChildAvatarIcon.value;
      const avatarColor = safeAvatarColor(newChildAvatarColor.value);
      const costume = "Explorer";
      const schoolYear = newChildSchoolYear.value;
      const emergencyContact = newChildEmergencyContact.value.trim();
      const careNote = newChildCareNote.value.trim();
      if (!name) {
        showToast("Enter a child name first.");
        newChildName.focus();
        return;
      }

      const id = makeChildId(name);
      state.children[id] = createDefaultChild(name, dateOfBirth, age, device, avatarIcon, avatarColor, costume, schoolYear, emergencyContact, careNote);
      state.activeChild = id;
      newChildName.value = "";
      newChildDob.value = "";
      newChildDevice.value = "Tablet";
      newChildAvatarIcon.value = "star";
      newChildAvatarColor.value = "#147d7f";
      newChildSchoolYear.value = "";
      newChildEmergencyContact.value = "";
      newChildCareNote.value = "";
      newChildWarning.textContent = "";
      render();
      queueSave();
      showToast(age !== "" && age < 5 ? name + " was added. Under-5 warning noted." : name + " was added.");
    }

    function removeSelectedChild() {
      const childIds = Object.keys(state.children);
      const child = currentChild();
      if (childIds.length <= 1) {
        removeChildStatus.textContent = "You need at least one child profile.";
        showToast("Keep at least one child profile.");
        return;
      }

      if (pendingRemoveChildId !== state.activeChild) {
        pendingRemoveChildId = state.activeChild;
        removeChildStatus.textContent = "Press Remove Selected Child again to delete " + child.name + ".";
        removeChildButton.textContent = "Confirm Remove";
        showToast("Confirm removal for " + child.name + ".");
        return;
      }

      const removedName = child.name;
      delete state.children[state.activeChild];
      state.activeChild = Object.keys(state.children)[0];
      pendingRemoveChildId = "";
      removeChildStatus.textContent = "";
      removeChildButton.textContent = "Remove Selected Child";
      render();
      queueSave();
      showToast(removedName + " was removed.");
    }

    function childAgeSummary(child) {
      if (child.age === undefined || child.age === "") {
        return "";
      }
      return escapeHtml(child.age) + " yrs · ";
    }

    function childSchoolSummary(child) {
      return child.schoolYear ? escapeHtml(child.schoolYear) + " · " : "";
    }

    function addReportMinutes(label, minutes) {
      const child = currentChild();
      child.report[label] = (child.report[label] || 0) + minutes;
      renderControls(child);
      queueSave();
    }

    function renderProfiles() {
      const strip = document.querySelector("#profileStrip");
      if (pendingRemoveChildId !== state.activeChild) {
        pendingRemoveChildId = "";
        removeChildButton.textContent = "Remove Selected Child";
        removeChildStatus.textContent = "";
      }
      renderChildEditor();
      strip.innerHTML = Object.entries(state.children).map(([id, child]) => `
        <button class="profile-btn ${id === state.activeChild ? "active" : ""}" data-child="${id}">
          <span class="avatar" style="background: ${safeAvatarColor(child.avatarColor)};">${escapeHtml(avatarSymbol(child.avatarIcon, child.name))}</span>
          <span>
            <strong>${escapeHtml(child.name)}</strong>
            <span class="small">${escapeHtml(child.device)} · ${childAgeSummary(child)}${childSchoolSummary(child)}${child.pending} pending</span>
          </span>
        </button>
      `).join("");

      strip.querySelectorAll("[data-child]").forEach((button) => {
        button.addEventListener("click", () => {
          state.activeChild = button.dataset.child;
          render();
          queueSave();
          showToast("Switched to " + currentChild().name + "'s profile.");
        });
      });
    }

    function renderReport(child) {
      const values = Object.values(child.report);
      const max = Math.max(...values, 1);
      document.querySelector("#reportRows").innerHTML = Object.entries(child.report).map(([label, minutes]) => {
        const width = Math.max(8, Math.round((minutes / max) * 100));
        const color = reportColors[label] || "#147d7f";
        return `
          <div class="bar-row">
            <span>${label}</span>
            <div class="track"><div class="fill" style="--w: ${width}%; --c: ${color};"></div></div>
            <strong>${minutes}m</strong>
          </div>
        `;
      }).join("");
    }

    function renderSafetyAlerts() {
      const alerts = state.safetyAlerts || [];
      document.querySelector("#safetyAlerts").innerHTML = alerts.length
        ? alerts.map((alert) => `
          <div class="filter-item">
            <span>${alert.child}: ${alert.message}</span>
            <strong>${alert.time}</strong>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No safety alerts</span><strong>Clear</strong></div>`;
    }

    function renderProblemReports() {
      const reports = state.problemReports || [];
      document.querySelector("#problemReports").innerHTML = reports.length
        ? reports.map((report, index) => `
          <div class="problem-report ${report.status === "Reviewed" ? "reviewed" : ""}">
            <div>
              <strong>${escapeHtml(report.child)}: ${escapeHtml(report.type)}</strong>
              <p class="small">${escapeHtml(report.note || "No note added.")}</p>
              <span class="small">${escapeHtml(report.urgency)} · ${escapeHtml(report.time)} · ${escapeHtml(report.status || "New")}</span>
            </div>
            <div class="choice-row">
              <button class="approve" data-review-report="${index}">Reviewed</button>
              <button class="tiny" data-follow-report="${index}">Follow Up</button>
            </div>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No problem reports</span><strong>Clear</strong></div>`;

      document.querySelectorAll("[data-review-report]").forEach((button) => {
        button.addEventListener("click", () => reviewProblemReport(Number(button.dataset.reviewReport)));
      });
      document.querySelectorAll("[data-follow-report]").forEach((button) => {
        button.addEventListener("click", () => followUpProblemReport(Number(button.dataset.followReport)));
      });
    }

    function renderScanHistory() {
      const history = state.scanHistory || [];
      document.querySelector("#scanHistory").innerHTML = history.length
        ? history.slice(0, 6).map((scan) => `
          <div class="filter-item">
            <span>${escapeHtml(scan.label)}</span>
            <strong>${escapeHtml(scan.result)}</strong>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No scans yet</span><strong>Ready</strong></div>`;
    }

    function renderTrustedContacts() {
      const contacts = state.trustedContacts || [];
      const contactList = document.querySelector("#trustedContactsList");
      document.querySelector("#trustedContactsInput").value = contacts.join("\\n");
      contactList.innerHTML = contacts.length
        ? contacts.map((contact) => `<div class="filter-item"><span>${escapeHtml(contact)}</span><strong>Trusted</strong></div>`).join("")
        : `<div class="filter-item"><span>No contacts set</span><strong>Ask</strong></div>`;
    }

    function renderMoodCheckins() {
      const moods = state.moodCheckins || [];
      document.querySelector("#moodCheckins").innerHTML = moods.length
        ? moods.map((mood) => `
          <div class="filter-item">
            <span>${mood.child}: ${mood.mood}</span>
            <strong>${mood.time}</strong>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No mood check-ins</span><strong>Clear</strong></div>`;
    }

    function renderFamilyRules() {
      const rules = state.familyRules || [];
      rulesInput.value = rules.join("\\n");
      document.querySelector("#childRules").innerHTML = rules.length
        ? rules.map((rule) => `<div class="filter-item"><span>${rule}</span><strong>Rule</strong></div>`).join("")
        : `<div class="filter-item"><span>No rules set</span><strong>Open</strong></div>`;
    }

    function renderChores() {
      const chores = state.chores || [];
      choresInput.value = chores.map((chore) => `${chore.title} = ${chore.reward}`).join("\\n");
      document.querySelector("#childChores").innerHTML = chores.length
        ? chores.map((chore, index) => `
          <div class="filter-item">
            <span>${chore.title}</span>
            <button class="tiny" data-chore="${index}">$${chore.reward} Done</button>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No chores set</span><strong>Open</strong></div>`;

      document.querySelectorAll("[data-chore]").forEach((button) => {
        button.addEventListener("click", () => submitChore(Number(button.dataset.chore)));
      });
    }

    function renderRewards() {
      const rewards = state.rewards || [];
      rewardsInput.value = rewards.map((reward) => `${reward.title} = ${reward.cost}`).join("\\n");
      document.querySelector("#childRewards").innerHTML = rewards.length
        ? rewards.map((reward, index) => `
          <div class="filter-item">
            <span>${reward.title}</span>
            <button class="tiny" data-reward="${index}">$${reward.cost} Request</button>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No rewards set</span><strong>Open</strong></div>`;

      document.querySelectorAll("[data-reward]").forEach((button) => {
        button.addEventListener("click", () => requestReward(Number(button.dataset.reward)));
      });
    }

    function renderFocus() {
      focusInput.value = state.focusGoal || "";
      document.querySelector("#childFocusGoal").textContent = state.focusGoal || "Focus for 15 minutes";
      document.querySelector("#focusClock").textContent = formatClock(focusSeconds);
    }

    function updateKidAvatarPreview() {
      const child = currentChild();
      const icon = kidAvatarIcon.value || child.avatarIcon || "star";
      const color = safeAvatarColor(kidAvatarColor.value || child.avatarColor);
      const costume = kidCostume.value || child.costume || "Explorer";
      kidAvatarPreview.textContent = avatarSymbol(icon, child.name);
      kidAvatarPreview.style.background = color;
      kidAvatarName.textContent = child.name + "'s avatar";
      kidCostumePreview.textContent = "Costume: " + costume;
    }

    function renderKidAvatarStudio(child) {
      kidAvatarIcon.value = child.avatarIcon || "star";
      kidAvatarColor.value = safeAvatarColor(child.avatarColor);
      kidCostume.value = child.costume || "Explorer";
      updateKidAvatarPreview();
    }

    function saveKidAvatar() {
      const child = currentChild();
      child.avatarIcon = kidAvatarIcon.value;
      child.avatarColor = safeAvatarColor(kidAvatarColor.value);
      child.costume = kidCostume.value;
      render();
      queueSave();
      showToast(child.name + "'s look was saved.");
      celebrateElement(kidAvatarPreview);
    }

    function childBadges(child) {
      const report = child.report || {};
      const completed = child.completedTasks || [];
      const streaks = child.streaks || {};
      const longestStreak = Math.max(streaks.reading || 0, streaks.homework || 0, streaks.exercise || 0, streaks.chores || 0);
      return [
        {
          mark: "*",
          title: "Creator",
          detail: "Saved an avatar style",
          unlocked: Boolean(child.costume && child.avatarIcon)
        },
        {
          mark: "4",
          title: "Homework Hero",
          detail: "Completed every daily plan card",
          unlocked: todayTasks.every((task) => completed.includes(task.id))
        },
        {
          mark: "E",
          title: "Explorer",
          detail: "Earned 30 Explorer minutes",
          unlocked: (report.Explorer || 0) >= 30
        },
        {
          mark: "R",
          title: "Reading Champion",
          detail: "Earned 30 story minutes",
          unlocked: (report.Stories || 0) >= 30
        },
        {
          mark: "M",
          title: "Active Kid",
          detail: "Earned 20 movement minutes",
          unlocked: (report.Movement || 0) >= 20
        },
        {
          mark: "$",
          title: "Smart Saver",
          detail: "Saved $25 or more",
          unlocked: (child.moneyBalance || 0) >= 25
        },
        {
          mark: "30",
          title: "30-Day Streak Master",
          detail: "Built any 30-day habit streak",
          unlocked: longestStreak >= 30
        }
      ];
    }

    function renderBadgeShelf(child) {
      const badges = childBadges(child);
      const unlocked = badges.filter((badge) => badge.unlocked).length;
      document.querySelector("#badgeCount").textContent = unlocked + "/" + badges.length;
      document.querySelector("#badgeShelf").innerHTML = badges.map((badge) => `
        <article class="badge ${badge.unlocked ? "unlocked" : ""}">
          <span class="badge-mark">${badge.mark}</span>
          <span>
            <strong>${badge.title}</strong>
            <span class="small">${badge.detail}</span>
          </span>
        </article>
      `).join("");
    }

    function renderAllowanceTracker(child) {
      const progress = Math.min(100, Math.round(((child.moneyBalance || 0) / Math.max(1, child.savingsGoal || 1)) * 100));
      document.querySelector("#allowanceBalance").textContent = "$" + (child.moneyBalance || 0);
      document.querySelector("#weeklyAllowance").textContent = "$" + (child.weeklyAllowance || 0);
      document.querySelector("#savingsGoalName").textContent = child.savingsGoalName || "Savings goal";
      document.querySelector("#savingsProgressLabel").textContent = progress + "%";
      document.querySelector("#savingsProgressFill").style.setProperty("--w", progress + "%");
      const history = (child.spendingHistory || []).slice(0, 4);
      document.querySelector("#spendingHistory").innerHTML = history.length
        ? history.map((item) => `<div class="filter-item"><span>${item.label}</span><strong>${item.amount}</strong></div>`).join("")
        : `<div class="filter-item"><span>No spending yet</span><strong>Saved</strong></div>`;
    }

    function renderStreaks(child) {
      const streaks = child.streaks || {};
      const items = [
        ["Reading Streak", streaks.reading || 0, "Story pages and reading time"],
        ["Homework Streak", streaks.homework || 0, "Focus sessions and plan work"],
        ["Exercise Streak", streaks.exercise || 0, "Move breaks and active resets"],
        ["Chore Streak", streaks.chores || 0, "Chores and money missions"]
      ];
      const best = Math.max(...items.map((item) => item[1]), 0);
      document.querySelector("#bestStreak").textContent = best + " days";
      document.querySelector("#streakShelf").innerHTML = items.map(([title, days, detail]) => `
        <article class="badge ${days > 0 ? "unlocked" : ""}">
          <span class="badge-mark">${days}</span>
          <span>
            <strong>${title}</strong>
            <span class="small">${detail}</span>
          </span>
        </article>
      `).join("");
    }

    function renderHomeworkMode(child) {
      document.querySelector("#toggleHomeworkMode").textContent = child.homeworkMode ? "End Homework" : "Start Homework";
      document.querySelector("#homeworkModeState").textContent = child.homeworkMode ? "Homework On" : "Homework Off";
      document.querySelector("#homeworkModeSub").textContent = child.homeworkMode
        ? "Games, videos, and entertainment requests are paused."
        : "Games and video requests are available.";
    }

    function renderDailyGoalBoard(child) {
      const wins = child.dailyWins || {};
      document.querySelector("#dailyGoalBoard").innerHTML = dailyGoalItems.map((goal) => {
        const done = Boolean(wins[goal.id]);
        return `
          <button class="goal-chip ${done ? "done" : ""}" data-daily-win="${goal.id}">
            <span>${goal.title}</span>
            <small>${goal.detail}</small>
          </button>
        `;
      }).join("");

      document.querySelectorAll("[data-daily-win]").forEach((button) => {
        button.addEventListener("click", () => completeDailyWin(button.dataset.dailyWin));
      });
    }

    function renderKindnessQuest(child) {
      const index = Number(child.kindnessPrompt || 0) % kindnessPrompts.length;
      document.querySelector("#kindnessPrompt").textContent = kindnessPrompts[index];
      document.querySelector("#kindnessPoints").textContent = (child.kindnessPoints || 0) + " points";
    }

    function renderReadingLog(child) {
      const log = child.readingLog || [];
      const total = log.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
      document.querySelector("#readingTotal").textContent = total + "m";
      document.querySelector("#readingHistory").innerHTML = log.length
        ? log.slice(0, 5).map((item) => `
          <div class="filter-item">
            <span>${escapeHtml(item.title)}</span>
            <strong>${Number(item.minutes || 0)}m</strong>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No reading logged yet</span><strong>Start</strong></div>`;
    }

    function renderHealthyBreaks(child) {
      const waterGoal = Math.max(1, Number(state.wellbeingGoals?.water || 4));
      const eyeGoal = Math.max(1, Number(state.wellbeingGoals?.eyeBreaks || 3));
      const waterCount = Number(child.waterCount || 0);
      const eyeCount = Number(child.eyeBreaks || 0);
      document.querySelector("#waterProgress").textContent = waterCount + "/" + waterGoal;
      document.querySelector("#eyeProgress").textContent = eyeCount + "/" + eyeGoal;
      document.querySelector("#waterFill").style.setProperty("--w", Math.min(100, Math.round((waterCount / waterGoal) * 100)) + "%");
      document.querySelector("#eyeFill").style.setProperty("--w", Math.min(100, Math.round((eyeCount / eyeGoal) * 100)) + "%");
    }

    function renderWellbeingSnapshot(child) {
      const wins = Object.values(child.dailyWins || {}).filter(Boolean).length;
      const readingTotal = (child.readingLog || []).reduce((sum, item) => sum + Number(item.minutes || 0), 0);
      const lastRead = (child.readingLog || [])[0]?.title || "Nothing logged yet";
      document.querySelector("#wellbeingSnapshot").innerHTML = `
        <div class="filter-item"><span>Daily wins</span><strong>${wins}/${dailyGoalItems.length}</strong></div>
        <div class="filter-item"><span>Water progress</span><strong>${Number(child.waterCount || 0)}/${Number(state.wellbeingGoals?.water || 4)}</strong></div>
        <div class="filter-item"><span>Eye breaks</span><strong>${Number(child.eyeBreaks || 0)}/${Number(state.wellbeingGoals?.eyeBreaks || 3)}</strong></div>
        <div class="filter-item"><span>Kindness points</span><strong>${Number(child.kindnessPoints || 0)}</strong></div>
        <div class="filter-item"><span>Reading total</span><strong>${readingTotal}m</strong></div>
        <div class="filter-item"><span>Last reading</span><strong>${escapeHtml(lastRead)}</strong></div>
      `;
    }

    function renderTodayPlan(child) {
      document.querySelector("#todayPlan").innerHTML = todayTasks.map((task) => {
        const done = child.completedTasks.includes(task.id);
        return `
          <article class="plan-item ${done ? "done" : ""}">
            <span class="small">${task.report} · +${task.minutes}m</span>
            <h3>${task.title}</h3>
            <p class="small">${task.detail}</p>
            <button data-task="${task.id}">${done ? "Done" : "Complete"}</button>
          </article>
        `;
      }).join("");

      document.querySelectorAll("[data-task]").forEach((button) => {
        button.addEventListener("click", () => completeTask(button.dataset.task));
      });
    }

    function renderControls(child) {
      ensureChildAppState(child);
      const left = Math.max(0, child.dailyLimit - child.usedToday);
      document.querySelector("#childWelcome").textContent = child.name + "'s Child Mode";
      renderKidAvatarStudio(child);
      renderBadgeShelf(child);
      renderAllowanceTracker(child);
      renderStreaks(child);
      renderHomeworkMode(child);
      renderDailyGoalBoard(child);
      renderKindnessQuest(child);
      renderReadingLog(child);
      renderHealthyBreaks(child);
      document.querySelector("#timeLeft").textContent = formatMinutes(left);
      document.querySelector("#pendingCount").textContent = child.pending;
      document.querySelector("#blockedHits").textContent = child.blockedHits;
      document.querySelector("#lockState").textContent = child.bedtime ? "On" : "Off";
      document.querySelector("#limitRange").value = child.dailyLimit;
      decorateRange(document.querySelector("#limitRange"));
      document.querySelector("#limitValue").textContent = formatMinutes(child.dailyLimit);
      document.querySelector("#bedtimeToggle").checked = child.bedtime;
      document.querySelector("#deviceState").textContent = child.bedtime ? "Device Locked" : "Device Active";
      document.querySelector("#deviceSub").textContent = child.bedtime
        ? "Only emergency phone calls are available."
        : "Emergency calls stay available when locked.";
      document.querySelector("#appName").textContent = child.currentRequest[0];
      document.querySelector("#appMeta").textContent = child.currentRequest[1];
      document.querySelector("#appInitial").textContent = child.currentRequest[2];
      renderTodayPlan(child);
      renderReport(child);
      renderSafetyAlerts();
      renderProblemReports();
      renderScanHistory();
      renderTrustedContacts();
      renderMoodCheckins();
      renderFamilyRules();
      renderChores();
      renderRewards();
      renderFocus();
      renderWellbeingSnapshot(child);
    }

    function render() {
      passcodeSetting.value = currentParentPasscode();
      passcodeSettingStatus.textContent = "Saved";
      signupFamily.value = state.familyName || "";
      signupParent.value = state.parentName || "";
      signupEmail.value = state.parentEmail || "";
      document.querySelector("#waterGoalInput").value = Number(state.wellbeingGoals?.water || 4);
      document.querySelector("#eyeGoalInput").value = Number(state.wellbeingGoals?.eyeBreaks || 3);
      renderProfiles();
      renderControls(currentChild());
    }

    function openApp(app) {
      const child = currentChild();
      ensureChildAppState(child);
      window.clearTimeout(closeTimer);
      const titles = {
        money: ["Money Missions", "Allowance goals, saving practice, and parent-approved rewards."],
        studio: ["Creator Studio", "Safe prompts, pretend recording, and parent review queue."],
        explore: ["Explorer Lab", "Nature facts, map quests, and discovery minutes."],
        move: ["Move Breaks", "Short activity timers that count toward healthy movement."],
        story: ["Story Theater", "Read-aloud pages, bookmarks, and calm story time."]
      };
      appTitle.textContent = titles[app][0];
      appSubtitle.textContent = child.name + " · " + titles[app][1];
      appBody.innerHTML = appMarkup(app, child);
      appModal.classList.add("open");
      appModal.setAttribute("aria-hidden", "false");
      bindAppActions(app);
    }

    function completeTask(taskId) {
      const child = currentChild();
      ensureChildAppState(child);
      if (child.completedTasks.includes(taskId)) {
        showToast("That task is already complete for " + child.name + ".");
        return;
      }
      const task = todayTasks.find((item) => item.id === taskId);
      child.completedTasks.push(task.id);
      child.report[task.report] = (child.report[task.report] || 0) + task.minutes;
      if (task.id === "story") {
        child.streaks.reading += 1;
      } else if (task.id === "move") {
        child.streaks.exercise += 1;
      } else if (task.id === "money") {
        child.streaks.chores += 1;
      } else {
        child.streaks.homework += 1;
      }
      renderControls(child);
      queueSave();
      showToast(task.title + " completed for " + child.name + ".");
      celebrate();
    }

    function resetTodayPlan() {
      const child = currentChild();
      ensureChildAppState(child);
      child.completedTasks = [];
      renderControls(child);
      queueSave();
      showToast(child.name + "'s plan was reset.");
    }

    function requestWeeklyAllowance() {
      const child = currentChild();
      ensureChildAppState(child);
      child.currentRequest = [
        "Weekly Allowance",
        `${child.name} requested this week's $${child.weeklyAllowance} allowance`,
        "$",
        "weeklyAllowance"
      ];
      child.pending += 1;
      render();
      queueSave();
      showToast("Allowance request sent to parent dashboard.");
      celebrate();
    }

    function toggleHomeworkMode() {
      const child = currentChild();
      ensureChildAppState(child);
      child.homeworkMode = !child.homeworkMode;
      if (child.homeworkMode) {
        child.streaks.homework += 1;
      }
      renderControls(child);
      queueSave();
      showToast(child.homeworkMode ? "Homework Mode started." : "Homework Mode ended.");
    }

    function saveWellbeingGoals() {
      state.wellbeingGoals = {
        water: Math.max(1, Math.min(12, Number(document.querySelector("#waterGoalInput").value || 4))),
        eyeBreaks: Math.max(1, Math.min(12, Number(document.querySelector("#eyeGoalInput").value || 3)))
      };
      renderControls(currentChild());
      queueSave();
      showToast("Wellbeing goals saved.");
    }

    function saveTrustedContacts() {
      state.trustedContacts = document.querySelector("#trustedContactsInput").value
        .split("\\n")
        .map((contact) => contact.trim())
        .filter(Boolean);
      renderTrustedContacts();
      queueSave();
      showToast("Trusted contacts saved.");
    }

    function submitProblemReport() {
      const child = currentChild();
      const typedProblem = document.querySelector("#problemType").value.trim();
      const type = typedProblem ? typedProblem.slice(0, 48) : "Problem";
      const urgency = document.querySelector("#problemUrgency").value;
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      state.problemReports = state.problemReports || [];
      state.problemReports.unshift({
        child: child.name,
        type,
        urgency,
        note: typedProblem,
        time,
        status: "New"
      });
      state.safetyAlerts = state.safetyAlerts || [];
      state.safetyAlerts.unshift({
        child: child.name,
        message: type + " reported" + (urgency === "Needs help now" ? " - urgent" : ""),
        time
      });
      document.querySelector("#problemType").value = "";
      renderControls(child);
      queueSave();
      showToast("Problem report sent to parent dashboard.");
      celebrate();
    }

    function clearProblemForm() {
      document.querySelector("#problemType").value = "";
      document.querySelector("#problemUrgency").value = "Needs help now";
      showToast("Problem report form cleared.");
    }

    function reviewProblemReport(index) {
      const report = (state.problemReports || [])[index];
      if (!report) {
        return;
      }
      report.status = "Reviewed";
      renderProblemReports();
      queueSave();
      showToast("Problem report marked reviewed.");
    }

    function followUpProblemReport(index) {
      const report = (state.problemReports || [])[index];
      if (!report) {
        return;
      }
      report.status = "Follow up";
      state.safetyAlerts = state.safetyAlerts || [];
      state.safetyAlerts.unshift({
        child: report.child,
        message: "Parent follow-up needed: " + report.type,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      renderControls(currentChild());
      queueSave();
      showToast("Follow-up added to safety alerts.");
    }

    function analyzeScanText(rawValue) {
      const value = rawValue.trim();
      const lower = value.toLowerCase();
      const blockedWords = [
        "adult", "porn", "xxx", "nude", "gambling", "casino", "betting",
        "weapon", "drugs", "self harm", "kill myself", "suicide", "hate speech"
      ];
      const cautionWords = [
        "chat with strangers", "meet up", "send photo", "private message",
        "free robux", "free coins", "giveaway", "download apk", "unknown link"
      ];
      const allowedDomains = [
        "nationalgeographic.com", "kids.nationalgeographic.com", "nasa.gov",
        "bbc.co.uk", "khanacademy.org", "duolingo.com", "scratch.mit.edu",
        "wikipedia.org", "commonsensemedia.org"
      ];

      let hostname = "";
      try {
        const parsed = new URL(value.includes("://") ? value : "https://" + value);
        hostname = parsed.hostname.replace(/^www\./, "");
      } catch (error) {
        hostname = "";
      }

      const matchedBlocked = blockedWords.filter((word) => lower.includes(word));
      const matchedCaution = cautionWords.filter((word) => lower.includes(word));
      const isAllowedDomain = hostname && allowedDomains.some((domain) => hostname === domain || hostname.endsWith("." + domain));
      const hasSuspiciousUrl = Boolean(hostname) && (
        /[0-9]{6,}/.test(hostname) ||
        hostname.split("-").length > 4 ||
        !hostname.includes(".") ||
        lower.includes("login") && lower.includes("free")
      );

      if (!value) {
        return {
          result: "Empty",
          level: "caution",
          detail: "Type or paste something to scan.",
          reasons: []
        };
      }

      if (matchedBlocked.length) {
        return {
          result: "Blocked",
          level: "blocked",
          detail: "Matched blocked safety terms: " + matchedBlocked.join(", "),
          reasons: matchedBlocked
        };
      }

      if (hasSuspiciousUrl || matchedCaution.length) {
        return {
          result: "Needs Review",
          level: "review",
          detail: matchedCaution.length ? "Matched caution terms: " + matchedCaution.join(", ") : "The URL pattern looks unusual.",
          reasons: matchedCaution
        };
      }

      if (isAllowedDomain) {
        return {
          result: "Allowed",
          level: "allowed",
          detail: "Recognized as an approved learning or safety resource.",
          reasons: []
        };
      }

      return {
        result: "Allowed",
        level: "allowed",
        detail: "No blocked terms or suspicious URL patterns were found.",
        reasons: []
      };
    }

    function runRealScan() {
      const input = document.querySelector("#scanInput");
      const output = document.querySelector("#scanResult");
      const child = currentChild();
      const scan = analyzeScanText(input.value);
      output.className = "scan-result " + scan.level;
      output.innerHTML = `<strong>${scan.result}</strong><span class="small">${escapeHtml(scan.detail)}</span>`;

      state.scanHistory = state.scanHistory || [];
      state.scanHistory.unshift({
        label: (input.value.trim() || "Empty scan").slice(0, 48),
        result: scan.result,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      state.scanHistory = state.scanHistory.slice(0, 12);

      if (scan.result === "Blocked" || scan.result === "Needs Review") {
        child.blockedHits += 1;
        state.safetyAlerts = state.safetyAlerts || [];
        state.safetyAlerts.unshift({
          child: child.name,
          message: "Scanner flagged: " + scan.result,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        });
      }

      renderControls(child);
      queueSave();
      showToast("Scan complete: " + scan.result + ".");
    }

    function completeDailyWin(goalId) {
      const child = currentChild();
      ensureChildAppState(child);
      const goal = dailyGoalItems.find((item) => item.id === goalId);
      if (!goal) {
        return;
      }
      if (child.dailyWins[goalId]) {
        showToast(goal.title + " is already complete today.");
        return;
      }
      child.dailyWins[goalId] = true;
      child.report[goal.report] = (child.report[goal.report] || 0) + goal.minutes;
      if (goalId === "move") {
        child.streaks.exercise += 1;
      } else if (goalId === "read") {
        child.streaks.reading += 1;
      } else if (goalId === "learn" || goalId === "safe") {
        child.streaks.homework += 1;
      }
      renderControls(child);
      queueSave();
      showToast(goal.title + " win added.");
      celebrate();
    }

    function resetDailyWins() {
      const child = currentChild();
      ensureChildAppState(child);
      child.dailyWins = {};
      child.waterCount = 0;
      child.eyeBreaks = 0;
      renderControls(child);
      queueSave();
      showToast("Daily wins and healthy breaks were reset.");
    }

    function nextKindnessQuest() {
      const child = currentChild();
      ensureChildAppState(child);
      child.kindnessPrompt = Number(child.kindnessPrompt || 0) + 1;
      renderKindnessQuest(child);
      queueSave();
      showToast("New kindness quest ready.");
    }

    function completeKindnessQuest() {
      const child = currentChild();
      ensureChildAppState(child);
      child.kindnessPoints = Number(child.kindnessPoints || 0) + 5;
      child.dailyWins.kind = true;
      child.streaks.homework += 1;
      state.moodCheckins = state.moodCheckins || [];
      state.moodCheckins.unshift({
        child: child.name,
        mood: "Completed kindness quest",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      nextKindnessQuest();
      renderControls(child);
      queueSave();
      showToast("Kindness quest complete.");
      celebrate();
    }

    function addReadingLog() {
      const child = currentChild();
      ensureChildAppState(child);
      const titleInput = document.querySelector("#readingTitle");
      const minutesInput = document.querySelector("#readingMinutes");
      const title = titleInput.value.trim() || "Reading time";
      const minutes = Math.max(1, Math.min(120, Number(minutesInput.value || 10)));
      child.readingLog.unshift({ title, minutes });
      child.readingLog = child.readingLog.slice(0, 12);
      child.dailyWins.read = true;
      child.streaks.reading += 1;
      child.report.Stories = (child.report.Stories || 0) + minutes;
      titleInput.value = "";
      minutesInput.value = 10;
      renderControls(child);
      queueSave();
      showToast(minutes + " reading minutes added.");
      celebrate();
    }

    function addWaterBreak() {
      const child = currentChild();
      ensureChildAppState(child);
      child.waterCount = Number(child.waterCount || 0) + 1;
      renderControls(child);
      queueSave();
      showToast("Water break added.");
      if (child.waterCount >= Number(state.wellbeingGoals?.water || 4)) {
        celebrate();
      }
    }

    function addEyeBreak() {
      const child = currentChild();
      ensureChildAppState(child);
      child.eyeBreaks = Number(child.eyeBreaks || 0) + 1;
      child.report.Movement = (child.report.Movement || 0) + 1;
      renderControls(child);
      queueSave();
      showToast("Eye break added.");
      if (child.eyeBreaks >= Number(state.wellbeingGoals?.eyeBreaks || 3)) {
        celebrate();
      }
    }

    function appMarkup(app, child) {
      const factList = [
        "A sea turtle can travel thousands of miles across the ocean and still return near its birthplace.",
        "Redwood trees can grow taller than a 30-story building.",
        "A day on Venus is longer than a year on Venus.",
        "Octopuses have three hearts and can solve simple puzzles.",
        "Honey never really spoils when it is sealed and stored properly.",
        "The heart of a blue whale is about the size of a small car.",
        "Bananas are berries, but strawberries are not true berries.",
        "Sharks existed before trees grew on Earth.",
        "Lightning can heat the air around it hotter than the surface of the Sun.",
        "A group of stars that forms a picture is called a constellation.",
        "The Moon moves a little farther away from Earth every year.",
        "Saturn is less dense than water, even though it is enormous.",
        "Mars has the tallest known volcano in the solar system.",
        "Jupiter has a giant storm called the Great Red Spot.",
        "A year on Mercury is only 88 Earth days.",
        "Neptune has winds faster than the speed of sound.",
        "The Sun is a star, and it is the closest star to Earth.",
        "There are more stars in the universe than grains of sand on Earth.",
        "Comets are made of ice, dust, and rocky material.",
        "Astronauts can grow taller in space because their spines stretch slightly.",
        "The International Space Station travels around Earth about every 90 minutes.",
        "Earth is the only planet we know has liquid water on its surface.",
        "The Pacific Ocean is the largest ocean on Earth.",
        "Most of Earth's oxygen is made by tiny ocean plants called phytoplankton.",
        "Coral reefs are made by tiny animals called coral polyps.",
        "A giant squid has eyes as big as dinner plates.",
        "Some jellyfish can glow in the dark.",
        "Dolphins have names for each other using special whistles.",
        "Sea otters hold hands while resting so they do not drift apart.",
        "A seahorse father carries the babies before they are born.",
        "The deepest part of the ocean is the Mariana Trench.",
        "Some fish can change color to blend into coral reefs.",
        "Penguins cannot fly, but they are excellent swimmers.",
        "Polar bears have black skin under their white-looking fur.",
        "A cheetah is the fastest land animal.",
        "Elephants can recognize themselves in a mirror.",
        "Giraffes have the same number of neck bones as humans.",
        "A tiger's stripes are unique, like a fingerprint.",
        "Koalas have fingerprints that look a lot like human fingerprints.",
        "Bats are the only mammals that can truly fly.",
        "A hummingbird can flap its wings dozens of times each second.",
        "Owls can turn their heads far around, but not all the way around.",
        "Flamingos are pink because of the food they eat.",
        "Bees communicate by doing a waggle dance.",
        "Ants can lift many times their own body weight.",
        "Butterflies taste with their feet.",
        "Dragonflies can fly forward, backward, and hover in place.",
        "Ladybugs are helpful because they eat plant pests called aphids.",
        "Worms help soil by mixing it and making tunnels for air and water.",
        "Frogs absorb water through their skin.",
        "Some frogs can freeze in winter and thaw in spring.",
        "A chameleon can move each eye in a different direction.",
        "Crocodiles can replace their teeth many times.",
        "Snakes smell with their tongues.",
        "Turtles have shells that are part of their skeleton.",
        "Camels can close their nostrils to keep out blowing sand.",
        "Kangaroos cannot walk backward easily.",
        "Sloths move slowly because their bodies save energy.",
        "Arctic foxes change coat color with the seasons.",
        "Plants use sunlight to make food in a process called photosynthesis.",
        "Bamboo can grow very quickly, sometimes more than a foot in a day.",
        "Sunflowers can turn toward the Sun while they are growing.",
        "Cactus spines are actually modified leaves.",
        "Some trees can communicate through underground fungi networks.",
        "The Amazon rainforest makes its own rainy weather.",
        "A seed can stay asleep for years before it sprouts.",
        "Moss does not have true roots like many other plants.",
        "Venus flytraps are plants that can catch insects.",
        "A pineapple is made from many tiny flowers joined together.",
        "The tallest mountain on Earth above sea level is Mount Everest.",
        "The longest river is debated, but the Nile and Amazon are both enormous.",
        "Deserts can be cold as well as hot.",
        "Antarctica is the driest continent on Earth.",
        "A volcano can build new land when lava cools.",
        "Earthquakes happen when pieces of Earth's crust move suddenly.",
        "The Grand Canyon was carved mainly by the Colorado River.",
        "A glacier is a huge river of ice that moves slowly.",
        "Islands can form from volcanoes under the ocean.",
        "A peninsula is land surrounded by water on three sides.",
        "Clouds are made of tiny water droplets or ice crystals.",
        "Rainbows appear when sunlight bends and reflects inside water drops.",
        "Thunder is the sound made by rapidly expanding air after lightning.",
        "Snowflakes usually have six sides.",
        "Hail forms when storm winds lift water droplets into freezing air.",
        "A tornado is a spinning column of air touching the ground.",
        "Hurricanes get energy from warm ocean water.",
        "Fog is a cloud that forms near the ground.",
        "Wind is moving air caused by differences in air pressure.",
        "A barometer is a tool that measures air pressure.",
        "Your brain uses a lot of your body's energy.",
        "Human bones are strong, but they are also living tissue.",
        "The smallest bones in your body are inside your ear.",
        "Your skin is your body's largest organ.",
        "You blink many times each minute without thinking about it.",
        "Taste buds help you sense sweet, salty, sour, bitter, and umami flavors.",
        "Your lungs take oxygen from the air and move it into your blood.",
        "Blood carries oxygen and nutrients around your body.",
        "Muscles work in pairs to move many parts of your body.",
        "Your fingerprints formed before you were born.",
        "Sound travels faster through water than through air.",
        "Magnets have a north pole and a south pole.",
        "Water expands when it freezes, which is unusual for a liquid.",
        "A shadow changes size when the light source moves.",
        "A prism can split white light into rainbow colors.",
        "Static electricity can make tiny bits of paper jump.",
        "A lever is a simple machine that helps lift or move things.",
        "Friction slows moving objects down.",
        "Gravity pulls objects toward each other.",
        "Recycling aluminum saves a lot of energy compared with making new aluminum."
      ];
      const storyPages = [
        "Mara opened the glowing book and found a map tucked between two pages.",
        "The map led past the moonlit garden to a door with a tiny brass star.",
        "Behind the door was a library where every shelf whispered a different adventure.",
        "Mara chose the quietest whisper and carried a new story home."
      ];

      if (app === "money") {
        const progress = Math.min(100, Math.round((child.moneyBalance / child.savingsGoal) * 100));
        const history = (child.spendingHistory || []).slice(0, 3).map((item) => `
          <div class="filter-item"><span>${item.label}</span><strong>${item.amount}</strong></div>
        `).join("") || `<div class="filter-item"><span>No spending yet</span><strong>Saved</strong></div>`;
        return `
          <div class="mini-grid">
            <div class="mini-card"><span class="small">Saved</span><strong>$${child.moneyBalance}</strong><div class="track"><div class="fill" style="--w: ${progress}%; --c: #5d9b3a;"></div></div></div>
            <div class="mini-card"><span class="small">Goal</span><strong>$${child.savingsGoal}</strong><p class="small">Reward: ${child.savingsGoalName || "New Football"}</p></div>
            <div class="mini-card"><span class="small">Weekly allowance</span><strong>$${child.weeklyAllowance}</strong><p class="small">Parent approval required.</p></div>
            <div class="mini-card"><span class="small">History</span><div class="filter-list">${history}</div></div>
          </div>
          <div class="choice-row">
            <button class="approve" data-app-action="earn">Ask for $5 Chore Credit</button>
            <button class="tiny" data-app-action="save">Practice Saving</button>
            <button class="block" data-app-action="spend">Request $4 Spend</button>
          </div>
        `;
      }

      if (app === "studio") {
        const queue = child.creatorQueue.length
          ? child.creatorQueue.map((item) => `<div class="filter-item"><span>${item}</span><strong>Review</strong></div>`).join("")
          : `<div class="filter-item"><span>No clips waiting</span><strong>Clear</strong></div>`;
        return `
          <div class="mini-grid">
            <div class="mini-card"><span class="small">Prompt</span><strong>Teach a 20-second fact</strong><p class="small">Keep faces, location, and school logos private.</p></div>
            <div class="mini-card"><span class="small">Queue</span><strong>${child.creatorQueue.length}</strong><p class="small">Parent approval required before publishing.</p></div>
          </div>
          <div class="choice-row">
            <button class="approve" data-app-action="record">Record Safe Clip</button>
            <button class="tiny" data-app-action="clearQueue">Clear Queue</button>
          </div>
          <div class="filter-list">${queue}</div>
        `;
      }

      if (app === "explore") {
        return `
          <div class="mini-card"><span class="small">Discovery card</span><strong>Wild Fact</strong><p>${factList[child.explorerFact % factList.length]}</p></div>
          <div class="mini-grid">
            <div class="mini-card"><span class="small">Quest</span><strong>Find 3 habitats</strong><p class="small">Forest, ocean, desert</p></div>
            <div class="mini-card"><span class="small">Earned</span><strong>+8m</strong><p class="small">Added to Explorer report when completed.</p></div>
          </div>
          <div class="choice-row">
            <button class="approve" data-app-action="nextFact">Next Fact</button>
            <button class="tiny" data-app-action="completeQuest">Complete Quest</button>
          </div>
        `;
      }

      if (app === "move") {
        return `
          <div class="mini-card"><span class="small">Activity</span><strong id="moveClock">${moveSeconds}s</strong><p class="small">Desk stretch, dance reset, then deep breath.</p></div>
          <div class="choice-row">
            <button class="approve" data-app-action="startMove">Start Timer</button>
            <button class="tiny" data-app-action="resetMove">Reset</button>
          </div>
        `;
      }

      return `
        <div class="story-box">${storyPages[child.storyPage % storyPages.length]}</div>
        <div class="mini-grid">
          <div class="mini-card"><span class="small">Bookmark</span><strong>Page ${(child.storyPage % storyPages.length) + 1}</strong><p class="small">Story time adds calm reading minutes.</p></div>
          <div class="mini-card"><span class="small">Mode</span><strong>Read Aloud</strong><p class="small">Soft pacing for bedtime reading.</p></div>
        </div>
        <div class="choice-row">
          <button class="approve" data-app-action="nextPage">Next Page</button>
          <button class="tiny" data-app-action="readTime">Add 10m Reading</button>
        </div>
      `;
    }

    function bindAppActions(app) {
      appBody.querySelectorAll("[data-app-action]").forEach((button) => {
        button.addEventListener("click", () => handleAppAction(app, button.dataset.appAction));
      });
    }

    function handleAppAction(app, action) {
      const child = currentChild();
      ensureChildAppState(child);
      let shouldCelebrate = false;

      if (action === "earn") {
        child.currentRequest = ["$5 Chore Credit", "Chore credit requested from " + child.name + "'s profile", "$", "moneyEarn"];
        child.pending += 1;
        showToast("Chore credit request sent for approval.");
      } else if (action === "save") {
        addReportMinutes("Money", 2);
        showToast(child.name + " practiced a saving choice.");
        shouldCelebrate = true;
      } else if (action === "spend") {
        child.currentRequest = ["$4 Spend Request", "Reward spend requested from " + child.name + "'s profile", "$", "moneySpend"];
        child.pending += 1;
        showToast("Spend request sent for approval.");
      } else if (action === "record") {
        child.creatorQueue.push("Fact clip " + (child.creatorQueue.length + 1));
        child.currentRequest = ["Creator Clip", "Video upload requested from " + child.name + "'s profile", "C", "creatorUpload"];
        child.pending += 1;
        showToast("Clip queued for parent review.");
      } else if (action === "clearQueue") {
        child.creatorQueue = [];
        showToast("Creator review queue cleared.");
      } else if (action === "nextFact") {
        child.explorerFact += 1;
        addReportMinutes("Explorer", 2);
        showToast("New explorer fact opened.");
        shouldCelebrate = true;
      } else if (action === "completeQuest") {
        addReportMinutes("Explorer", 8);
        showToast("Explorer quest completed.");
        shouldCelebrate = true;
      } else if (action === "startMove") {
        startMoveTimer();
        return;
      } else if (action === "resetMove") {
        resetMoveTimer();
        return;
      } else if (action === "nextPage") {
        child.storyPage += 1;
        addReportMinutes("Stories", 4);
        showToast("Story page saved.");
        shouldCelebrate = true;
      } else if (action === "readTime") {
        addReportMinutes("Stories", 10);
        showToast("Reading minutes added.");
        shouldCelebrate = true;
      }

      render();
      openApp(app);
      queueSave();
      if (shouldCelebrate) {
        celebrate();
      }
    }

    function startMoveTimer() {
      window.clearInterval(moveTimer);
      moveSeconds = 30;
      const clock = document.querySelector("#moveClock");
      clock.textContent = moveSeconds + "s";
      moveTimer = window.setInterval(() => {
        moveSeconds -= 1;
        clock.textContent = moveSeconds + "s";
        if (moveSeconds <= 0) {
          window.clearInterval(moveTimer);
          addReportMinutes("Movement", 5);
          showToast("Move Break complete.");
          celebrate();
          moveSeconds = 30;
          openApp("move");
        }
      }, 1000);
    }

    function resetMoveTimer() {
      window.clearInterval(moveTimer);
      moveSeconds = 30;
      openApp("move");
      showToast("Move timer reset.");
    }

    function closeApp() {
      window.clearInterval(moveTimer);
      appModal.classList.remove("open");
      appModal.setAttribute("aria-hidden", "true");
      closeTimer = window.setTimeout(() => {
        appBody.innerHTML = "";
      }, 230);
    }

    function nextRequest() {
      const child = currentChild();
      ensureChildAppState(child);
      requestIndex = (requestIndex + 1) % requestNames.length;
      const [name, initial, type] = requestNames[requestIndex];
      if (child.homeworkMode && (type === "Game app" || type === "Video app")) {
        showToast("Homework Mode is blocking game and video requests.");
        sendSafetyAlert("Homework Mode blocked a " + type.toLowerCase() + " request");
        return;
      }
      child.currentRequest = [name, `${type} requested from ${child.name}'s ${child.device}`, initial, "appDownload"];
      child.pending += 1;
      render();
      queueSave();
      showToast("Request sent to parent dashboard.");
      celebrate();
    }

    function sendSafetyAlert(message) {
      const child = currentChild();
      state.safetyAlerts = state.safetyAlerts || [];
      state.safetyAlerts.unshift({
        child: child.name,
        message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      renderSafetyAlerts();
      queueSave();
      showToast("Sent to parent dashboard.");
    }

    function handleHelpAction(action) {
      if (action === "needHelp") {
        sendSafetyAlert("Needs help now");
      } else if (action === "reportProblem") {
        document.querySelector("#problemType").focus();
        showToast("Choose the problem type, then send the report.");
      } else if (action === "extraTime") {
        const child = currentChild();
        child.currentRequest = ["Extra Time", "Extra screen time requested from " + child.name + "'s profile", "+", "extraTime"];
        child.pending += 1;
        render();
        queueSave();
        showToast("Extra time request sent.");
        celebrate();
      } else if (action === "calmBreak") {
        addReportMinutes("Movement", 2);
        openApp("move");
        showToast("Calm break started.");
        celebrate();
      }
    }

    function sendMoodCheckin(mood) {
      const child = currentChild();
      state.moodCheckins = state.moodCheckins || [];
      state.moodCheckins.unshift({
        child: child.name,
        mood,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      if (mood === "Need help") {
        sendSafetyAlert("Mood check-in says they need help");
      }
      renderMoodCheckins();
      queueSave();
      showToast("Mood check-in sent.");
      if (mood !== "Need help") {
        celebrate();
      }
    }

    function saveFamilyRules() {
      state.familyRules = rulesInput.value
        .split("\\n")
        .map((rule) => rule.trim())
        .filter(Boolean);
      renderFamilyRules();
      queueSave();
      showToast("Family rules saved.");
    }

    function saveChores() {
      state.chores = choresInput.value
        .split("\\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split("=");
          return {
            title: (parts[0] || "Chore").trim(),
            reward: Math.max(1, Number((parts[1] || "1").trim()) || 1)
          };
        });
      renderChores();
      queueSave();
      showToast("Chores saved.");
    }

    function saveRewards() {
      state.rewards = rewardsInput.value
        .split("\\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split("=");
          return {
            title: (parts[0] || "Reward").trim(),
            cost: Math.max(1, Number((parts[1] || "1").trim()) || 1)
          };
        });
      renderRewards();
      queueSave();
      showToast("Rewards saved.");
    }

    function saveFocusGoal() {
      state.focusGoal = focusInput.value.trim() || "Focus for 15 minutes";
      renderFocus();
      queueSave();
      showToast("Focus goal saved.");
    }

    function startFocusSession() {
      window.clearInterval(focusTimer);
      focusTimer = window.setInterval(() => {
        focusSeconds = Math.max(0, focusSeconds - 1);
        document.querySelector("#focusClock").textContent = formatClock(focusSeconds);
        if (focusSeconds === 0) {
          window.clearInterval(focusTimer);
          completeFocusSession();
        }
      }, 1000);
      showToast("Focus session started.");
    }

    function resetFocusSession() {
      window.clearInterval(focusTimer);
      focusSeconds = 900;
      renderFocus();
      showToast("Focus session reset.");
    }

    function completeFocusSession() {
      const child = currentChild();
      ensureChildAppState(child);
      addReportMinutes("Explorer", 15);
      child.streaks.homework += 1;
      sendMoodCheckin("Completed focus: " + (state.focusGoal || "Focus session"));
      focusSeconds = 900;
      renderControls(child);
      queueSave();
      showToast("Focus session complete.");
    }

    function submitChore(index) {
      const child = currentChild();
      const chore = (state.chores || [])[index];
      if (!chore) {
        return;
      }
      child.currentRequest = [
        chore.title,
        `${child.name} marked chore done for $${chore.reward}`,
        "$",
        "choreReward",
        chore.reward
      ];
      child.pending += 1;
      render();
      queueSave();
      showToast("Chore sent for parent approval.");
    }

    function requestReward(index) {
      const child = currentChild();
      const reward = (state.rewards || [])[index];
      if (!reward) {
        return;
      }
      if ((child.moneyBalance || 0) < reward.cost) {
        showToast("Not enough saved money yet.");
        return;
      }
      child.currentRequest = [
        reward.title,
        `${child.name} wants to redeem ${reward.title} for $${reward.cost}`,
        "$",
        "rewardRedeem",
        reward.cost
      ];
      child.pending += 1;
      render();
      queueSave();
      showToast("Reward request sent.");
    }

    function approveCurrentRequest(child) {
      ensureChildAppState(child);
      const kind = child.currentRequest[3] || "appDownload";
      if (kind === "moneyEarn") {
        child.moneyBalance += 5;
        child.report.Money = (child.report.Money || 0) + 3;
        child.spendingHistory.unshift({ label: "Chore credit", amount: "+$5" });
      } else if (kind === "moneySpend") {
        child.moneyBalance = Math.max(0, child.moneyBalance - 4);
        child.report.Money = (child.report.Money || 0) + 2;
        child.spendingHistory.unshift({ label: "Spend request", amount: "-$4" });
      } else if (kind === "creatorUpload") {
        child.creatorQueue = child.creatorQueue.slice(1);
      } else if (kind === "extraTime") {
        child.dailyLimit += 15;
      } else if (kind === "weeklyAllowance") {
        child.moneyBalance += Number(child.weeklyAllowance || 0);
        child.report.Money = (child.report.Money || 0) + 4;
        child.spendingHistory.unshift({ label: "Weekly allowance", amount: "+$" + Number(child.weeklyAllowance || 0) });
      } else if (kind === "choreReward") {
        child.moneyBalance += Number(child.currentRequest[4] || 1);
        child.report.Money = (child.report.Money || 0) + 3;
        child.spendingHistory.unshift({ label: child.currentRequest[0], amount: "+$" + Number(child.currentRequest[4] || 1) });
      } else if (kind === "rewardRedeem") {
        child.moneyBalance = Math.max(0, child.moneyBalance - Number(child.currentRequest[4] || 1));
        child.report.Money = (child.report.Money || 0) + 2;
        child.spendingHistory.unshift({ label: child.currentRequest[0], amount: "-$" + Number(child.currentRequest[4] || 1) });
      }
      child.spendingHistory = (child.spendingHistory || []).slice(0, 8);
      child.pending = Math.max(0, child.pending - 1);
    }

    navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.querySelector("#" + button.dataset.jump);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        document.querySelectorAll(".nav button").forEach((item) => item.classList.remove("active"));
        if (button.closest(".nav")) {
          button.classList.add("active");
        }
      });
    });

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        tabButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        const filter = button.dataset.filter;
        hubCards.forEach((card) => {
          card.style.display = filter === "all" || card.dataset.kind === filter ? "" : "none";
        });
      });
    });

    document.querySelectorAll("[data-open-app]").forEach((button) => {
      button.addEventListener("click", () => openApp(button.dataset.openApp));
    });
    document.querySelectorAll("[data-help-action]").forEach((button) => {
      button.addEventListener("click", () => handleHelpAction(button.dataset.helpAction));
    });
    document.querySelectorAll("[data-mood]").forEach((button) => {
      button.addEventListener("click", () => sendMoodCheckin(button.dataset.mood));
    });

    document.querySelector("#modeToggle").addEventListener("click", () => setMode(viewMode === "child" ? "parent" : "child"));
    document.querySelector("#heroChildMode").addEventListener("click", () => setMode("child"));
    document.querySelector("#childAskApp").addEventListener("click", nextRequest);
    document.querySelector("#unlockParent").addEventListener("click", unlockParent);
    document.querySelector("#backToChild").addEventListener("click", () => setMode("child"));
    document.querySelector("#openSignup").addEventListener("click", () => setMode("signup"));
    document.querySelector("#savePasscodeSetting").addEventListener("click", saveParentPasscode);
    document.querySelector("#saveRules").addEventListener("click", saveFamilyRules);
    document.querySelector("#saveChores").addEventListener("click", saveChores);
    document.querySelector("#saveRewards").addEventListener("click", saveRewards);
    document.querySelector("#saveFocus").addEventListener("click", saveFocusGoal);
    document.querySelector("#saveWellbeing").addEventListener("click", saveWellbeingGoals);
    document.querySelector("#saveTrustedContacts").addEventListener("click", saveTrustedContacts);
    document.querySelector("#addChild").addEventListener("click", addChildProfile);
    removeChildButton.addEventListener("click", removeSelectedChild);
    document.querySelector("#saveKidAvatar").addEventListener("click", saveKidAvatar);
    kidAvatarIcon.addEventListener("input", updateKidAvatarPreview);
    kidAvatarColor.addEventListener("input", updateKidAvatarPreview);
    kidCostume.addEventListener("input", updateKidAvatarPreview);
    newChildDob.max = new Date().toISOString().slice(0, 10);
    editChildDob.max = new Date().toISOString().slice(0, 10);
    newChildDob.addEventListener("input", updateNewChildWarning);
    editChildDob.addEventListener("input", updateEditChildWarning);
    document.querySelector("#saveChildProfile").addEventListener("click", saveSelectedChildProfile);
    newChildName.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addChildProfile();
      }
    });
    document.querySelector("#createAccount").addEventListener("click", createAccount);
    document.querySelector("#signupToChild").addEventListener("click", () => setMode("child"));
    document.querySelector("#forgotPassword").addEventListener("click", () => {
      forgotPanel.style.display = forgotPanel.style.display === "none" ? "grid" : "none";
      passcodeStatus.textContent = "";
    });
    document.querySelector("#sendRecoveryCode").addEventListener("click", sendRecoveryCode);
    document.querySelector("#resetPasscode").addEventListener("click", resetPasscodeWithCode);
    viewPassword.addEventListener("change", () => {
      passcodeInput.type = viewPassword.checked ? "text" : "password";
    });
    viewSettingPassword.addEventListener("change", () => {
      passcodeSetting.type = viewSettingPassword.checked ? "text" : "password";
    });
    viewSignupPassword.addEventListener("change", () => {
      signupPasscode.type = viewSignupPassword.checked ? "text" : "password";
    });
    viewRecoveryPassword.addEventListener("change", () => {
      recoveryPasscode.type = viewRecoveryPassword.checked ? "text" : "password";
    });
    passcodeSetting.addEventListener("input", () => {
      passcodeSettingStatus.textContent = "Unsaved";
    });
    passcodeInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        unlockParent();
      }
    });
    window.addEventListener("popstate", () => {
      parentUnlocked = window.sessionStorage.getItem("parentUnlocked") === "true";
      const nextMode = (window.location.hash || "#child").slice(1);
      setMode(["child", "parent", "signup"].includes(nextMode) ? nextMode : "child", { quiet: true });
    });
    document.querySelector("#saveNow").addEventListener("click", () => saveState(true));
    document.querySelector("#resetPlan").addEventListener("click", resetTodayPlan);
    document.querySelector("#requestAllowance").addEventListener("click", requestWeeklyAllowance);
    document.querySelector("#toggleHomeworkMode").addEventListener("click", toggleHomeworkMode);
    document.querySelector("#resetDailyWins").addEventListener("click", resetDailyWins);
    document.querySelector("#completeKindness").addEventListener("click", completeKindnessQuest);
    document.querySelector("#nextKindness").addEventListener("click", nextKindnessQuest);
    document.querySelector("#addReading").addEventListener("click", addReadingLog);
    document.querySelector("#addWater").addEventListener("click", addWaterBreak);
    document.querySelector("#addEyeBreak").addEventListener("click", addEyeBreak);
    document.querySelector("#submitProblemReport").addEventListener("click", submitProblemReport);
    document.querySelector("#clearProblemForm").addEventListener("click", clearProblemForm);
    document.querySelector("#startFocus").addEventListener("click", startFocusSession);
    document.querySelector("#resetFocus").addEventListener("click", resetFocusSession);
    document.querySelector("#completeFocus").addEventListener("click", completeFocusSession);
    document.querySelector("#closeApp").addEventListener("click", closeApp);
    appModal.addEventListener("click", (event) => {
      if (event.target === appModal) {
        closeApp();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && appModal.classList.contains("open")) {
        closeApp();
      }
    });
    document.addEventListener("click", addButtonRipple);

    document.querySelector("#approveBtn").addEventListener("click", () => {
      const child = currentChild();
      const requestName = child.currentRequest[0];
      approveCurrentRequest(child);
      render();
      queueSave();
      showToast(requestName + " approved for " + child.name + ".");
    });

    document.querySelector("#blockBtn").addEventListener("click", () => {
      const child = currentChild();
      const requestName = child.currentRequest[0];
      child.pending = Math.max(0, child.pending - 1);
      render();
      queueSave();
      showToast(requestName + " blocked for " + child.name + ".");
    });

    document.querySelector("#limitRange").addEventListener("input", (event) => {
      const child = currentChild();
      child.dailyLimit = Number(event.target.value);
      decorateRange(event.target);
      renderControls(child);
      queueSave();
    });

    document.querySelector("#bedtimeToggle").addEventListener("change", (event) => {
      const child = currentChild();
      child.bedtime = event.target.checked;
      renderControls(child);
      queueSave();
      showToast(child.bedtime ? child.name + "'s bedtime lock is active." : child.name + "'s bedtime lock is off.");
    });

    document.querySelector("#scanBtn").addEventListener("click", () => {
      runRealScan();
    });

    document.querySelector("#clearAlerts").addEventListener("click", () => {
      state.safetyAlerts = [];
      renderSafetyAlerts();
      queueSave();
      showToast("Safety alerts cleared.");
    });

    document.querySelector("#clearMood").addEventListener("click", () => {
      state.moodCheckins = [];
      renderMoodCheckins();
      queueSave();
      showToast("Mood check-ins cleared.");
    });

    document.querySelector("#clearProblemReports").addEventListener("click", () => {
      state.problemReports = [];
      renderProblemReports();
      queueSave();
      showToast("Problem reports cleared.");
    });

    try {
      state = JSON.parse(window.localStorage.getItem("safesproutState")) || JSON.parse(JSON.stringify(DEFAULT_STATE));
    } catch (error) {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
    setMode(viewMode, { quiet: true });
