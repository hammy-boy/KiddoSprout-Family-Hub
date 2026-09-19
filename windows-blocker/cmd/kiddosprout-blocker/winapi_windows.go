//go:build windows

package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
	"unsafe"
)

const (
	th32csSnapProcess              = 0x00000002
	processTerminate               = 0x0001
	processQueryLimitedInformation = 0x1000
	synchronize                    = 0x00100000
	errorAlreadyExists             = syscall.Errno(183)
	errorInsufficientBuffer        = syscall.Errno(122)
	errorNoMoreFiles               = syscall.Errno(18)
	errorFileNotFound              = syscall.Errno(2)
	waitObject0                    = 0x00000000
	wmClose                        = 0x0010
	keySetValue                    = 0x0002
	regSZ                          = 1
	hkeyCurrentUser                = 0x80000001
	swShowNormal                   = 1
	mbOK                           = 0x00000000
	mbIconInformation              = 0x00000040
	mbIconError                    = 0x00000010
	mbSetForeground                = 0x00010000
	createNoWindow                 = 0x08000000
	maxPathCharacters              = 32768
	gracefulCloseTimeout           = 1500 * time.Millisecond
	forcedExitConfirmationTimeout  = 2 * time.Second
)

var (
	kernel32DLL                    = syscall.NewLazyDLL("kernel32.dll")
	procGetSystemDirectoryW        = kernel32DLL.NewProc("GetSystemDirectoryW")
	procCreateMutexW               = kernel32DLL.NewProc("CreateMutexW")
	procCloseHandle                = kernel32DLL.NewProc("CloseHandle")
	procCreateToolhelp32Snapshot   = kernel32DLL.NewProc("CreateToolhelp32Snapshot")
	procProcess32FirstW            = kernel32DLL.NewProc("Process32FirstW")
	procProcess32NextW             = kernel32DLL.NewProc("Process32NextW")
	procProcessIDToSessionID       = kernel32DLL.NewProc("ProcessIdToSessionId")
	procOpenProcess                = kernel32DLL.NewProc("OpenProcess")
	procQueryFullProcessImageNameW = kernel32DLL.NewProc("QueryFullProcessImageNameW")
	procTerminateProcess           = kernel32DLL.NewProc("TerminateProcess")
	procWaitForSingleObject        = kernel32DLL.NewProc("WaitForSingleObject")
	systemDLLFolder                = getSystemDLLFolder()
	advapi32DLL                    = syscall.NewLazyDLL(filepath.Join(systemDLLFolder, "advapi32.dll"))
	shell32DLL                     = syscall.NewLazyDLL(filepath.Join(systemDLLFolder, "shell32.dll"))
	user32DLL                      = syscall.NewLazyDLL(filepath.Join(systemDLLFolder, "user32.dll"))
	procRegCreateKeyExW            = advapi32DLL.NewProc("RegCreateKeyExW")
	procRegSetValueExW             = advapi32DLL.NewProc("RegSetValueExW")
	procRegDeleteValueW            = advapi32DLL.NewProc("RegDeleteValueW")
	procRegCloseKey                = advapi32DLL.NewProc("RegCloseKey")
	procShellExecuteW              = shell32DLL.NewProc("ShellExecuteW")
	procEnumWindows                = user32DLL.NewProc("EnumWindows")
	procGetWindowThreadProcessID   = user32DLL.NewProc("GetWindowThreadProcessId")
	procPostMessageW               = user32DLL.NewProc("PostMessageW")
	procMessageBoxW                = user32DLL.NewProc("MessageBoxW")
)

func getSystemDLLFolder() string {
	buffer := make([]uint16, 32768)
	result, _, _ := procGetSystemDirectoryW.Call(
		uintptr(unsafe.Pointer(&buffer[0])),
		uintptr(len(buffer)),
	)
	if result > 0 && result < uintptr(len(buffer)) {
		return syscall.UTF16ToString(buffer[:result])
	}
	root := strings.TrimSpace(os.Getenv("SystemRoot"))
	if root == "" || !filepath.IsAbs(root) {
		root = `C:\Windows`
	}
	return filepath.Join(root, "System32")
}

func utf16Pointer(value string) (*uint16, error) {
	return syscall.UTF16PtrFromString(value)
}

func acquireSingleInstance() (syscall.Handle, bool, error) {
	name, err := utf16Pointer(`Local\KiddoSproutBlocker-v1`)
	if err != nil {
		return 0, false, err
	}
	result, _, callErr := procCreateMutexW.Call(0, 0, uintptr(unsafe.Pointer(name)))
	if result == 0 {
		return 0, false, fmt.Errorf("create single-instance lock: %w", callErr)
	}
	alreadyRunning := errors.Is(callErr, errorAlreadyExists)
	return syscall.Handle(result), alreadyRunning, nil
}

func closeWindowsHandle(handle syscall.Handle) {
	if handle != 0 && handle != syscall.InvalidHandle {
		_, _, _ = procCloseHandle.Call(uintptr(handle))
	}
}

type processEntry32 struct {
	Size              uint32
	Usage             uint32
	ProcessID         uint32
	DefaultHeapID     uintptr
	ModuleID          uint32
	Threads           uint32
	ParentProcessID   uint32
	PriorityClassBase int32
	Flags             uint32
	ExecutableFile    [260]uint16
}

// Both distributed targets are 64-bit. PROCESSENTRY32W is 568 bytes on
// Windows x64 and ARM64; these assertions stop a layout regression at build.
var _ [568 - int(unsafe.Sizeof(processEntry32{}))]byte
var _ [int(unsafe.Sizeof(processEntry32{})) - 568]byte

type processCandidate struct {
	PID  uint32
	Name string
	Path string
}

func sessionIDForProcess(pid uint32) (uint32, error) {
	var sessionID uint32
	result, _, callErr := procProcessIDToSessionID.Call(uintptr(pid), uintptr(unsafe.Pointer(&sessionID)))
	if result == 0 {
		return 0, callErr
	}
	return sessionID, nil
}

func fullProcessPath(handle syscall.Handle) (string, error) {
	bufferSize := uint32(512)
	for {
		buffer := make([]uint16, bufferSize)
		pathSize := bufferSize
		result, _, callErr := procQueryFullProcessImageNameW.Call(
			uintptr(handle),
			0,
			uintptr(unsafe.Pointer(&buffer[0])),
			uintptr(unsafe.Pointer(&pathSize)),
		)
		if result != 0 {
			if pathSize > uint32(len(buffer)) {
				return "", errors.New("Windows returned an invalid process path length")
			}
			return syscall.UTF16ToString(buffer[:pathSize]), nil
		}
		if !errors.Is(callErr, errorInsufficientBuffer) || bufferSize >= maxPathCharacters {
			return "", callErr
		}
		bufferSize *= 2
		if bufferSize > maxPathCharacters {
			bufferSize = maxPathCharacters
		}
	}
}

func currentSessionProcesses() ([]processCandidate, error) {
	currentSession, err := sessionIDForProcess(uint32(os.Getpid()))
	if err != nil {
		return nil, fmt.Errorf("read current Windows session: %w", err)
	}
	snapshotResult, _, callErr := procCreateToolhelp32Snapshot.Call(th32csSnapProcess, 0)
	snapshot := syscall.Handle(snapshotResult)
	if snapshot == syscall.InvalidHandle {
		return nil, fmt.Errorf("create process snapshot: %w", callErr)
	}
	defer closeWindowsHandle(snapshot)
	entry := processEntry32{Size: uint32(unsafe.Sizeof(processEntry32{}))}
	result, _, firstErr := procProcess32FirstW.Call(uintptr(snapshot), uintptr(unsafe.Pointer(&entry)))
	if result == 0 {
		if errors.Is(firstErr, errorNoMoreFiles) {
			return nil, nil
		}
		return nil, fmt.Errorf("read first process: %w", firstErr)
	}
	candidates := make([]processCandidate, 0, 128)
	for {
		pid := entry.ProcessID
		if pid != 0 && pid != uint32(os.Getpid()) {
			if session, sessionErr := sessionIDForProcess(pid); sessionErr == nil && session == currentSession {
				handleResult, _, _ := procOpenProcess.Call(processQueryLimitedInformation, 0, uintptr(pid))
				handle := syscall.Handle(handleResult)
				if handle != 0 {
					path, pathErr := fullProcessPath(handle)
					closeWindowsHandle(handle)
					if pathErr == nil && path != "" {
						candidates = append(candidates, processCandidate{
							PID:  pid,
							Name: syscall.UTF16ToString(entry.ExecutableFile[:]),
							Path: path,
						})
					}
				}
			}
		}
		entry = processEntry32{Size: uint32(unsafe.Sizeof(processEntry32{}))}
		result, _, nextErr := procProcess32NextW.Call(uintptr(snapshot), uintptr(unsafe.Pointer(&entry)))
		if result == 0 {
			if errors.Is(nextErr, errorNoMoreFiles) {
				break
			}
			return nil, fmt.Errorf("read next process: %w", nextErr)
		}
	}
	return candidates, nil
}

func terminateMatchingProcess(candidate processCandidate, expectedSession uint32, stillBlocked func() bool) error {
	handleResult, _, callErr := procOpenProcess.Call(
		processTerminate|processQueryLimitedInformation|synchronize,
		0,
		uintptr(candidate.PID),
	)
	handle := syscall.Handle(handleResult)
	if handle == 0 {
		return callErr
	}
	defer closeWindowsHandle(handle)
	session, err := sessionIDForProcess(candidate.PID)
	if err != nil || session != expectedSession {
		return errors.New("the process changed Windows sessions")
	}
	path, err := fullProcessPath(handle)
	if err != nil {
		return err
	}
	if !strings.EqualFold(filepath.Clean(path), filepath.Clean(candidate.Path)) || !strings.EqualFold(filepath.Base(path), candidate.Name) {
		return errors.New("the process changed before it could be blocked")
	}
	if processHandleExited(handle, 0) {
		return errors.New("the process exited before it could be blocked")
	}
	if stillBlocked != nil && !stillBlocked() {
		return errors.New("protection changed before the process could be closed")
	}
	if requestGracefulProcessClose(candidate.PID) && processHandleExited(handle, gracefulCloseTimeout) {
		return nil
	}
	if stillBlocked != nil && !stillBlocked() {
		return errors.New("protection changed before the process was force-closed")
	}
	result, _, terminateErr := procTerminateProcess.Call(uintptr(handle), 1)
	if result == 0 {
		if processHandleExited(handle, 0) {
			return nil
		}
		return terminateErr
	}
	if !processHandleExited(handle, forcedExitConfirmationTimeout) {
		return errors.New("Windows did not confirm that the process closed")
	}
	return nil
}

type closeWindowsRequest struct {
	pid    uint32
	posted bool
}

var (
	closeWindowsMu            sync.Mutex
	activeCloseWindowsRequest atomic.Pointer[closeWindowsRequest]
)

var closeWindowCallback = syscall.NewCallback(func(window uintptr, _ uintptr) uintptr {
	request := activeCloseWindowsRequest.Load()
	if request == nil {
		return 0
	}
	var pid uint32
	_, _, _ = procGetWindowThreadProcessID.Call(window, uintptr(unsafe.Pointer(&pid)))
	if pid == request.pid {
		result, _, _ := procPostMessageW.Call(window, wmClose, 0, 0)
		if result != 0 {
			request.posted = true
		}
	}
	return 1
})

func requestGracefulProcessClose(pid uint32) bool {
	closeWindowsMu.Lock()
	defer closeWindowsMu.Unlock()
	request := &closeWindowsRequest{pid: pid}
	activeCloseWindowsRequest.Store(request)
	defer activeCloseWindowsRequest.Store(nil)
	_, _, _ = procEnumWindows.Call(closeWindowCallback, 0)
	return request.posted
}

func processHandleExited(handle syscall.Handle, timeout time.Duration) bool {
	milliseconds := timeout.Milliseconds()
	if milliseconds < 0 {
		milliseconds = 0
	}
	if milliseconds > int64(^uint32(0)-1) {
		milliseconds = int64(^uint32(0) - 1)
	}
	result, _, _ := procWaitForSingleObject.Call(uintptr(handle), uintptr(uint32(milliseconds)))
	return result == waitObject0
}

func waitForProcessExit(pid uint32, timeout time.Duration) {
	handleResult, _, _ := procOpenProcess.Call(synchronize, 0, uintptr(pid))
	handle := syscall.Handle(handleResult)
	if handle == 0 {
		return
	}
	defer closeWindowsHandle(handle)
	_ = processHandleExited(handle, timeout)
}

func shellOpen(target string) error {
	verb, err := utf16Pointer("open")
	if err != nil {
		return err
	}
	targetPointer, err := utf16Pointer(target)
	if err != nil {
		return err
	}
	result, _, _ := procShellExecuteW.Call(
		0,
		uintptr(unsafe.Pointer(verb)),
		uintptr(unsafe.Pointer(targetPointer)),
		0,
		0,
		swShowNormal,
	)
	if result <= 32 {
		return fmt.Errorf("Windows could not open that item (code %d)", result)
	}
	return nil
}

func showMessage(title, message string, errorMessage bool) {
	titlePointer, titleErr := utf16Pointer(title)
	messagePointer, messageErr := utf16Pointer(message)
	if titleErr != nil || messageErr != nil {
		return
	}
	flags := uintptr(mbOK | mbSetForeground | mbIconInformation)
	if errorMessage {
		flags = mbOK | mbSetForeground | mbIconError
	}
	_, _, _ = procMessageBoxW.Call(0, uintptr(unsafe.Pointer(messagePointer)), uintptr(unsafe.Pointer(titlePointer)), flags)
}

const runKeyPath = `Software\Microsoft\Windows\CurrentVersion\Run`
const runValueName = "KiddoSproutBlocker"

func setStartAtLogin(executable string) error {
	command, err := startAtLoginCommand(executable)
	if err != nil {
		return err
	}
	keyPath, err := utf16Pointer(runKeyPath)
	if err != nil {
		return err
	}
	var key syscall.Handle
	result, _, _ := procRegCreateKeyExW.Call(
		hkeyCurrentUser,
		uintptr(unsafe.Pointer(keyPath)),
		0,
		0,
		0,
		keySetValue,
		0,
		uintptr(unsafe.Pointer(&key)),
		0,
	)
	if result != 0 {
		return syscall.Errno(result)
	}
	defer func() { _, _, _ = procRegCloseKey.Call(uintptr(key)) }()
	valueName, err := utf16Pointer(runValueName)
	if err != nil {
		return err
	}
	data, err := syscall.UTF16FromString(command)
	if err != nil {
		return err
	}
	result, _, _ = procRegSetValueExW.Call(
		uintptr(key),
		uintptr(unsafe.Pointer(valueName)),
		0,
		regSZ,
		uintptr(unsafe.Pointer(&data[0])),
		uintptr(len(data)*2),
	)
	if result != 0 {
		return syscall.Errno(result)
	}
	return nil
}

func deleteStartAtLogin() error {
	keyPath, err := utf16Pointer(runKeyPath)
	if err != nil {
		return err
	}
	var key syscall.Handle
	result, _, _ := procRegCreateKeyExW.Call(
		hkeyCurrentUser,
		uintptr(unsafe.Pointer(keyPath)),
		0,
		0,
		0,
		keySetValue,
		0,
		uintptr(unsafe.Pointer(&key)),
		0,
	)
	if result != 0 {
		return syscall.Errno(result)
	}
	defer func() { _, _, _ = procRegCloseKey.Call(uintptr(key)) }()
	valueName, err := utf16Pointer(runValueName)
	if err != nil {
		return err
	}
	result, _, _ = procRegDeleteValueW.Call(uintptr(key), uintptr(unsafe.Pointer(valueName)))
	if result != 0 && syscall.Errno(result) != errorFileNotFound {
		return syscall.Errno(result)
	}
	return nil
}
