package main

import (
	"encoding/base64"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"time"
	"unicode/utf16"
)

const maxWindowsRunCommandCharacters = 260

func isBackgroundLaunch(arguments []string) bool {
	return len(arguments) == 1 && arguments[0] == "--background"
}

func shouldOpenExistingControl(background bool) bool {
	return !background
}

func startAtLoginCommand(executable string) (string, error) {
	command := `"` + executable + `" --background`
	if len(utf16.Encode([]rune(command))) > maxWindowsRunCommandCharacters {
		return "", errors.New("the installed startup command is longer than Windows allows")
	}
	return command, nil
}

func validOpaqueToken(value string) bool {
	decoded, err := base64.RawURLEncoding.DecodeString(value)
	return err == nil && len(decoded) == 32 && base64.RawURLEncoding.EncodeToString(decoded) == value
}

func validLocalControlOrigin(origin string) bool {
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Scheme != "http" || parsed.Hostname() != "127.0.0.1" || parsed.User != nil || parsed.Path != "" || parsed.RawQuery != "" || parsed.Fragment != "" {
		return false
	}
	port, err := strconv.Atoi(parsed.Port())
	return err == nil && port >= 1 && port <= 65535
}

func activationHTTPClient() *http.Client {
	return &http.Client{
		Timeout: 2 * time.Second,
		Transport: &http.Transport{
			Proxy:             nil,
			DisableKeepAlives: true,
		},
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}

func parseHelperAuthorization(arguments []string) (int, string, bool) {
	if len(arguments) != 3 || arguments[0] != "--uninstall-helper" || !validOpaqueToken(arguments[2]) {
		return 0, "", false
	}
	pid, err := strconv.Atoi(arguments[1])
	return pid, arguments[2], err == nil && pid > 0 && uint64(pid) <= uint64(^uint32(0))
}
