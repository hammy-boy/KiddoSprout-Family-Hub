package blocker

import "testing"

func TestPINValidationAndVerification(t *testing.T) {
	if got := NormalizePIN(" 2468\n"); got != "2468" {
		t.Fatalf("NormalizePIN() = %q", got)
	}
	for _, valid := range []string{"1234", " 1234 ", "12 34", "12345678"} {
		if !ValidPIN(valid) {
			t.Errorf("ValidPIN(%q) = false", valid)
		}
	}
	for _, invalid := range []string{"123", "123456789", "12a4", "１２３４", ""} {
		if ValidPIN(invalid) {
			t.Errorf("ValidPIN(%q) = true", invalid)
		}
	}
	record, err := NewPINRecord(" 2468 ")
	if err != nil {
		t.Fatal(err)
	}
	if !record.Verify("2468") {
		t.Fatal("correct PIN did not verify")
	}
	if record.Verify("1357") {
		t.Fatal("wrong PIN verified")
	}
}

func TestPINNormalizationAllowsPastedSpacesOnly(t *testing.T) {
	if got := NormalizePIN(" 24\t68\n"); got != "2468" {
		t.Fatalf("NormalizePIN() = %q, want 2468", got)
	}
	if !ValidPIN(" 24 68 ") {
		t.Fatal("PIN with harmless pasted spaces should be valid")
	}
	if ValidPIN("24a68") {
		t.Fatal("PIN normalization must not hide non-space characters")
	}
}

func TestPINRecordsUseRandomSalts(t *testing.T) {
	first, err := NewPINRecord("2468")
	if err != nil {
		t.Fatal(err)
	}
	second, err := NewPINRecord("2468")
	if err != nil {
		t.Fatal(err)
	}
	if first.Salt == second.Salt || first.Hash == second.Hash {
		t.Fatal("two records unexpectedly reused PIN material")
	}
}
