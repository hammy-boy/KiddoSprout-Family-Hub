//go:build windows

package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"kiddosprout/windows-blocker/internal/blocker"
)

var version = "0.1.0-dev"

// Winsock defines SO_EXCLUSIVEADDRUSE as the bitwise inverse of SO_REUSEADDR
// (0x0004). Setting it before bind prevents another local process from
// co-binding KiddoSprout's private control port.
const windowsSOExclusiveAddrUse = -5

func listenExclusiveLoopback() (net.Listener, error) {
	configuration := net.ListenConfig{
		Control: func(_, _ string, connection syscall.RawConn) error {
			var optionErr error
			if err := connection.Control(func(fileDescriptor uintptr) {
				optionErr = syscall.SetsockoptInt(syscall.Handle(fileDescriptor), syscall.SOL_SOCKET, windowsSOExclusiveAddrUse, 1)
			}); err != nil {
				return err
			}
			return optionErr
		},
	}
	return configuration.Listen(context.Background(), "tcp4", "127.0.0.1:0")
}

type runtimeFile struct {
	Version         int       `json:"version"`
	PID             int       `json:"pid"`
	Origin          string    `json:"origin"`
	ActivationToken string    `json:"activationToken"`
	StartedAt       time.Time `json:"startedAt"`
}

func secureRandomToken() (string, error) {
	value := make([]byte, 32)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

func writeRuntimeFile(path string, value runtimeFile) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	data = append(data, '\n')
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	temporary, err := os.CreateTemp(filepath.Dir(path), ".runtime-*.tmp")
	if err != nil {
		return err
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)
	if err := temporary.Chmod(0o600); err != nil {
		temporary.Close()
		return err
	}
	if _, err := temporary.Write(data); err != nil {
		temporary.Close()
		return err
	}
	if err := temporary.Sync(); err != nil {
		temporary.Close()
		return err
	}
	if err := temporary.Close(); err != nil {
		return err
	}
	// os.Rename uses MoveFileEx with replacement semantics on Windows. Keep the
	// old control record in place until the complete, synced replacement is
	// ready; deleting it first creates a window where duplicate launches cannot
	// reach the already-running blocker and a crash loses the control record.
	return os.Rename(temporaryPath, path)
}

func readRuntimeFile(path string) (runtimeFile, error) {
	pathInfo, err := os.Lstat(path)
	if err != nil {
		return runtimeFile{}, err
	}
	if !pathInfo.Mode().IsRegular() {
		return runtimeFile{}, errors.New("the local control record is not a regular file")
	}
	file, err := os.Open(path)
	if err != nil {
		return runtimeFile{}, err
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		return runtimeFile{}, err
	}
	if !info.Mode().IsRegular() || info.Size() <= 0 || info.Size() > 4096 {
		return runtimeFile{}, errors.New("the local control record is not valid")
	}
	var value runtimeFile
	decoder := json.NewDecoder(io.LimitReader(file, 4097))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&value); err != nil {
		return runtimeFile{}, err
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return runtimeFile{}, errors.New("the local control record contains extra data")
	}
	if value.Version != 1 || value.PID <= 0 || uint64(value.PID) > uint64(^uint32(0)) || !validOpaqueToken(value.ActivationToken) || value.StartedAt.IsZero() || value.StartedAt.After(time.Now().UTC().Add(5*time.Minute)) {
		return runtimeFile{}, errors.New("the local control record is incomplete")
	}
	if !validLocalControlOrigin(value.Origin) {
		return runtimeFile{}, errors.New("the local control address is not valid")
	}
	return value, nil
}

func openExistingControl(paths appPaths) error {
	var lastErr error
	for attempt := 0; attempt < 25; attempt++ {
		value, err := readRuntimeFile(paths.runtime)
		if err == nil {
			request, requestErr := http.NewRequest(http.MethodPost, value.Origin+"/internal/activate", http.NoBody)
			if requestErr == nil {
				request.Header.Set("X-KiddoSprout-Activation", value.ActivationToken)
				client := activationHTTPClient()
				response, responseErr := client.Do(request)
				if responseErr == nil {
					var payload struct {
						URL string `json:"url"`
					}
					decodeErr := json.NewDecoder(io.LimitReader(response.Body, 4096)).Decode(&payload)
					response.Body.Close()
					if response.StatusCode == http.StatusOK && decodeErr == nil {
						bootstrap, parseErr := url.Parse(payload.URL)
						if parseErr == nil && bootstrap.Scheme == "http" && bootstrap.Host == strings.TrimPrefix(value.Origin, "http://") && strings.HasPrefix(bootstrap.Path, "/open/") && bootstrap.RawQuery == "" && bootstrap.Fragment == "" && bootstrap.User == nil {
							return shellOpen(payload.URL)
						}
					}
					lastErr = fmt.Errorf("the running blocker did not return a valid control link")
				} else {
					lastErr = responseErr
				}
			} else {
				lastErr = requestErr
			}
		} else {
			lastErr = err
		}
		time.Sleep(120 * time.Millisecond)
	}
	return fmt.Errorf("open running blocker: %w", lastErr)
}

func removeRuntimeIfOwned(path string, pid int) {
	value, err := readRuntimeFile(path)
	if err == nil && value.PID == pid {
		_ = os.Remove(path)
	}
}

func runInstalled(paths appPaths, background bool) error {
	mutex, alreadyRunning, err := acquireSingleInstance()
	if err != nil {
		return err
	}
	defer closeWindowsHandle(mutex)
	if alreadyRunning {
		if !shouldOpenExistingControl(background) {
			return nil
		}
		return openExistingControl(paths)
	}
	startupWarning := ""
	if err := setStartAtLogin(paths.executable); err != nil {
		startupWarning = "Windows could not add KiddoSprout to start-at-sign-in: " + err.Error()
		if !background {
			showMessage("KiddoSprout needs attention", "The blocker opened, but "+startupWarning, true)
		}
	}
	store, err := blocker.OpenStore(paths.settings)
	if err != nil {
		return fmt.Errorf("open blocker settings: %w", err)
	}
	listener, err := listenExclusiveLoopback()
	if err != nil {
		return fmt.Errorf("start private control page: %w", err)
	}
	defer listener.Close()
	origin := "http://" + listener.Addr().String()
	activationToken, err := secureRandomToken()
	if err != nil {
		return fmt.Errorf("create control token: %w", err)
	}
	tracker := &runtimeTracker{startupWarning: startupWarning}
	quitChannel := make(chan struct{})
	var quitOnce sync.Once
	requestQuit := func() { quitOnce.Do(func() { close(quitChannel) }) }
	control, err := blocker.NewControlServer(store, origin, activationToken, blocker.ControlActions{
		Runtime:             func() blocker.RuntimeStatus { return tracker.snapshot(paths, version) },
		OpenExtensionFolder: func() error { return shellOpen(paths.extension) },
		RequestQuit:         requestQuit,
		RequestUninstall:    func() error { return prepareUninstallHelper(paths) },
	})
	if err != nil {
		return err
	}
	runtime := runtimeFile{
		Version:         1,
		PID:             os.Getpid(),
		Origin:          origin,
		ActivationToken: activationToken,
		StartedAt:       time.Now().UTC(),
	}
	if err := writeRuntimeFile(paths.runtime, runtime); err != nil {
		return fmt.Errorf("write local control record: %w", err)
	}
	defer removeRuntimeIfOwned(paths.runtime, os.Getpid())
	httpServer := &http.Server{
		Handler:           control.Handler(),
		ReadHeaderTimeout: 4 * time.Second,
		ReadTimeout:       8 * time.Second,
		WriteTimeout:      12 * time.Second,
		IdleTimeout:       30 * time.Second,
		MaxHeaderBytes:    12 * 1024,
	}
	serverErrors := make(chan error, 1)
	go func() {
		if serveErr := httpServer.Serve(listener); serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			serverErrors <- serveErr
		}
	}()
	monitorContext, stopMonitor := context.WithCancel(context.Background())
	defer stopMonitor()
	go monitorProcesses(monitorContext, store, paths, tracker)
	if !background {
		bootstrapURL, bootstrapErr := control.NewBootstrapURL()
		if bootstrapErr != nil {
			return bootstrapErr
		}
		if err := shellOpen(bootstrapURL); err != nil {
			return err
		}
	}
	select {
	case <-quitChannel:
	case serveErr := <-serverErrors:
		return fmt.Errorf("private control page stopped: %w", serveErr)
	}
	stopMonitor()
	shutdownContext, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(shutdownContext)
	return nil
}

func main() {
	paths, err := resolveAppPaths()
	if err != nil {
		showMessage("KiddoSprout could not start", err.Error(), true)
		return
	}
	currentExecutable, err := os.Executable()
	if err != nil {
		showMessage("KiddoSprout could not start", err.Error(), true)
		return
	}
	currentExecutable, err = filepath.Abs(currentExecutable)
	if err != nil {
		showMessage("KiddoSprout could not start", err.Error(), true)
		return
	}
	if len(os.Args) > 1 && os.Args[1] == "--uninstall-helper" {
		helperPID, helperToken, helperMode := parseHelperAuthorization(os.Args[1:])
		if !helperMode {
			showMessage("KiddoSprout uninstall denied", "A valid one-time parent uninstall approval was not provided.", true)
			return
		}
		if err := runUninstallHelper(helperPID, helperToken, currentExecutable); err != nil {
			showMessage("KiddoSprout uninstall needs attention", err.Error(), true)
		}
		return
	}
	cleanupOldHelpers(currentExecutable)
	background := isBackgroundLaunch(os.Args[1:])
	if !samePath(currentExecutable, paths.executable) {
		// Always check the process lock, even if an ancillary installed file is
		// missing. Otherwise a partially damaged installation can still be
		// running while this downloaded copy tries to overwrite it. Keep the lock
		// through the copy so two installers cannot race each other.
		mutex, alreadyRunning, mutexErr := acquireSingleInstance()
		if mutexErr != nil {
			showMessage("KiddoSprout could not check the installed copy", mutexErr.Error(), true)
			return
		}
		if alreadyRunning {
			closeWindowsHandle(mutex)
			if shouldOpenExistingControl(background) {
				if err := openExistingControl(paths); err != nil {
					showMessage("KiddoSprout needs attention", err.Error(), true)
				}
			}
			return
		}
		if err := installFrom(currentExecutable, paths); err != nil {
			closeWindowsHandle(mutex)
			showMessage("KiddoSprout could not install", err.Error()+"\n\nClose an older copy first, then try again.", true)
			return
		}
		closeWindowsHandle(mutex)
		if err := launchInstalled(paths); err != nil {
			showMessage("KiddoSprout could not start", err.Error(), true)
		}
		return
	}
	if err := runInstalled(paths, background); err != nil {
		showMessage("KiddoSprout needs attention", err.Error(), true)
	}
}
