package main

import (
	"encoding/base64"
	"errors"
	"net/http"
	"strings"
	"testing"
)

func TestBackgroundLaunchIntent(t *testing.T) {
	for _, test := range []struct {
		name      string
		arguments []string
		want      bool
	}{
		{name: "startup argument", arguments: []string{"--background"}, want: true},
		{name: "normal launch", arguments: nil, want: false},
		{name: "unknown argument", arguments: []string{"--first-run"}, want: false},
		{name: "background plus unexpected argument", arguments: []string{"--background", "extra"}, want: false},
	} {
		t.Run(test.name, func(t *testing.T) {
			if got := isBackgroundLaunch(test.arguments); got != test.want {
				t.Fatalf("isBackgroundLaunch(%q) = %t, want %t", test.arguments, got, test.want)
			}
		})
	}
	if shouldOpenExistingControl(true) {
		t.Fatal("a duplicate start-at-login launch must stay silent")
	}
	if !shouldOpenExistingControl(false) {
		t.Fatal("a normal duplicate launch must bring back the control page")
	}
}

func TestStartAtLoginCommand(t *testing.T) {
	command, err := startAtLoginCommand(`C:\Program Files\KiddoSprout\KiddoSproutBlocker.exe`)
	if err != nil {
		t.Fatal(err)
	}
	if want := `"C:\Program Files\KiddoSprout\KiddoSproutBlocker.exe" --background`; command != want {
		t.Fatalf("startAtLoginCommand() = %q, want %q", command, want)
	}

	// Windows measures this registry command in UTF-16 code units. Counting UTF-8
	// bytes instead rejects valid paths belonging to users with non-ASCII names.
	unicodePath := `C:\Users\` + strings.Repeat("é", 120) + `\KiddoSproutBlocker.exe`
	if _, err := startAtLoginCommand(unicodePath); err != nil {
		t.Fatalf("valid UTF-16-sized command was rejected: %v", err)
	}
	if _, err := startAtLoginCommand(`C:\` + strings.Repeat("a", 260) + `.exe`); err == nil {
		t.Fatal("oversized Windows Run command was accepted")
	}
}

func TestLocalControlOriginValidation(t *testing.T) {
	for _, origin := range []string{"http://127.0.0.1:1", "http://127.0.0.1:65535"} {
		if !validLocalControlOrigin(origin) {
			t.Errorf("validLocalControlOrigin(%q) = false", origin)
		}
	}
	for _, origin := range []string{
		"http://127.0.0.1",
		"http://127.0.0.1:0",
		"http://127.0.0.1:65536",
		"http://localhost:43127",
		"https://127.0.0.1:43127",
		"http://user@127.0.0.1:43127",
		"http://127.0.0.1:43127/path",
		"http://127.0.0.1:43127?query=1",
	} {
		if validLocalControlOrigin(origin) {
			t.Errorf("validLocalControlOrigin(%q) = true", origin)
		}
	}
}

func TestOpaqueTokenAndHelperAuthorizationValidation(t *testing.T) {
	token := base64.RawURLEncoding.EncodeToString(make([]byte, 32))
	if !validOpaqueToken(token) {
		t.Fatal("32-byte canonical URL-safe token was rejected")
	}
	if validOpaqueToken(strings.Repeat("x", 32)) {
		t.Fatal("arbitrary 32-character value was accepted as an opaque token")
	}
	pid, parsedToken, ok := parseHelperAuthorization([]string{"--uninstall-helper", "1234", token})
	if !ok || pid != 1234 || parsedToken != token {
		t.Fatalf("valid helper authorization = (%d, %q, %t)", pid, parsedToken, ok)
	}
	for _, arguments := range [][]string{
		{"--uninstall-helper", "0", token},
		{"--uninstall-helper", "not-a-pid", token},
		{"--uninstall-helper", "1234", "not-a-token"},
		{"--uninstall-helper", "1234", token, "extra"},
	} {
		if _, _, ok := parseHelperAuthorization(arguments); ok {
			t.Errorf("parseHelperAuthorization(%q) unexpectedly succeeded", arguments)
		}
	}
}

func TestActivationClientDoesNotFollowRedirects(t *testing.T) {
	client := activationHTTPClient()
	if client.CheckRedirect == nil {
		t.Fatal("activation client has no redirect policy")
	}
	if err := client.CheckRedirect(&http.Request{}, nil); !errors.Is(err, http.ErrUseLastResponse) {
		t.Fatalf("redirect policy error = %v, want http.ErrUseLastResponse", err)
	}
}
