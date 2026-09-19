package blocker

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestStorePINRulesAndRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	store, err := OpenStore(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.CreatePIN(" 2468 ", "2468"); err != nil {
		t.Fatal(err)
	}
	if !store.Snapshot().Enabled {
		t.Fatal("protection should start after the initial PIN is created")
	}
	if err := store.VerifyPIN("2468", time.Now()); err != nil {
		t.Fatal(err)
	}
	if err := store.AddManualExecutable("My Game.exe"); err != nil {
		t.Fatal(err)
	}
	if err := store.AddManualExecutable("my game.exe"); !errors.Is(err, ErrRuleAlreadyExists) {
		t.Fatalf("duplicate rule error = %v", err)
	}
	reopened, err := OpenStore(path)
	if err != nil {
		t.Fatal(err)
	}
	snapshot := reopened.Snapshot()
	if len(snapshot.ManualExecutableNames) != 1 || snapshot.ManualExecutableNames[0] != "my game.exe" {
		t.Fatalf("manual rules = %#v", snapshot.ManualExecutableNames)
	}
	if err := reopened.ChangePIN("2468", "8642", "8642", time.Now()); err != nil {
		t.Fatal(err)
	}
	if err := reopened.VerifyPIN("8642", time.Now()); err != nil {
		t.Fatal(err)
	}
}

func TestStorePersistentPINLockout(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	store, err := OpenStore(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.CreatePIN("2468", "2468"); err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 9, 5, 12, 0, 0, 0, time.UTC)
	for attempt := 1; attempt < MaxPINFailures; attempt++ {
		if err := store.VerifyPIN("1111", now); !errors.Is(err, ErrWrongPIN) {
			t.Fatalf("attempt %d error = %v", attempt, err)
		}
	}
	if err := store.VerifyPIN("1111", now); !errors.Is(err, ErrPINLocked) {
		t.Fatalf("lockout error = %v", err)
	}
	reopened, err := OpenStore(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := reopened.VerifyPIN("2468", now.Add(time.Minute)); !errors.Is(err, ErrPINLocked) {
		t.Fatalf("persistent lockout error = %v", err)
	}
	if err := reopened.VerifyPIN("2468", now.Add(PINLockoutDuration+time.Second)); err != nil {
		t.Fatalf("correct PIN after lockout = %v", err)
	}
}

func TestManualRuleLimitDoesNotSaveAnUnreadableState(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	store, err := OpenStore(path)
	if err != nil {
		t.Fatal(err)
	}
	for index := 0; index < MaxManualRules; index++ {
		if err := store.AddManualExecutable(fmt.Sprintf("game-%03d.exe", index)); err != nil {
			t.Fatalf("add rule %d: %v", index, err)
		}
	}
	if err := store.AddManualExecutable("one-too-many.exe"); !errors.Is(err, ErrTooManyRules) {
		t.Fatalf("257th rule error = %v, want ErrTooManyRules", err)
	}
	if _, err := OpenStore(path); err != nil {
		t.Fatalf("state must remain readable after rejected rule: %v", err)
	}
}

func TestProtectionCannotStartWithoutPIN(t *testing.T) {
	store, err := OpenStore(filepath.Join(t.TempDir(), "settings.json"))
	if err != nil {
		t.Fatal(err)
	}
	if err := store.SetEnabled(true); !errors.Is(err, ErrPINNotConfigured) {
		t.Fatalf("SetEnabled(true) error = %v, want ErrPINNotConfigured", err)
	}
	if store.Snapshot().Enabled {
		t.Fatal("rejected start changed the in-memory protection state")
	}
}

func TestOpenStoreRejectsContradictoryOrNonRegularState(t *testing.T) {
	directory := t.TempDir()
	enabledWithoutPIN := filepath.Join(directory, "enabled-without-pin.json")
	invalid := `{"version":1,"enabled":true,"pin":{"version":0,"iterations":0,"salt":"","hash":""},"manualExecutableNames":[],"installedAt":"2026-09-12T10:00:00Z"}`
	if err := os.WriteFile(enabledWithoutPIN, []byte(invalid), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := OpenStore(enabledWithoutPIN); err == nil || !strings.Contains(err.Error(), "cannot be enabled") {
		t.Fatalf("enabled state without PIN error = %v", err)
	}

	settingsDirectory := filepath.Join(directory, "settings-directory")
	if err := os.Mkdir(settingsDirectory, 0o700); err != nil {
		t.Fatal(err)
	}
	if _, err := OpenStore(settingsDirectory); err == nil || !strings.Contains(err.Error(), "regular file") {
		t.Fatalf("directory settings error = %v", err)
	}
}

func TestOpenStoreRejectsImpossiblePINAttemptState(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	invalid := `{"version":1,"enabled":false,"pin":{"version":0,"iterations":0,"salt":"","hash":""},"manualExecutableNames":[],"failedPinAttempts":1,"failureWindowStarted":"2026-09-12T10:00:00Z","installedAt":"2026-09-12T10:00:00Z"}`
	if err := os.WriteFile(path, []byte(invalid), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := OpenStore(path); err == nil || !strings.Contains(err.Error(), "without a parent PIN") {
		t.Fatalf("orphaned attempt state error = %v", err)
	}
}
