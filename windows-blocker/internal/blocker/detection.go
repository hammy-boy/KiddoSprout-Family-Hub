package blocker

import (
	"errors"
	"strings"
	"unicode"
)

var ErrInvalidExecutableName = errors.New("enter one exact executable name ending in .exe")

var knownGameExecutables = map[string]struct{}{
	"2klauncher.exe":                    {},
	"among us.exe":                      {},
	"amazon games.exe":                  {},
	"battle.net.exe":                    {},
	"brawlhalla.exe":                    {},
	"cod.exe":                           {},
	"destiny2.exe":                      {},
	"eadesktop.exe":                     {},
	"eldenring.exe":                     {},
	"epicgameslauncher.exe":             {},
	"fallguys_client_game.exe":          {},
	"fortniteclient-win64-shipping.exe": {},
	"galaxyclient.exe":                  {},
	"genshinimpact.exe":                 {},
	"gog galaxy.exe":                    {},
	"gta5.exe":                          {},
	"gta5_enhanced.exe":                 {},
	"hearthstone.exe":                   {},
	"heroic.exe":                        {},
	"itch.exe":                          {},
	"leagueclient.exe":                  {},
	"minecraft.exe":                     {},
	"minecraft.windows.exe":             {},
	"minecraftlauncher.exe":             {},
	"overwatch.exe":                     {},
	"origin.exe":                        {},
	"r5apex.exe":                        {},
	"riotclientservices.exe":            {},
	"robloxplayerbeta.exe":              {},
	"rocketleague.exe":                  {},
	"socialclubhelper.exe":              {},
	"starrail.exe":                      {},
	"stardew valley.exe":                {},
	"steam.exe":                         {},
	"terraria.exe":                      {},
	"the sims 4_x64.exe":                {},
	"ubisoftconnect.exe":                {},
	"upc.exe":                           {},
	"valorant-win64-shipping.exe":       {},
	"xboxapp.exe":                       {},
	"zenlesszonezero.exe":               {},
}

var protectedExecutables = map[string]struct{}{
	"applicationframehost.exe":    {},
	"audiodg.exe":                 {},
	"brave.exe":                   {},
	"brave-browser.exe":           {},
	"chrome.exe":                  {},
	"cmd.exe":                     {},
	"conhost.exe":                 {},
	"csrss.exe":                   {},
	"dwm.exe":                     {},
	"explorer.exe":                {},
	"firefox.exe":                 {},
	"fontdrvhost.exe":             {},
	"lsass.exe":                   {},
	"lsaiso.exe":                  {},
	"librewolf.exe":               {},
	"msedge.exe":                  {},
	"msmpeng.exe":                 {},
	"powershell.exe":              {},
	"pwsh.exe":                    {},
	"opera.exe":                   {},
	"opera_gx.exe":                {},
	"registry.exe":                {},
	"regedit.exe":                 {},
	"runtimebroker.exe":           {},
	"securityhealthservice.exe":   {},
	"services.exe":                {},
	"sihost.exe":                  {},
	"smartscreen.exe":             {},
	"spoolsv.exe":                 {},
	"startmenuexperiencehost.exe": {},
	"svchost.exe":                 {},
	"system.exe":                  {},
	"taskhostw.exe":               {},
	"taskmgr.exe":                 {},
	"tor.exe":                     {},
	"vivaldi.exe":                 {},
	"wininit.exe":                 {},
	"winlogon.exe":                {},
	"winver.exe":                  {},
}

var gameLibraryPathMarkers = []string{
	`\battle.net\`,
	`\ea games\`,
	`\epic games\`,
	`\gog galaxy\games\`,
	`\itch\apps\`,
	`\minecraft launcher\`,
	`\riot games\`,
	`\roblox\versions\`,
	`\steamapps\common\`,
	`\ubisoft\ubisoft game launcher\games\`,
	`\xboxgames\`,
}

func NormalizeExecutableName(value string) (string, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	if len(value) < 5 || len(value) > 128 || !strings.HasSuffix(value, ".exe") || strings.ContainsAny(value, `\/:`) {
		return "", ErrInvalidExecutableName
	}
	for _, character := range value {
		if unicode.IsLetter(character) || unicode.IsDigit(character) || character == ' ' || strings.ContainsRune("._-()", character) {
			continue
		}
		return "", ErrInvalidExecutableName
	}
	if _, protected := protectedExecutables[value]; protected || strings.HasPrefix(value, "kiddosprout") {
		return "", errors.New("KiddoSprout cannot add Windows, browser, security, or KiddoSprout processes")
	}
	return value, nil
}

func normalizedWindowsPath(value string) string {
	value = strings.ReplaceAll(value, "/", `\`)
	return strings.ToLower(strings.TrimSpace(value))
}

func driveRootPathHasPrefix(path, prefix string) bool {
	path = normalizedWindowsPath(path)
	// QueryFullProcessImageNameW can return an extended drive path. Strip only
	// that well-defined prefix; a similarly named nested folder must not turn a
	// game into a protected Windows process.
	path = strings.TrimPrefix(path, `\\?\`)
	return len(path) >= 3 && path[1] == ':' && path[2] == '\\' && strings.HasPrefix(path[2:], prefix)
}

func isProtectedProcess(name, path, installFolder string) bool {
	name = strings.ToLower(strings.TrimSpace(name))
	path = normalizedWindowsPath(path)
	if name == "" || strings.HasPrefix(name, "kiddosprout") {
		return true
	}
	if _, protected := protectedExecutables[name]; protected {
		return true
	}
	if driveRootPathHasPrefix(path, `\windows\`) ||
		driveRootPathHasPrefix(path, `\program files\windows defender\`) ||
		driveRootPathHasPrefix(path, `\program files (x86)\windows defender\`) {
		return true
	}
	installFolder = strings.TrimSuffix(normalizedWindowsPath(installFolder), `\`)
	return installFolder != "" && (path == installFolder || strings.HasPrefix(path, installFolder+`\`))
}

// MatchGameProcess returns a conservative blocking decision. Exclusions are
// evaluated first so even a manually entered name cannot target Windows,
// browsers, security tools, or KiddoSprout itself.
func MatchGameProcess(name, path, installFolder string, manualNames []string) (bool, string) {
	name = strings.ToLower(strings.TrimSpace(name))
	path = normalizedWindowsPath(path)
	if isProtectedProcess(name, path, installFolder) {
		return false, ""
	}
	for _, manual := range manualNames {
		if normalized, err := NormalizeExecutableName(manual); err == nil && normalized == name {
			return true, "parent-selected app"
		}
	}
	if _, known := knownGameExecutables[name]; known {
		return true, "known game or launcher"
	}
	for _, marker := range gameLibraryPathMarkers {
		if strings.Contains(path, marker) {
			return true, "game-library folder"
		}
	}
	return false, ""
}

func KnownGameNames() []string {
	return []string{
		"Steam", "Epic Games", "EA", "Battle.net", "Riot", "Roblox",
		"Minecraft", "GOG Galaxy", "Xbox", "Ubisoft Connect", "Rockstar",
		"itch.io", "Amazon Games",
	}
}
