package blocker

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	controlCookieName = "kiddosprout_control"
	maxRequestBytes   = 4096
	bootstrapLifetime = 2 * time.Minute
	maxBootstrapLinks = 16
)

var (
	ErrMalformedRequest = errors.New("the request was not valid JSON")
	ErrRequestTooLarge  = errors.New("the request was too large")
	ErrUninstallPending = errors.New("uninstall is already in progress")
)

type RuntimeStatus struct {
	LastBlockedName string    `json:"lastBlockedName,omitempty"`
	LastBlockedAt   time.Time `json:"lastBlockedAt,omitempty"`
	LastError       string    `json:"lastError,omitempty"`
	LastErrorAt     time.Time `json:"lastErrorAt,omitempty"`
	StartupWarning  string    `json:"startupWarning,omitempty"`
	InstallFolder   string    `json:"installFolder"`
	ExtensionFolder string    `json:"extensionFolder"`
	Version         string    `json:"version"`
}

type ControlActions struct {
	Runtime             func() RuntimeStatus
	OpenExtensionFolder func() error
	RequestQuit         func()
	RequestUninstall    func() error
}

type ControlServer struct {
	store            *Store
	origin           string
	host             string
	activationToken  string
	sessionToken     string
	csrfToken        string
	actions          ControlActions
	bootstrapMu      sync.Mutex
	bootstrapTokens  map[string]time.Time
	bootstrapOrder   []string
	actionMu         sync.Mutex
	uninstallPending bool
}

func randomToken() (string, error) {
	value := make([]byte, 32)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

func NewControlServer(store *Store, origin, activationToken string, actions ControlActions) (*ControlServer, error) {
	if store == nil {
		return nil, errors.New("settings store is required")
	}
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Scheme != "http" || parsed.Hostname() != "127.0.0.1" || parsed.User != nil || parsed.Path != "" || parsed.RawQuery != "" || parsed.Fragment != "" {
		return nil, errors.New("control origin must use an explicit 127.0.0.1 port")
	}
	port, err := strconv.Atoi(parsed.Port())
	if err != nil || port < 1 || port > 65535 {
		return nil, errors.New("control origin must use a valid 127.0.0.1 port")
	}
	parsedHost := parsed.Host
	if len(activationToken) < 32 {
		return nil, errors.New("activation token must contain at least 32 characters")
	}
	sessionToken, err := randomToken()
	if err != nil {
		return nil, fmt.Errorf("create session token: %w", err)
	}
	csrfToken, err := randomToken()
	if err != nil {
		return nil, fmt.Errorf("create CSRF token: %w", err)
	}
	return &ControlServer{
		store:           store,
		origin:          origin,
		host:            parsedHost,
		activationToken: activationToken,
		sessionToken:    sessionToken,
		csrfToken:       csrfToken,
		actions:         actions,
		bootstrapTokens: make(map[string]time.Time),
	}, nil
}

func (server *ControlServer) NewBootstrapURL() (string, error) {
	token, err := randomToken()
	if err != nil {
		return "", err
	}
	now := time.Now()
	server.bootstrapMu.Lock()
	activeOrder := server.bootstrapOrder[:0]
	for _, existing := range server.bootstrapOrder {
		expires, exists := server.bootstrapTokens[existing]
		if !exists || !now.Before(expires) {
			delete(server.bootstrapTokens, existing)
			continue
		}
		activeOrder = append(activeOrder, existing)
	}
	server.bootstrapOrder = activeOrder
	for len(server.bootstrapTokens) >= maxBootstrapLinks && len(server.bootstrapOrder) > 0 {
		oldest := server.bootstrapOrder[0]
		server.bootstrapOrder = server.bootstrapOrder[1:]
		delete(server.bootstrapTokens, oldest)
	}
	server.bootstrapTokens[token] = now.Add(bootstrapLifetime)
	server.bootstrapOrder = append(server.bootstrapOrder, token)
	server.bootstrapMu.Unlock()
	return server.origin + "/open/" + token, nil
}

func sameSecret(left, right string) bool {
	return len(left) == len(right) && len(left) > 0 && subtle.ConstantTimeCompare([]byte(left), []byte(right)) == 1
}

func (server *ControlServer) consumeBootstrap(token string) bool {
	server.bootstrapMu.Lock()
	defer server.bootstrapMu.Unlock()
	expires, exists := server.bootstrapTokens[token]
	delete(server.bootstrapTokens, token)
	return exists && time.Now().Before(expires)
}

func (server *ControlServer) Handler() http.Handler {
	return http.HandlerFunc(server.serveHTTP)
}

func secureHeaders(response http.ResponseWriter) {
	response.Header().Set("Cache-Control", "no-store, max-age=0")
	response.Header().Set("Pragma", "no-cache")
	response.Header().Set("Referrer-Policy", "no-referrer")
	response.Header().Set("X-Content-Type-Options", "nosniff")
	response.Header().Set("X-Frame-Options", "DENY")
	response.Header().Set("Cross-Origin-Resource-Policy", "same-origin")
}

func requestIsLocal(request *http.Request, expectedHost string) bool {
	if request.Host != expectedHost {
		return false
	}
	host, _, err := net.SplitHostPort(request.RemoteAddr)
	if err != nil {
		return false
	}
	return net.ParseIP(host) != nil && net.ParseIP(host).String() == "127.0.0.1"
}

func (server *ControlServer) serveHTTP(response http.ResponseWriter, request *http.Request) {
	secureHeaders(response)
	if !requestIsLocal(request, server.host) {
		http.Error(response, "Local KiddoSprout control only.", http.StatusForbidden)
		return
	}
	if request.URL.Path == "/internal/activate" {
		server.handleActivation(response, request)
		return
	}
	if strings.HasPrefix(request.URL.Path, "/open/") {
		server.handleBootstrap(response, request)
		return
	}
	if !server.hasSession(request) {
		http.Error(response, "Open KiddoSproutBlocker.exe again to reach this private control page.", http.StatusUnauthorized)
		return
	}
	switch {
	case request.Method == http.MethodGet && request.URL.Path == "/":
		server.renderControlPage(response)
	case request.Method == http.MethodGet && request.URL.Path == "/api/status":
		server.handleStatus(response)
	case request.Method == http.MethodPost && request.URL.Path == "/api/pin/create":
		server.handleCreatePIN(response, request)
	case request.Method == http.MethodPost && request.URL.Path == "/api/pin/change":
		server.handleChangePIN(response, request)
	case request.Method == http.MethodPost && request.URL.Path == "/api/start":
		server.handleStart(response, request)
	case request.Method == http.MethodPost && request.URL.Path == "/api/pause":
		server.handleProtectedAction(response, request, func() error { return server.store.SetEnabled(false) }, false)
	case request.Method == http.MethodPost && request.URL.Path == "/api/rules/add":
		server.handleRule(response, request, true)
	case request.Method == http.MethodPost && request.URL.Path == "/api/rules/remove":
		server.handleRule(response, request, false)
	case request.Method == http.MethodPost && request.URL.Path == "/api/open-extension":
		server.handleOpenExtension(response, request)
	case request.Method == http.MethodPost && request.URL.Path == "/api/quit":
		server.handleProtectedAction(response, request, nil, true)
	case request.Method == http.MethodPost && request.URL.Path == "/api/uninstall":
		server.handleUninstall(response, request)
	default:
		methods := map[string]string{
			"/":                   http.MethodGet,
			"/api/status":         http.MethodGet,
			"/api/pin/create":     http.MethodPost,
			"/api/pin/change":     http.MethodPost,
			"/api/start":          http.MethodPost,
			"/api/pause":          http.MethodPost,
			"/api/rules/add":      http.MethodPost,
			"/api/rules/remove":   http.MethodPost,
			"/api/open-extension": http.MethodPost,
			"/api/quit":           http.MethodPost,
			"/api/uninstall":      http.MethodPost,
		}
		if allowed, exists := methods[request.URL.Path]; exists {
			response.Header().Set("Allow", allowed)
			http.Error(response, "Method not allowed.", http.StatusMethodNotAllowed)
			return
		}
		http.Error(response, "Not found.", http.StatusNotFound)
	}
}

func (server *ControlServer) handleActivation(response http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		response.Header().Set("Allow", "POST")
		http.Error(response, "Method not allowed.", http.StatusMethodNotAllowed)
		return
	}
	if request.URL.RawQuery != "" {
		http.Error(response, "Activation denied.", http.StatusForbidden)
		return
	}
	request.Body = http.MaxBytesReader(response, request.Body, 1)
	body, readErr := io.ReadAll(request.Body)
	if len(body) != 0 || readErr != nil || !sameSecret(request.Header.Get("X-KiddoSprout-Activation"), server.activationToken) {
		http.Error(response, "Activation denied.", http.StatusForbidden)
		return
	}
	url, err := server.NewBootstrapURL()
	if err != nil {
		http.Error(response, "Control page could not open.", http.StatusInternalServerError)
		return
	}
	writeJSON(response, http.StatusOK, map[string]string{"url": url})
}

func (server *ControlServer) handleBootstrap(response http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		response.Header().Set("Allow", "GET")
		http.Error(response, "Method not allowed.", http.StatusMethodNotAllowed)
		return
	}
	if request.URL.RawQuery != "" {
		http.Error(response, "This one-time control link is not valid.", http.StatusUnauthorized)
		return
	}
	token := strings.TrimPrefix(request.URL.Path, "/open/")
	if strings.Contains(token, "/") || !server.consumeBootstrap(token) {
		http.Error(response, "This one-time control link has expired. Open the app again.", http.StatusUnauthorized)
		return
	}
	http.SetCookie(response, &http.Cookie{
		Name:     controlCookieName,
		Value:    server.sessionToken,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
	http.Redirect(response, request, "/", http.StatusSeeOther)
}

func (server *ControlServer) hasSession(request *http.Request) bool {
	cookie, err := request.Cookie(controlCookieName)
	return err == nil && sameSecret(cookie.Value, server.sessionToken)
}

func (server *ControlServer) validMutation(response http.ResponseWriter, request *http.Request) bool {
	if request.Method != http.MethodPost || request.URL.RawQuery != "" || request.Header.Get("Origin") != server.origin || !sameSecret(request.Header.Get("X-KiddoSprout-CSRF"), server.csrfToken) {
		http.Error(response, "That control request was rejected.", http.StatusForbidden)
		return false
	}
	mediaType, _, err := mime.ParseMediaType(request.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		http.Error(response, "KiddoSprout expected a JSON request.", http.StatusUnsupportedMediaType)
		return false
	}
	return true
}

func decodeJSON(response http.ResponseWriter, request *http.Request, destination any) error {
	request.Body = http.MaxBytesReader(response, request.Body, maxRequestBytes)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			return ErrRequestTooLarge
		}
		return fmt.Errorf("%w: %v", ErrMalformedRequest, err)
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			return ErrRequestTooLarge
		}
		if err == nil {
			return fmt.Errorf("%w: only one JSON value is allowed", ErrMalformedRequest)
		}
		return fmt.Errorf("%w: %v", ErrMalformedRequest, err)
	}
	return nil
}

type pinRequest struct {
	PIN string `json:"pin"`
}

type createPINRequest struct {
	PIN          string `json:"pin"`
	Confirmation string `json:"confirmation"`
}

type changePINRequest struct {
	Current      string `json:"current"`
	Replacement  string `json:"replacement"`
	Confirmation string `json:"confirmation"`
}

type ruleRequest struct {
	PIN            string `json:"pin"`
	ExecutableName string `json:"executableName"`
}

func (server *ControlServer) handleStatus(response http.ResponseWriter) {
	snapshot := server.store.Snapshot()
	runtime := RuntimeStatus{}
	if server.actions.Runtime != nil {
		runtime = server.actions.Runtime()
	}
	writeJSON(response, http.StatusOK, map[string]any{
		"enabled":               snapshot.Enabled,
		"pinConfigured":         snapshot.PINConfigured(),
		"manualExecutableNames": snapshot.ManualExecutableNames,
		"lockedUntil":           snapshot.LockedUntil,
		"knownLaunchers":        KnownGameNames(),
		"runtime":               runtime,
	})
}

func (server *ControlServer) handleCreatePIN(response http.ResponseWriter, request *http.Request) {
	if !server.validMutation(response, request) {
		return
	}
	var body createPINRequest
	if err := decodeJSON(response, request, &body); err != nil {
		writeAPIError(response, err)
		return
	}
	if err := server.store.CreatePIN(body.PIN, body.Confirmation); err != nil {
		writeAPIError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]string{"message": "Parent PIN saved. Protection is on."})
}

func (server *ControlServer) handleChangePIN(response http.ResponseWriter, request *http.Request) {
	if !server.validMutation(response, request) {
		return
	}
	var body changePINRequest
	if err := decodeJSON(response, request, &body); err != nil {
		writeAPIError(response, err)
		return
	}
	if err := server.store.ChangePIN(body.Current, body.Replacement, body.Confirmation, time.Now()); err != nil {
		writeAPIError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]string{"message": "Parent PIN changed."})
}

func (server *ControlServer) handleStart(response http.ResponseWriter, request *http.Request) {
	if !server.validMutation(response, request) {
		return
	}
	var body struct{}
	if err := decodeJSON(response, request, &body); err != nil {
		writeAPIError(response, err)
		return
	}
	if !server.store.Snapshot().PINConfigured() {
		writeAPIError(response, ErrPINNotConfigured)
		return
	}
	if err := server.store.SetEnabled(true); err != nil {
		writeAPIError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]string{"message": "Protection started."})
}

func (server *ControlServer) handleProtectedAction(response http.ResponseWriter, request *http.Request, action func() error, quit bool) {
	if !server.validMutation(response, request) {
		return
	}
	var body pinRequest
	if err := decodeJSON(response, request, &body); err != nil {
		writeAPIError(response, err)
		return
	}
	if err := server.store.VerifyPIN(body.PIN, time.Now()); err != nil {
		writeAPIError(response, err)
		return
	}
	if action != nil {
		if err := action(); err != nil {
			writeAPIError(response, err)
			return
		}
	}
	message := "Protection paused."
	if quit {
		message = "KiddoSprout Blocker is closing. It will start again at the next sign-in."
	}
	writeJSON(response, http.StatusOK, map[string]string{"message": message})
	if quit && server.actions.RequestQuit != nil {
		time.AfterFunc(150*time.Millisecond, server.actions.RequestQuit)
	}
}

func (server *ControlServer) handleRule(response http.ResponseWriter, request *http.Request, add bool) {
	if !server.validMutation(response, request) {
		return
	}
	var body ruleRequest
	if err := decodeJSON(response, request, &body); err != nil {
		writeAPIError(response, err)
		return
	}
	if err := server.store.VerifyPIN(body.PIN, time.Now()); err != nil {
		writeAPIError(response, err)
		return
	}
	var err error
	if add {
		err = server.store.AddManualExecutable(body.ExecutableName)
	} else {
		err = server.store.RemoveManualExecutable(body.ExecutableName)
	}
	if err != nil {
		writeAPIError(response, err)
		return
	}
	message := "Manual block rule removed."
	if add {
		message = "Manual block rule added."
	}
	writeJSON(response, http.StatusOK, map[string]string{"message": message})
}

func (server *ControlServer) handleOpenExtension(response http.ResponseWriter, request *http.Request) {
	if !server.validMutation(response, request) {
		return
	}
	var body struct{}
	if err := decodeJSON(response, request, &body); err != nil {
		writeAPIError(response, err)
		return
	}
	if server.actions.OpenExtensionFolder == nil {
		writeAPIError(response, errors.New("the browser extension folder is unavailable"))
		return
	}
	if err := server.actions.OpenExtensionFolder(); err != nil {
		writeAPIError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]string{"message": "Browser extension folder opened."})
}

func (server *ControlServer) handleUninstall(response http.ResponseWriter, request *http.Request) {
	if !server.validMutation(response, request) {
		return
	}
	var body pinRequest
	if err := decodeJSON(response, request, &body); err != nil {
		writeAPIError(response, err)
		return
	}
	if err := server.store.VerifyPIN(body.PIN, time.Now()); err != nil {
		writeAPIError(response, err)
		return
	}
	server.actionMu.Lock()
	if server.uninstallPending {
		server.actionMu.Unlock()
		writeAPIError(response, ErrUninstallPending)
		return
	}
	server.uninstallPending = true
	server.actionMu.Unlock()
	uninstallStarted := false
	defer func() {
		if uninstallStarted {
			return
		}
		server.actionMu.Lock()
		server.uninstallPending = false
		server.actionMu.Unlock()
	}()
	if server.actions.RequestUninstall == nil {
		writeAPIError(response, errors.New("uninstall is unavailable"))
		return
	}
	if err := server.actions.RequestUninstall(); err != nil {
		writeAPIError(response, err)
		return
	}
	uninstallStarted = true
	writeJSON(response, http.StatusOK, map[string]string{"message": "Uninstall approved. KiddoSprout is removing this current-user test copy."})
	if server.actions.RequestQuit != nil {
		time.AfterFunc(150*time.Millisecond, server.actions.RequestQuit)
	}
}

func writeAPIError(response http.ResponseWriter, err error) {
	status := http.StatusBadRequest
	if errors.Is(err, ErrRequestTooLarge) {
		status = http.StatusRequestEntityTooLarge
	} else if errors.Is(err, ErrWrongPIN) {
		status = http.StatusForbidden
	} else if errors.Is(err, ErrPINLocked) {
		status = http.StatusTooManyRequests
	} else if errors.Is(err, ErrUninstallPending) {
		status = http.StatusConflict
	} else if !errors.Is(err, ErrMalformedRequest) && !errors.Is(err, ErrInvalidPIN) && !errors.Is(err, ErrPINMismatch) && !errors.Is(err, ErrPINAlreadyConfigured) && !errors.Is(err, ErrPINNotConfigured) && !errors.Is(err, ErrRuleAlreadyExists) && !errors.Is(err, ErrRuleNotFound) && !errors.Is(err, ErrTooManyRules) && !errors.Is(err, ErrInvalidExecutableName) {
		status = http.StatusInternalServerError
	}
	writeJSON(response, status, map[string]string{"error": err.Error()})
}

func writeJSON(response http.ResponseWriter, status int, payload any) {
	data, err := json.Marshal(payload)
	if err != nil {
		http.Error(response, "Response could not be created.", http.StatusInternalServerError)
		return
	}
	response.Header().Set("Content-Type", "application/json; charset=utf-8")
	response.WriteHeader(status)
	_, _ = response.Write(append(data, '\n'))
}

func (server *ControlServer) renderControlPage(response http.ResponseWriter) {
	nonce, err := randomToken()
	if err != nil {
		http.Error(response, "Control page could not open.", http.StatusInternalServerError)
		return
	}
	response.Header().Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-"+nonce+"'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
	response.Header().Set("Content-Type", "text/html; charset=utf-8")
	page := strings.NewReplacer("__NONCE__", nonce, "__CSRF__", server.csrfToken).Replace(controlPageHTML)
	_, _ = io.WriteString(response, page)
}
