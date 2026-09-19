//go:build windows

package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"kiddosprout/windows-blocker/internal/blocker"
)

const blockedNoticeCooldown = 60 * time.Second

type runtimeTracker struct {
	mu             sync.Mutex
	lastBlocked    string
	lastBlockedAt  time.Time
	lastError      string
	lastErrorAt    time.Time
	startupWarning string
	notifying      bool
	lastNotified   map[string]time.Time
}

func (tracker *runtimeTracker) recordError(message string) {
	message = strings.TrimSpace(message)
	if message == "" {
		return
	}
	const maximumErrorLength = 500
	if len(message) > maximumErrorLength {
		message = message[:maximumErrorLength] + "…"
	}
	tracker.mu.Lock()
	tracker.lastError = message
	tracker.lastErrorAt = time.Now()
	tracker.mu.Unlock()
}

func (tracker *runtimeTracker) clearError() {
	tracker.mu.Lock()
	tracker.lastError = ""
	tracker.lastErrorAt = time.Time{}
	tracker.mu.Unlock()
}

func (tracker *runtimeTracker) recordBlocked(name string) {
	now := time.Now()
	tracker.mu.Lock()
	tracker.lastBlocked = name
	tracker.lastBlockedAt = now
	identity := strings.ToLower(strings.TrimSpace(name))
	if identity == "" {
		identity = "unknown app"
	}
	if tracker.lastNotified == nil {
		tracker.lastNotified = make(map[string]time.Time)
	}
	lastNotice, previouslyNotified := tracker.lastNotified[identity]
	elapsed := now.Sub(lastNotice)
	insideCooldown := previouslyNotified && elapsed >= 0 && elapsed < blockedNoticeCooldown
	shouldNotify := !tracker.notifying && !insideCooldown
	if shouldNotify {
		if len(tracker.lastNotified) >= 256 {
			clear(tracker.lastNotified)
		}
		tracker.lastNotified[identity] = now
		tracker.notifying = true
	}
	tracker.mu.Unlock()
	if shouldNotify {
		go func() {
			showMessage("Blocked this app", fmt.Sprintf("KiddoSprout blocked %s because game protection is on.", name), false)
			tracker.mu.Lock()
			tracker.notifying = false
			tracker.mu.Unlock()
		}()
	}
}

func (tracker *runtimeTracker) snapshot(paths appPaths, version string) blocker.RuntimeStatus {
	tracker.mu.Lock()
	defer tracker.mu.Unlock()
	return blocker.RuntimeStatus{
		LastBlockedName: tracker.lastBlocked,
		LastBlockedAt:   tracker.lastBlockedAt,
		LastError:       tracker.lastError,
		LastErrorAt:     tracker.lastErrorAt,
		StartupWarning:  tracker.startupWarning,
		InstallFolder:   paths.root,
		ExtensionFolder: paths.extension,
		Version:         version,
	}
}

func monitorProcesses(ctx context.Context, store *blocker.Store, paths appPaths, tracker *runtimeTracker) {
	ticker := time.NewTicker(1100 * time.Millisecond)
	defer ticker.Stop()
	scan := func() {
		if ctx.Err() != nil {
			return
		}
		snapshot := store.Snapshot()
		if !snapshot.Enabled || !snapshot.PINConfigured() {
			tracker.clearError()
			return
		}
		currentSession, err := sessionIDForProcess(uint32(os.Getpid()))
		if err != nil {
			tracker.recordError("KiddoSprout could not verify the active Windows session: " + err.Error())
			return
		}
		candidates, err := currentSessionProcesses()
		if err != nil {
			tracker.recordError("KiddoSprout could not inspect running apps: " + err.Error())
			return
		}
		hadFailure := false
		for _, candidate := range candidates {
			if ctx.Err() != nil {
				return
			}
			// Re-read settings immediately before acting so a completed pause or
			// rule removal cannot leave this scan using an older snapshot.
			latest := store.Snapshot()
			if !latest.Enabled || !latest.PINConfigured() {
				return
			}
			matched, _ := blocker.MatchGameProcess(candidate.Name, candidate.Path, paths.root, latest.ManualExecutableNames)
			if !matched {
				continue
			}
			stillBlocked := func() bool {
				if ctx.Err() != nil {
					return false
				}
				current := store.Snapshot()
				if !current.Enabled || !current.PINConfigured() {
					return false
				}
				matched, _ := blocker.MatchGameProcess(candidate.Name, candidate.Path, paths.root, current.ManualExecutableNames)
				return matched
			}
			name := filepath.Base(candidate.Path)
			if name == "." || name == "" {
				name = candidate.Name
			}
			if err := terminateMatchingProcess(candidate, currentSession, stillBlocked); err != nil {
				if ctx.Err() != nil || !stillBlocked() {
					return
				}
				hadFailure = true
				tracker.recordError(fmt.Sprintf("KiddoSprout could not close %s: %v", name, err))
				continue
			}
			tracker.recordBlocked(name)
		}
		if !hadFailure {
			tracker.clearError()
		}
	}
	scan()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			scan()
		}
	}
}
