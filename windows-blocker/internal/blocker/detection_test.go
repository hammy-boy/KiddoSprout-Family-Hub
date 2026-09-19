package blocker

import "testing"

func TestMatchGameProcess(t *testing.T) {
	tests := []struct {
		name   string
		path   string
		manual []string
		want   bool
	}{
		{"steam.exe", `C:\Program Files (x86)\Steam\steam.exe`, nil, true},
		{"MyGame.exe", `D:\SteamLibrary\steamapps\common\My Game\MyGame.exe`, nil, true},
		{"UbisoftGame.exe", `D:\Ubisoft\Ubisoft Game Launcher\games\Example\UbisoftGame.exe`, nil, true},
		{"GTA5.exe", `D:\Standalone Games\Grand Theft Auto V\GTA5.exe`, nil, true},
		{"Homework.exe", `C:\Users\Kid\Apps\Homework.exe`, []string{"homework.exe"}, true},
		{"notepad.exe", `C:\Windows\System32\notepad.exe`, []string{"notepad.exe"}, false},
		{"Homework.exe", `C:\Games\Windows\Homework.exe`, []string{"homework.exe"}, true},
		{"Homework.exe", `C:\Games\Program Files\Windows Defender\Homework.exe`, []string{"homework.exe"}, true},
		{"Homework.exe", `\\?\C:\Windows\System32\Homework.exe`, []string{"homework.exe"}, false},
		{"chrome.exe", `C:\Program Files\Google\Chrome\chrome.exe`, []string{"chrome.exe"}, false},
		{"KiddoSproutBlocker.exe", `C:\Users\Kid\AppData\Local\KiddoSprout\Blocker\KiddoSproutBlocker.exe`, nil, false},
		{"Unity Hub.exe", `C:\Program Files\Unity Hub\Unity Hub.exe`, nil, false},
	}
	for _, test := range tests {
		got, _ := MatchGameProcess(test.name, test.path, `C:\Users\Kid\AppData\Local\KiddoSprout\Blocker`, test.manual)
		if got != test.want {
			t.Errorf("MatchGameProcess(%q, %q) = %v; want %v", test.name, test.path, got, test.want)
		}
	}
}

func TestNormalizeExecutableName(t *testing.T) {
	got, err := NormalizeExecutableName("  My Game.EXE ")
	if err != nil || got != "my game.exe" {
		t.Fatalf("NormalizeExecutableName() = %q, %v", got, err)
	}
	for _, value := range []string{"game", `C:\Games\game.exe`, "chrome.exe", "bad|name.exe", "bad\tname.exe", "bad\nname.exe", "bad\u00a0name.exe", "KiddoSproutHelper.exe"} {
		if _, err := NormalizeExecutableName(value); err == nil {
			t.Errorf("NormalizeExecutableName(%q) unexpectedly succeeded", value)
		}
	}
}
