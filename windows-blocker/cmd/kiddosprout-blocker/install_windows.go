//go:build windows

package main

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

const (
	installedExecutableName = "KiddoSproutBlocker.exe"
	startHereName           = "START HERE.txt"
	uninstallHelperPrefix   = "KiddoSproutBlocker-Uninstall-"
	staleHelperAge          = 10 * time.Minute
)

var extensionFiles = []string{
	"blocked.html",
	"blocked.js",
	"content.js",
	"icon128.png",
	"manifest.json",
	"popup.html",
}

type appPaths struct {
	root            string
	executable      string
	settings        string
	runtime         string
	extension       string
	startHere       string
	uninstallAuth   string
	localAppData    string
	kiddoSproutRoot string
}

func resolveAppPaths() (appPaths, error) {
	localAppData := strings.TrimSpace(os.Getenv("LOCALAPPDATA"))
	if localAppData == "" || !filepath.IsAbs(localAppData) {
		return appPaths{}, errors.New("Windows did not provide a valid Local AppData folder")
	}
	localAppData = filepath.Clean(localAppData)
	kiddoSproutRoot := filepath.Join(localAppData, "KiddoSprout")
	root := filepath.Join(kiddoSproutRoot, "Blocker")
	return appPaths{
		root:            root,
		executable:      filepath.Join(root, installedExecutableName),
		settings:        filepath.Join(root, "settings.json"),
		runtime:         filepath.Join(root, "runtime.json"),
		extension:       filepath.Join(root, "browser-extension"),
		startHere:       filepath.Join(root, startHereName),
		uninstallAuth:   filepath.Join(root, "uninstall-authorization.json"),
		localAppData:    localAppData,
		kiddoSproutRoot: kiddoSproutRoot,
	}, nil
}

func samePath(left, right string) bool {
	leftAbsolute, leftErr := filepath.Abs(left)
	rightAbsolute, rightErr := filepath.Abs(right)
	return leftErr == nil && rightErr == nil && strings.EqualFold(filepath.Clean(leftAbsolute), filepath.Clean(rightAbsolute))
}

func copyRegularFile(source, destination string) error {
	info, err := os.Lstat(source)
	if err != nil {
		return fmt.Errorf("inspect %s: %w", filepath.Base(source), err)
	}
	if !info.Mode().IsRegular() {
		return fmt.Errorf("%s is not a regular file", filepath.Base(source))
	}
	if err := os.MkdirAll(filepath.Dir(destination), 0o700); err != nil {
		return err
	}
	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()
	temporary, err := os.CreateTemp(filepath.Dir(destination), ".install-*.tmp")
	if err != nil {
		return err
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)
	if err := temporary.Chmod(0o700); err != nil {
		temporary.Close()
		return err
	}
	if _, err := io.Copy(temporary, input); err != nil {
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
	// Rename the fully written temporary file directly over the destination.
	// Go maps this to replacement semantics on Windows, preserving the previous
	// working file if antivirus, permissions, or another process rejects the
	// replacement instead of deleting it first.
	if err := os.Rename(temporaryPath, destination); err != nil {
		return fmt.Errorf("replace %s: %w", filepath.Base(destination), err)
	}
	return nil
}

func installFrom(sourceExecutable string, paths appPaths) error {
	sourceFolder := filepath.Dir(sourceExecutable)
	if err := os.MkdirAll(paths.root, 0o700); err != nil {
		return fmt.Errorf("create install folder: %w", err)
	}
	if err := copyRegularFile(sourceExecutable, paths.executable); err != nil {
		return fmt.Errorf("install KiddoSprout app: %w", err)
	}
	if err := copyRegularFile(filepath.Join(sourceFolder, startHereName), paths.startHere); err != nil {
		return fmt.Errorf("install setup guide: %w", err)
	}
	for _, name := range extensionFiles {
		if err := copyRegularFile(filepath.Join(sourceFolder, "browser-extension", name), filepath.Join(paths.extension, name)); err != nil {
			return fmt.Errorf("install browser extension: %w", err)
		}
	}
	if err := setStartAtLogin(paths.executable); err != nil {
		return fmt.Errorf("add start-at-sign-in: %w", err)
	}
	return nil
}

func installationLooksComplete(paths appPaths) bool {
	files := []string{paths.executable, paths.startHere}
	for _, name := range extensionFiles {
		files = append(files, filepath.Join(paths.extension, name))
	}
	for _, path := range files {
		info, err := os.Lstat(path)
		if err != nil || !info.Mode().IsRegular() {
			return false
		}
	}
	return true
}

func launchInstalled(paths appPaths) error {
	command := exec.Command(paths.executable, "--first-run")
	command.Dir = paths.root
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := command.Start(); err != nil {
		return fmt.Errorf("start installed blocker: %w", err)
	}
	return nil
}

func randomHelperName() (string, error) {
	value := make([]byte, 12)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return uninstallHelperPrefix + hex.EncodeToString(value) + ".exe", nil
}

func prepareUninstallHelper(paths appPaths) error {
	name, err := randomHelperName()
	if err != nil {
		return fmt.Errorf("create uninstall helper name: %w", err)
	}
	helperPath := filepath.Join(os.TempDir(), name)
	if err := copyRegularFile(paths.executable, helperPath); err != nil {
		return fmt.Errorf("prepare uninstall helper: %w", err)
	}
	token, err := secureRandomToken()
	if err != nil {
		_ = os.Remove(helperPath)
		return fmt.Errorf("create uninstall authorization: %w", err)
	}
	if err := writeUninstallAuthorization(paths.uninstallAuth, uninstallAuthorization{
		Version:    1,
		ParentPID:  os.Getpid(),
		HelperPath: helperPath,
		TokenHash:  hashUninstallToken(token),
		ExpiresAt:  time.Now().UTC().Add(2 * time.Minute),
	}); err != nil {
		_ = os.Remove(helperPath)
		return fmt.Errorf("save uninstall authorization: %w", err)
	}
	command := exec.Command(helperPath, "--uninstall-helper", strconv.Itoa(os.Getpid()), token)
	command.Dir = os.TempDir()
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: createNoWindow}
	if err := command.Start(); err != nil {
		_ = os.Remove(helperPath)
		_ = os.Remove(paths.uninstallAuth)
		return fmt.Errorf("start uninstall helper: %w", err)
	}
	return nil
}

func cleanupOldHelpers(currentExecutable string) {
	matches, _ := filepath.Glob(filepath.Join(os.TempDir(), uninstallHelperPrefix+"*.exe"))
	oldestAllowed := time.Now().Add(-staleHelperAge)
	for _, match := range matches {
		if samePath(match, currentExecutable) || !validUninstallHelperPath(match) {
			continue
		}
		if info, err := os.Lstat(match); err == nil && info.Mode().IsRegular() && info.ModTime().Before(oldestAllowed) {
			_ = os.Remove(match)
		}
	}
}

func removeKnownInstalledFiles(paths appPaths) error {
	var firstErr error
	removeFile := func(path string) {
		if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) && firstErr == nil {
			firstErr = err
		}
	}
	removeFile(paths.runtime)
	removeFile(paths.settings)
	removeFile(paths.uninstallAuth)
	removeFile(paths.startHere)
	for _, name := range extensionFiles {
		removeFile(filepath.Join(paths.extension, name))
	}
	_ = os.Remove(paths.extension)
	removeFile(paths.executable)
	_ = os.Remove(paths.root)
	_ = os.Remove(paths.kiddoSproutRoot)
	return firstErr
}

type uninstallAuthorization struct {
	Version    int       `json:"version"`
	ParentPID  int       `json:"parentPid"`
	HelperPath string    `json:"helperPath"`
	TokenHash  string    `json:"tokenHash"`
	ExpiresAt  time.Time `json:"expiresAt"`
}

func hashUninstallToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return base64.RawStdEncoding.EncodeToString(hash[:])
}

func writeUninstallAuthorization(path string, value uninstallAuthorization) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	data = append(data, '\n')
	temporary, err := os.CreateTemp(filepath.Dir(path), ".uninstall-authorization-*.tmp")
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
	// Publish the complete authorization in one replacement operation so an
	// interrupted rewrite cannot strand uninstall with a deliberate delete gap.
	return os.Rename(temporaryPath, path)
}

func validUninstallHelperPath(path string) bool {
	if !samePath(filepath.Dir(path), os.TempDir()) {
		return false
	}
	name := filepath.Base(path)
	if !strings.HasPrefix(name, uninstallHelperPrefix) || !strings.HasSuffix(strings.ToLower(name), ".exe") {
		return false
	}
	hexPart := name[len(uninstallHelperPrefix) : len(name)-len(".exe")]
	decoded, err := hex.DecodeString(hexPart)
	return err == nil && len(decoded) == 12
}

func consumeUninstallAuthorization(paths appPaths, currentExecutable string, parentPID int, token string) error {
	if !validUninstallHelperPath(currentExecutable) {
		return errors.New("the uninstall helper is not in its expected temporary location")
	}
	pathInfo, err := os.Lstat(paths.uninstallAuth)
	if err != nil {
		return errors.New("parent uninstall approval was not found")
	}
	if !pathInfo.Mode().IsRegular() {
		return errors.New("parent uninstall approval is invalid")
	}
	file, err := os.Open(paths.uninstallAuth)
	if err != nil {
		return errors.New("parent uninstall approval was not found")
	}
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() || info.Size() <= 0 || info.Size() > 4096 {
		_ = file.Close()
		return errors.New("parent uninstall approval is invalid")
	}
	data, readErr := io.ReadAll(io.LimitReader(file, 4097))
	closeErr := file.Close()
	if readErr != nil || closeErr != nil || len(data) == 0 || len(data) > 4096 {
		return errors.New("parent uninstall approval could not be read")
	}
	var authorization uninstallAuthorization
	decoder := json.NewDecoder(strings.NewReader(string(data)))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&authorization); err != nil {
		return errors.New("parent uninstall approval is invalid")
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("parent uninstall approval contains extra data")
	}
	expectedHash, hashErr := base64.RawStdEncoding.DecodeString(authorization.TokenHash)
	actualHash, actualErr := base64.RawStdEncoding.DecodeString(hashUninstallToken(token))
	validHash := hashErr == nil && actualErr == nil && len(expectedHash) == sha256.Size && len(actualHash) == sha256.Size && subtle.ConstantTimeCompare(expectedHash, actualHash) == 1
	if authorization.Version != 1 || authorization.ParentPID != parentPID || !samePath(authorization.HelperPath, currentExecutable) || !validHash || time.Now().UTC().After(authorization.ExpiresAt) || authorization.ExpiresAt.After(time.Now().UTC().Add(3*time.Minute)) {
		return errors.New("parent uninstall approval did not match this helper")
	}
	if err := os.Remove(paths.uninstallAuth); err != nil {
		return fmt.Errorf("consume parent uninstall approval: %w", err)
	}
	return nil
}

func runUninstallHelper(parentPID int, token, currentExecutable string) error {
	paths, err := resolveAppPaths()
	if err != nil {
		return err
	}
	if err := consumeUninstallAuthorization(paths, currentExecutable, parentPID, token); err != nil {
		return err
	}
	if parentPID > 0 {
		waitForProcessExit(uint32(parentPID), 15*time.Second)
	}
	mutex, alreadyRunning, err := acquireSingleInstance()
	if err != nil {
		return fmt.Errorf("lock the installed blocker during removal: %w", err)
	}
	defer closeWindowsHandle(mutex)
	if alreadyRunning {
		return errors.New("another KiddoSprout Blocker copy started before removal could finish; close it and try uninstall again")
	}
	if err := deleteStartAtLogin(); err != nil {
		return fmt.Errorf("remove start-at-sign-in: %w", err)
	}
	deadline := time.Now().Add(15 * time.Second)
	for {
		err = removeKnownInstalledFiles(paths)
		if err == nil || time.Now().After(deadline) {
			break
		}
		time.Sleep(300 * time.Millisecond)
	}
	if err != nil {
		return fmt.Errorf("remove installed files: %w", err)
	}
	return nil
}
