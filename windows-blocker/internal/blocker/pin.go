package blocker

import (
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"unicode"
)

const (
	PINIterations = 600_000
	PINSaltBytes  = 16
	PINHashBytes  = 32
)

var (
	ErrInvalidPIN = errors.New("use a PIN made from 4 to 8 numbers")
	ErrWrongPIN   = errors.New("that parent PIN is not correct")
)

// PINRecord stores only a slow password-derived value. The original PIN is
// never written to disk, a command line, or a log.
type PINRecord struct {
	Version    int    `json:"version"`
	Iterations int    `json:"iterations"`
	Salt       string `json:"salt"`
	Hash       string `json:"hash"`
}

func NormalizePIN(value string) string {
	// Match the download and macOS PIN fields: pasted spaces are harmless,
	// while every non-space, non-ASCII-digit character is still rejected by
	// ValidPIN. This also makes "24 68" work consistently through the local
	// control API instead of only when JavaScript happens to clean the field.
	return strings.Map(func(character rune) rune {
		if unicode.IsSpace(character) {
			return -1
		}
		return character
	}, value)
}

func (record PINRecord) structurallyValid() bool {
	if record.Version != 1 || record.Iterations < 100_000 || record.Iterations > 5_000_000 {
		return false
	}
	salt, saltErr := base64.RawStdEncoding.DecodeString(record.Salt)
	hash, hashErr := base64.RawStdEncoding.DecodeString(record.Hash)
	return saltErr == nil && hashErr == nil && len(salt) == PINSaltBytes && len(hash) == PINHashBytes
}

func ValidPIN(value string) bool {
	value = NormalizePIN(value)
	if len(value) < 4 || len(value) > 8 {
		return false
	}
	for _, character := range value {
		if character < '0' || character > '9' {
			return false
		}
	}
	return true
}

func NewPINRecord(value string) (PINRecord, error) {
	value = NormalizePIN(value)
	if !ValidPIN(value) {
		return PINRecord{}, ErrInvalidPIN
	}
	salt := make([]byte, PINSaltBytes)
	if _, err := rand.Read(salt); err != nil {
		return PINRecord{}, fmt.Errorf("create PIN salt: %w", err)
	}
	hash, err := pbkdf2.Key(sha256.New, value, salt, PINIterations, PINHashBytes)
	if err != nil {
		return PINRecord{}, fmt.Errorf("derive PIN: %w", err)
	}
	return PINRecord{
		Version:    1,
		Iterations: PINIterations,
		Salt:       base64.RawStdEncoding.EncodeToString(salt),
		Hash:       base64.RawStdEncoding.EncodeToString(hash),
	}, nil
}

func (record PINRecord) Verify(value string) bool {
	value = NormalizePIN(value)
	if !ValidPIN(value) || !record.structurallyValid() {
		return false
	}
	salt, saltErr := base64.RawStdEncoding.DecodeString(record.Salt)
	expected, hashErr := base64.RawStdEncoding.DecodeString(record.Hash)
	if saltErr != nil || hashErr != nil || len(salt) != PINSaltBytes || len(expected) != PINHashBytes {
		return false
	}
	actual, err := pbkdf2.Key(sha256.New, value, salt, record.Iterations, len(expected))
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare(actual, expected) == 1
}
