package blocker

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const testControlOrigin = "http://127.0.0.1:43127"

func testControlServer(t *testing.T, actions ControlActions) (*ControlServer, *Store) {
	t.Helper()
	store, err := OpenStore(filepath.Join(t.TempDir(), "settings.json"))
	if err != nil {
		t.Fatal(err)
	}
	server, err := NewControlServer(store, testControlOrigin, "activation-secret-for-tests-1234567890", actions)
	if err != nil {
		t.Fatal(err)
	}
	return server, store
}

func localRequest(method, target, body string) *http.Request {
	request := httptest.NewRequest(method, testControlOrigin+target, strings.NewReader(body))
	request.Host = "127.0.0.1:43127"
	request.RemoteAddr = "127.0.0.1:50123"
	return request
}

func authenticatedMutation(server *ControlServer, target, body string) *http.Request {
	request := localRequest(http.MethodPost, target, body)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Origin", testControlOrigin)
	request.Header.Set("X-KiddoSprout-CSRF", server.csrfToken)
	request.AddCookie(&http.Cookie{Name: controlCookieName, Value: server.sessionToken})
	return request
}

func TestControlServerRejectsNonLocalAndUnauthenticatedRequests(t *testing.T) {
	server, _ := testControlServer(t, ControlActions{})

	nonLocal := localRequest(http.MethodGet, "/", "")
	nonLocal.RemoteAddr = "192.0.2.8:50123"
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, nonLocal)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("non-local status = %d", recorder.Code)
	}

	unauthenticated := localRequest(http.MethodGet, "/api/status", "")
	recorder = httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, unauthenticated)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated status = %d", recorder.Code)
	}
}

func TestStatusIncludesRuntimeWarnings(t *testing.T) {
	warningTime := time.Date(2026, time.September, 13, 12, 0, 0, 0, time.UTC)
	server, _ := testControlServer(t, ControlActions{Runtime: func() RuntimeStatus {
		return RuntimeStatus{
			LastError:      "KiddoSprout could not inspect running apps.",
			LastErrorAt:    warningTime,
			StartupWarning: "Windows could not add KiddoSprout to start-at-sign-in.",
		}
	}})
	request := localRequest(http.MethodGet, "/api/status", "")
	request.AddCookie(&http.Cookie{Name: controlCookieName, Value: server.sessionToken})
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("status response = %d; body = %s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		Runtime RuntimeStatus `json:"runtime"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Runtime.LastError != "KiddoSprout could not inspect running apps." || !payload.Runtime.LastErrorAt.Equal(warningTime) {
		t.Fatalf("unexpected runtime error: %#v", payload.Runtime)
	}
	if payload.Runtime.StartupWarning != "Windows could not add KiddoSprout to start-at-sign-in." {
		t.Fatalf("unexpected startup warning: %#v", payload.Runtime)
	}
}

func TestBootstrapLinkIsOneTime(t *testing.T) {
	server, _ := testControlServer(t, ControlActions{})
	bootstrapURL, err := server.NewBootstrapURL()
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := url.Parse(bootstrapURL)
	if err != nil {
		t.Fatal(err)
	}

	request := localRequest(http.MethodGet, parsed.Path, "")
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, request)
	if recorder.Code != http.StatusSeeOther {
		t.Fatalf("first bootstrap status = %d", recorder.Code)
	}
	if len(recorder.Result().Cookies()) != 1 || !recorder.Result().Cookies()[0].HttpOnly || recorder.Result().Cookies()[0].SameSite != http.SameSiteStrictMode {
		t.Fatal("bootstrap did not create the expected protected control cookie")
	}

	recorder = httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, localRequest(http.MethodGet, parsed.Path, ""))
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("reused bootstrap status = %d", recorder.Code)
	}
}

func TestBootstrapLinksAreBoundedAndQueriesDoNotConsumeThem(t *testing.T) {
	server, _ := testControlServer(t, ControlActions{})
	paths := make([]string, 0, maxBootstrapLinks+1)
	for index := 0; index < maxBootstrapLinks+1; index++ {
		bootstrapURL, err := server.NewBootstrapURL()
		if err != nil {
			t.Fatal(err)
		}
		parsed, err := url.Parse(bootstrapURL)
		if err != nil {
			t.Fatal(err)
		}
		paths = append(paths, parsed.Path)
	}

	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, localRequest(http.MethodGet, paths[0], ""))
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("evicted bootstrap status = %d", recorder.Code)
	}

	recorder = httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, localRequest(http.MethodGet, paths[len(paths)-1]+"?unexpected=1", ""))
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("queried bootstrap status = %d", recorder.Code)
	}
	recorder = httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, localRequest(http.MethodGet, paths[len(paths)-1], ""))
	if recorder.Code != http.StatusSeeOther {
		t.Fatalf("valid bootstrap after rejected query status = %d", recorder.Code)
	}
}

func TestActivationRejectsQueries(t *testing.T) {
	server, _ := testControlServer(t, ControlActions{})
	request := localRequest(http.MethodPost, "/internal/activate?unexpected=1", "")
	request.Header.Set("X-KiddoSprout-Activation", server.activationToken)
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, request)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("activation with query status = %d", recorder.Code)
	}
}

func TestMutationsRequireOriginCSRFAndValidSizedJSON(t *testing.T) {
	server, _ := testControlServer(t, ControlActions{})

	wrongOrigin := authenticatedMutation(server, "/api/start", `{}`)
	wrongOrigin.Header.Set("Origin", "http://example.test")
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, wrongOrigin)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("wrong-origin status = %d", recorder.Code)
	}

	malformed := authenticatedMutation(server, "/api/start", `{`)
	recorder = httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, malformed)
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("malformed JSON status = %d; body = %s", recorder.Code, recorder.Body.String())
	}

	oversized := authenticatedMutation(server, "/api/start", `{"padding":"`+strings.Repeat("x", maxRequestBytes)+`"}`)
	recorder = httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, oversized)
	if recorder.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("oversized JSON status = %d; body = %s", recorder.Code, recorder.Body.String())
	}
}

func TestUninstallReportsHelperFailureBeforeSuccess(t *testing.T) {
	helperErr := errors.New("helper could not start")
	server, store := testControlServer(t, ControlActions{RequestUninstall: func() error { return helperErr }})
	if err := store.CreatePIN("2468", "2468"); err != nil {
		t.Fatal(err)
	}
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, authenticatedMutation(server, "/api/uninstall", `{"pin":"2468"}`))
	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("helper failure status = %d; body = %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), helperErr.Error()) {
		t.Fatalf("helper failure body = %s", recorder.Body.String())
	}
}

func TestSuccessfulUninstallRequestsQuitAfterResponse(t *testing.T) {
	quit := make(chan struct{}, 1)
	server, store := testControlServer(t, ControlActions{
		RequestUninstall: func() error { return nil },
		RequestQuit:      func() { quit <- struct{}{} },
	})
	if err := store.CreatePIN("2468", "2468"); err != nil {
		t.Fatal(err)
	}
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, authenticatedMutation(server, "/api/uninstall", `{"pin":"2468"}`))
	if recorder.Code != http.StatusOK {
		t.Fatalf("uninstall status = %d; body = %s", recorder.Code, recorder.Body.String())
	}
	select {
	case <-quit:
	case <-time.After(time.Second):
		t.Fatal("successful uninstall did not request app shutdown")
	}
}

func TestDuplicateUninstallRequestDoesNotStartAnotherHelper(t *testing.T) {
	helperStarts := 0
	server, store := testControlServer(t, ControlActions{
		RequestUninstall: func() error {
			helperStarts++
			return nil
		},
	})
	if err := store.CreatePIN("2468", "2468"); err != nil {
		t.Fatal(err)
	}
	first := httptest.NewRecorder()
	server.Handler().ServeHTTP(first, authenticatedMutation(server, "/api/uninstall", `{"pin":"2468"}`))
	if first.Code != http.StatusOK {
		t.Fatalf("first uninstall status = %d; body = %s", first.Code, first.Body.String())
	}
	second := httptest.NewRecorder()
	server.Handler().ServeHTTP(second, authenticatedMutation(server, "/api/uninstall", `{"pin":"2468"}`))
	if second.Code != http.StatusConflict {
		t.Fatalf("duplicate uninstall status = %d; body = %s", second.Code, second.Body.String())
	}
	if helperStarts != 1 {
		t.Fatalf("uninstall helper starts = %d, want 1", helperStarts)
	}
}

func TestFailedUninstallCanBeRetried(t *testing.T) {
	helperStarts := 0
	server, store := testControlServer(t, ControlActions{
		RequestUninstall: func() error {
			helperStarts++
			if helperStarts == 1 {
				return errors.New("first start failed")
			}
			return nil
		},
	})
	if err := store.CreatePIN("2468", "2468"); err != nil {
		t.Fatal(err)
	}
	first := httptest.NewRecorder()
	server.Handler().ServeHTTP(first, authenticatedMutation(server, "/api/uninstall", `{"pin":"2468"}`))
	if first.Code != http.StatusInternalServerError {
		t.Fatalf("failed uninstall status = %d", first.Code)
	}
	second := httptest.NewRecorder()
	server.Handler().ServeHTTP(second, authenticatedMutation(server, "/api/uninstall", `{"pin":"2468"}`))
	if second.Code != http.StatusOK {
		t.Fatalf("retry uninstall status = %d; body = %s", second.Code, second.Body.String())
	}
}

func TestControlPageDoesNotUsePlaintextPINPrompt(t *testing.T) {
	if strings.Contains(controlPageHTML, "prompt(") {
		t.Fatal("control page must not collect a parent PIN with a plaintext browser prompt")
	}
	if !strings.Contains(controlPageHTML, "Blocked this app") && !strings.Contains(controlPageHTML, "Known launchers") {
		t.Fatal("control page is missing blocker status guidance")
	}
	if !strings.Contains(controlPageHTML, "pendingForms.has(form)") || !strings.Contains(controlPageHTML, `form.setAttribute("aria-busy","true")`) {
		t.Fatal("control page must prevent duplicate PIN submissions while a request is pending")
	}
	if !strings.Contains(controlPageHTML, `.replace(/\s/g,"")`) || strings.Contains(controlPageHTML, `.replace(/\D/g,"")`) {
		t.Fatal("PIN fields must remove spaces without silently deleting other invalid characters")
	}
	if strings.Contains(controlPageHTML, `.slice(0,8)`) {
		t.Fatal("PIN fields must not silently truncate an invalid value into a different valid PIN")
	}
	if strings.Contains(controlPageHTML, `maxlength="8"`) {
		t.Fatal("PIN fields must not truncate a pasted, space-separated PIN before spaces are removed")
	}
	if !strings.Contains(controlPageHTML, `submit(form,"/api/uninstall"`) {
		t.Fatal("uninstall must use the duplicate-submission guard")
	}
	if !strings.Contains(controlPageHTML, `id="runtime-warning"`) || !strings.Contains(controlPageHTML, `role="alert"`) {
		t.Fatal("control page must expose runtime protection failures as an alert")
	}
	if !strings.Contains(controlPageHTML, `runtime.startupWarning`) || !strings.Contains(controlPageHTML, `runtime.lastError`) {
		t.Fatal("control page must render startup and process-monitor failures")
	}
}
