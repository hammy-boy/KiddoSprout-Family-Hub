package blocker

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

const (
	StateVersion       = 1
	MaxManualRules     = 256
	MaxPINFailures     = 5
	PINFailureWindow   = 15 * time.Minute
	PINLockoutDuration = 15 * time.Minute
)

var (
	ErrPINAlreadyConfigured = errors.New("a parent PIN is already configured")
	ErrPINNotConfigured     = errors.New("create a parent PIN first")
	ErrPINMismatch          = errors.New("the two PINs do not match")
	ErrPINLocked            = errors.New("too many incorrect PIN attempts")
	ErrRuleAlreadyExists    = errors.New("that executable is already in the manual block list")
	ErrRuleNotFound         = errors.New("that executable is not in the manual block list")
	ErrTooManyRules         = errors.New("the manual block list is full; remove a rule before adding another")
)

type State struct {
	Version               int       `json:"version"`
	Enabled               bool      `json:"enabled"`
	PIN                   PINRecord `json:"pin"`
	ManualExecutableNames []string  `json:"manualExecutableNames"`
	FailedPINAttempts     int       `json:"failedPinAttempts,omitempty"`
	FailureWindowStarted  time.Time `json:"failureWindowStarted,omitempty"`
	LockedUntil           time.Time `json:"lockedUntil,omitempty"`
	InstalledAt           time.Time `json:"installedAt"`
}

func (state State) PINConfigured() bool {
	return state.PIN.Version == 1 && state.PIN.Hash != "" && state.PIN.Salt != ""
}

type Store struct {
	path  string
	mu    sync.Mutex
	state State
}

func OpenStore(path string) (*Store, error) {
	if !filepath.IsAbs(path) {
		return nil, errors.New("blocker settings path must be absolute")
	}
	store := &Store{path: path}
	store.state = State{Version: StateVersion, InstalledAt: time.Now().UTC()}
	pathInfo, err := os.Lstat(path)
	if errors.Is(err, os.ErrNotExist) {
		return store, nil
	}
	if err != nil {
		return nil, fmt.Errorf("inspect blocker settings: %w", err)
	}
	if !pathInfo.Mode().IsRegular() {
		return nil, errors.New("blocker settings must be a regular file")
	}
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("read blocker settings: %w", err)
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		return nil, fmt.Errorf("inspect blocker settings: %w", err)
	}
	if !info.Mode().IsRegular() {
		return nil, errors.New("blocker settings must be a regular file")
	}
	if info.Size() > 64*1024 {
		return nil, errors.New("blocker settings are unexpectedly large")
	}
	decoder := json.NewDecoder(io.LimitReader(file, 64*1024+1))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&store.state); err != nil {
		return nil, fmt.Errorf("read blocker settings: %w", err)
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return nil, errors.New("blocker settings contain extra data")
	}
	if store.state.Version != StateVersion {
		return nil, fmt.Errorf("unsupported blocker settings version %d", store.state.Version)
	}
	if err := validateState(store.state); err != nil {
		return nil, fmt.Errorf("invalid blocker settings: %w", err)
	}
	store.state.ManualExecutableNames = normalizedUniqueNames(store.state.ManualExecutableNames)
	return store, nil
}

func validateState(state State) error {
	configured := state.PINConfigured()
	if configured && !state.PIN.structurallyValid() {
		return errors.New("invalid parent PIN record")
	}
	if !configured && (state.PIN.Version != 0 || state.PIN.Salt != "" || state.PIN.Hash != "" || state.PIN.Iterations != 0) {
		return errors.New("incomplete parent PIN record")
	}
	if state.Enabled && !configured {
		return errors.New("protection cannot be enabled without a parent PIN")
	}
	if !configured && (state.FailedPINAttempts != 0 || !state.FailureWindowStarted.IsZero() || !state.LockedUntil.IsZero()) {
		return errors.New("PIN attempt state exists without a parent PIN")
	}
	if len(state.ManualExecutableNames) > MaxManualRules {
		return errors.New("too many manual executable rules")
	}
	if state.FailedPINAttempts < 0 || state.FailedPINAttempts >= MaxPINFailures {
		return errors.New("invalid PIN failure count")
	}
	if state.FailedPINAttempts > 0 && state.FailureWindowStarted.IsZero() {
		return errors.New("PIN failures are missing their attempt window")
	}
	if !state.LockedUntil.IsZero() && state.FailureWindowStarted.IsZero() {
		return errors.New("PIN lockout is missing its attempt window")
	}
	if !state.LockedUntil.IsZero() && state.LockedUntil.After(time.Now().Add(24*time.Hour)) {
		return errors.New("invalid PIN lockout time")
	}
	return nil
}

func normalizedUniqueNames(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		normalized, err := NormalizeExecutableName(value)
		if err != nil {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	sort.Strings(result)
	return result
}

func cloneState(state State) State {
	state.ManualExecutableNames = append([]string(nil), state.ManualExecutableNames...)
	return state
}

func (store *Store) Snapshot() State {
	store.mu.Lock()
	defer store.mu.Unlock()
	return cloneState(store.state)
}

func (store *Store) saveStateLocked(state State) error {
	if err := validateState(state); err != nil {
		return fmt.Errorf("refuse to save invalid blocker settings: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(store.path), 0o700); err != nil {
		return fmt.Errorf("create settings folder: %w", err)
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return fmt.Errorf("encode blocker settings: %w", err)
	}
	data = append(data, '\n')
	temporary, err := os.CreateTemp(filepath.Dir(store.path), ".config-*.tmp")
	if err != nil {
		return fmt.Errorf("create temporary settings: %w", err)
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)
	if err := temporary.Chmod(0o600); err != nil {
		temporary.Close()
		return fmt.Errorf("protect temporary settings: %w", err)
	}
	if _, err := temporary.Write(data); err != nil {
		temporary.Close()
		return fmt.Errorf("write blocker settings: %w", err)
	}
	if err := temporary.Sync(); err != nil {
		temporary.Close()
		return fmt.Errorf("sync blocker settings: %w", err)
	}
	if err := temporary.Close(); err != nil {
		return fmt.Errorf("close blocker settings: %w", err)
	}
	if err := os.Rename(temporaryPath, store.path); err != nil {
		return fmt.Errorf("replace blocker settings: %w", err)
	}
	return nil
}

func (store *Store) commitLocked(next State) error {
	if err := store.saveStateLocked(next); err != nil {
		return err
	}
	store.state = next
	return nil
}

func (store *Store) CreatePIN(pin, confirmation string) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if store.state.PINConfigured() {
		return ErrPINAlreadyConfigured
	}
	pin = NormalizePIN(pin)
	confirmation = NormalizePIN(confirmation)
	if !ValidPIN(pin) || !ValidPIN(confirmation) {
		return ErrInvalidPIN
	}
	if pin != confirmation {
		return ErrPINMismatch
	}
	record, err := NewPINRecord(pin)
	if err != nil {
		return err
	}
	next := cloneState(store.state)
	next.PIN = record
	next.Enabled = true
	next.FailedPINAttempts = 0
	next.FailureWindowStarted = time.Time{}
	next.LockedUntil = time.Time{}
	return store.commitLocked(next)
}

func verifyTransition(state State, pin string, now time.Time) (State, error) {
	next := cloneState(state)
	if !next.PINConfigured() {
		return next, ErrPINNotConfigured
	}
	if now.Before(next.LockedUntil) {
		return next, fmt.Errorf("%w; try again after %s", ErrPINLocked, next.LockedUntil.Local().Format("15:04"))
	}
	if next.FailureWindowStarted.IsZero() || now.Sub(next.FailureWindowStarted) > PINFailureWindow {
		next.FailedPINAttempts = 0
		next.FailureWindowStarted = now
		next.LockedUntil = time.Time{}
	}
	if next.PIN.Verify(pin) {
		next.FailedPINAttempts = 0
		next.FailureWindowStarted = time.Time{}
		next.LockedUntil = time.Time{}
		return next, nil
	}
	next.FailedPINAttempts++
	if next.FailedPINAttempts >= MaxPINFailures {
		next.FailedPINAttempts = 0
		next.LockedUntil = now.Add(PINLockoutDuration)
	}
	if now.Before(next.LockedUntil) {
		return next, fmt.Errorf("%w; try again after %s", ErrPINLocked, next.LockedUntil.Local().Format("15:04"))
	}
	return next, ErrWrongPIN
}

func (store *Store) VerifyPIN(pin string, now time.Time) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	next, verificationErr := verifyTransition(store.state, pin, now)
	if err := store.commitLocked(next); err != nil {
		return err
	}
	return verificationErr
}

func (store *Store) SetEnabled(enabled bool) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if enabled && !store.state.PINConfigured() {
		return ErrPINNotConfigured
	}
	next := cloneState(store.state)
	next.Enabled = enabled
	return store.commitLocked(next)
}

func (store *Store) ChangePIN(current, replacement, confirmation string, now time.Time) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	next, verificationErr := verifyTransition(store.state, current, now)
	if verificationErr != nil {
		if err := store.commitLocked(next); err != nil {
			return err
		}
		return verificationErr
	}
	replacement = NormalizePIN(replacement)
	confirmation = NormalizePIN(confirmation)
	if !ValidPIN(replacement) || !ValidPIN(confirmation) {
		return ErrInvalidPIN
	}
	if replacement != confirmation {
		return ErrPINMismatch
	}
	record, err := NewPINRecord(replacement)
	if err != nil {
		return err
	}
	next.PIN = record
	return store.commitLocked(next)
}

func (store *Store) AddManualExecutable(value string) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	normalized, err := NormalizeExecutableName(value)
	if err != nil {
		return err
	}
	for _, existing := range store.state.ManualExecutableNames {
		if existing == normalized {
			return ErrRuleAlreadyExists
		}
	}
	if len(store.state.ManualExecutableNames) >= MaxManualRules {
		return ErrTooManyRules
	}
	next := cloneState(store.state)
	next.ManualExecutableNames = append(next.ManualExecutableNames, normalized)
	sort.Strings(next.ManualExecutableNames)
	return store.commitLocked(next)
}

func (store *Store) RemoveManualExecutable(value string) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	normalized, err := NormalizeExecutableName(value)
	if err != nil {
		return err
	}
	for index, existing := range store.state.ManualExecutableNames {
		if existing == normalized {
			next := cloneState(store.state)
			next.ManualExecutableNames = append(next.ManualExecutableNames[:index], next.ManualExecutableNames[index+1:]...)
			return store.commitLocked(next)
		}
	}
	return ErrRuleNotFound
}
