# Go 1.26.3 macOS 10.13 Backport Build Guide

## Overview

This document describes the process of compiling Go 1.26.3 for macOS 10.13 (High Sierra) on a machine running macOS 10.13.6 with Xcode 10.1 (Apple Clang 10.0.0).

## Problem

Go 1.26.3 has two compatibility issues with macOS 10.13:

1. **Mach-O minimum version**: Go's internal linker hardcodes `LC_BUILD_VERSION` with minimum macOS 12.0, making the binary refuse to load on older macOS versions (dyld error: `Symbol not found: _SecTrustCopyCertificateChain`).

2. **Security framework API incompatibility**: The `crypto/x509` package uses two macOS 10.14+ Security framework APIs that don't exist on 10.13:
   - `SecTrustEvaluateWithError` (macOS 10.14+)
   - `SecTrustCopyCertificateChain` (macOS 10.14+)

   These are imported via `go:cgo_import_dynamic`, creating hard dyld symbol references. The binary fails to load on 10.13 with:
   ```
   dyld: Symbol not found: _SecTrustCopyCertificateChain
     Referenced from: /path/to/go (which was built for Mac OS X 12.0)
     Expected in: /System/Library/Frameworks/Security.framework/Versions/A/Security
   ```

## Solution

### Patch 1: Minimum macOS version (macho.go)

Change Go's internal linker to emit `minos 10.13` instead of `minos 12.0` in the `LC_BUILD_VERSION` load command:

**File**: `src/cmd/link/internal/ld/macho.go`

```diff
- version = 12<<16 | 0<<8 | 0<<0 // 12.0.0
+ version = 10<<16 | 13<<8 | 0<<0 // 10.13.0 (backport)
```

### Patch 2: Replace macOS 10.14+ Security APIs (security.go + security.s)

Replace two 10.14+ APIs with older equivalents available on 10.6+:

| Removed API (10.14+) | Replacement API (10.3+/10.6+) |
|---|---|
| `SecTrustEvaluateWithError` | `SecTrustEvaluate` (10.3+, deprecated 10.14) |
| `SecTrustCopyCertificateChain` | `SecTrustGetCertificateCount` + `SecTrustGetCertificateAtIndex` (10.6+, deprecated 10.14) |

**Files modified**:
- `src/crypto/x509/internal/macos/security.go` — Remove `SecTrustEvaluateWithError`/`SecTrustCopyCertificateChain`, add `SecTrustGetCertificateCount`/`SecTrustGetCertificateAtIndex`, add `SecTrustResultType` constants
- `src/crypto/x509/internal/macos/security.s` — Update assembly trampolines

### Patch 3: Update certificate verification logic (root_darwin.go)

Update `systemVerify()` to use `SecTrustEvaluate` (returns `SecTrustResultType`) instead of `SecTrustEvaluateWithError`, and use `SecTrustGetCertificateCount`/`SecTrustGetCertificateAtIndex` instead of `SecTrustCopyCertificateChain`:

**File**: `src/crypto/x509/root_darwin.go`

Key changes:
- `SecTrustEvaluateWithError` → `SecTrustEvaluate` returning `SecTrustResultType` enum values
- Certificate chain extraction via `SecTrustGetCertificateCount` + loop over `SecTrustGetCertificateAtIndex`
- Map `SecTrustResultType` values: `Unspecified` (4) and `Proceed` (1) = valid; `RecoverableTrustFailure` (5), `Deny` (3), `FatalTrustFailure` (6), `OtherError` (7) = errors

**Note**: Error mapping is less precise with `SecTrustEvaluate` — we can no longer distinguish between `ErrSecCertificateExpired`, `ErrSecHostNameMismatch`, and `ErrSecNotTrusted` from the return value alone. All trust failures map to `UnknownAuthorityError` as a conservative fallback.

## Prerequisites

- macOS 10.13.6 (High Sierra)
- Go 1.24.6+ (bootstrap compiler, installed e.g. via Homebrew at `/usr/local/Cellar/go/1.24.6/libexec`)
- Go 1.26.3 source at `/Volumes/Data/src/go`

## Build Steps

### 1. Apply patches

```bash
cd /Volumes/Data/src/go
git apply ~/src/backport/go_backport/0001-macho-min-version.patch
git apply ~/src/backport/go_backport/0002-security-api-backport.patch
git apply ~/src/backport/go_backport/0003-root-darwin-backport.patch
```

### 2. Build

```bash
cd /Volumes/Data/src/go/src
GOROOT_BOOTSTRAP=/usr/local/Cellar/go/1.24.6/libexec \
CGO_ENABLED=1 \
MACOSX_DEPLOYMENT_TARGET=10.13 \
./make.bash
```

### 3. Verify

```bash
/Volumes/Data/src/go/bin/go version
# go version go1.26.3 darwin/amd64

otool -l /Volumes/Data/src/go/bin/go | grep -A5 LC_BUILD_VERSION | head -5
# cmd LC_BUILD_VERSION
# platform 1
# minos 10.13
# sdk 10.13
```

### 4. Test TLS verification

```go
// Test HTTPS connection with certificate verification
package main

import (
    "crypto/tls"
    "fmt"
    "net/http"
)

func main() {
    client := &http.Client{
        Transport: &http.Transport{
            TLSClientConfig: &tls.Config{},
        },
    }
    resp, err := client.Get("https://www.apple.com")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer resp.Body.Close()
    fmt.Println("Status:", resp.Status)
}
```

## Build Result

| Property | Value |
|---|---|
| Binary | `/Volumes/Data/src/go/bin/go` (15MB) |
| Version | `go1.26.3 darwin/amd64` |
| Target | Mach-O 64-bit x86_64, minos 10.13, sdk 10.13 |
| TLS verification | ✅ Working (uses `SecTrustEvaluate` + `SecTrustGetCertificateAtIndex`) |
| Standard library tests | ✅ `crypto/tls`, `crypto/x509`, `net` pass |

## Limitations

1. **Less precise error mapping**: `SecTrustEvaluate` returns a `SecTrustResultType` enum rather than a specific error code, so certificate verification errors are mapped to `UnknownAuthorityError` instead of more specific error types like `Expired` or `HostNameMismatch`.

2. **SDK version**: The `LC_BUILD_VERSION` SDK field is set to 10.13 (the deployment target). This is lower than Apple's recommendation but doesn't cause functional issues on 10.13.

3. **CGO binaries**: Programs built with `CGO_ENABLED=1` that link against macOS frameworks will still need compatible APIs. This patch only affects Go's standard library and internal linker.

## Files in `./go_backport/`

| File | Description |
|---|---|
| `go` | Compiled Go 1.26.3 binary |
| `build.sh` | Automated build script |
| `0001-macho-min-version.patch` | Patch: minimum macOS version 12.0 → 10.13 |
| `0002-security-api-backport.patch` | Patch: replace 10.14+ Security APIs |
| `0003-root-darwin-backport.patch` | Patch: update root_darwin.go verification logic |
| `build_doc.md` | This document |

## Build Time

Total build time: ~6 minutes on this hardware (Mac mini 2018, 3.2GHz 6-core Xeon, 16GB RAM).
