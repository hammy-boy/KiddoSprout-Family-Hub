#!/bin/zsh
set -euo pipefail

script_dir="${0:A:h}"
blocker_dir="${script_dir:h}"
project_dir="${blocker_dir:h}"
build_dir="${blocker_dir}/build"
dist_dir="${blocker_dir}/dist"
app_dir="${build_dir}/KiddoSprout Blocker.app"
contents_dir="${app_dir}/Contents"
macos_dir="${contents_dir}/MacOS"
resources_dir="${contents_dir}/Resources"
module_cache_dir="${build_dir}/ModuleCache"
package_dir="${build_dir}/KiddoSprout Blocker"
browser_extension_dir="${package_dir}/KiddoSprout Browser Blocker"
source_dir="${package_dir}/Source"
app_version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "${blocker_dir}/Resources/Info.plist")"
app_build="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "${blocker_dir}/Resources/Info.plist")"

rm -rf "${build_dir}"
mkdir -p "${macos_dir}" "${resources_dir}" "${module_cache_dir}" "${dist_dir}"

/usr/bin/xcrun clang \
  -fobjc-arc \
  -fmodules \
  -fmodules-cache-path="${module_cache_dir}" \
  -mmacosx-version-min=13.0 \
  -O2 \
  -arch arm64 \
  -arch x86_64 \
  -framework Cocoa \
  -framework Security \
  -framework ServiceManagement \
  "${blocker_dir}/Sources/main.m" \
  -o "${macos_dir}/KiddoSproutBlocker"

/usr/bin/lipo "${macos_dir}/KiddoSproutBlocker" -verify_arch arm64 x86_64

cp "${blocker_dir}/Resources/Info.plist" "${contents_dir}/Info.plist"
sips -s format icns "${project_dir}/kiddosprout_logo.png" --out "${resources_dir}/KiddoSproutBlocker.icns" >/dev/null

codesign --force --deep --sign - "${app_dir}"
"${macos_dir}/KiddoSproutBlocker" --self-test

mkdir -p "${package_dir}"
ditto "${app_dir}" "${package_dir}/KiddoSprout Blocker.app"
ditto "${project_dir}/kiddosprout_blocker" "${browser_extension_dir}"
cp "${blocker_dir}/Resources/INSTALL.txt" "${package_dir}/START HERE.txt"
mkdir -p "${source_dir}/mac-blocker/Sources" "${source_dir}/mac-blocker/Resources" "${source_dir}/mac-blocker/scripts"
cp "${blocker_dir}/Sources/main.m" "${source_dir}/mac-blocker/Sources/main.m"
cp "${blocker_dir}/Resources/Info.plist" "${source_dir}/mac-blocker/Resources/Info.plist"
cp "${blocker_dir}/Resources/INSTALL.txt" "${source_dir}/mac-blocker/Resources/INSTALL.txt"
cp "${blocker_dir}/scripts/build-mac-blocker.sh" "${source_dir}/mac-blocker/scripts/build-mac-blocker.sh"
cp "${blocker_dir}/README.md" "${source_dir}/mac-blocker/README.md"
cp "${project_dir}/kiddosprout_logo.png" "${source_dir}/kiddosprout_logo.png"
ditto "${project_dir}/kiddosprout_blocker" "${source_dir}/kiddosprout_blocker"

cat > "${package_dir}/BUILD-INFO.txt" <<EOF
KiddoSprout Blocker for macOS
Version: ${app_version}
Build: ${app_build}
Minimum macOS: 13.0
Architectures: arm64 (Apple silicon), x86_64 (Intel)
App signature: ad-hoc test signature (no Developer ID)
Apple notarization: not performed
Compiler: $(/usr/bin/xcrun clang --version | head -n 1)
macOS SDK: $(/usr/bin/xcrun --sdk macosx --show-sdk-version)
Build architecture flags: -arch arm64 -arch x86_64
Source revision: working-tree source included; no clean Git revision is asserted
Build script: Source/mac-blocker/scripts/build-mac-blocker.sh
Core source: Source/mac-blocker/Sources/main.m

SHA256SUMS.txt verifies the integrity of every other file in this extracted folder.
The separate dist/SHA256SUMS.txt verifies the integrity of the downloadable ZIP.
EOF

(
  cd "${package_dir}"
  find . -type f ! -name SHA256SUMS.txt -print | LC_ALL=C sort | while IFS= read -r packaged_file; do
    checksum="$(shasum -a 256 "${packaged_file}" | awk '{print $1}')"
    printf '%s  %s\n' "${checksum}" "${packaged_file#./}"
  done > SHA256SUMS.txt
  shasum -a 256 -c SHA256SUMS.txt >/dev/null
)

staged_archive="${build_dir}/KiddoSproutBlocker-macOS.zip"
staged_checksums="${build_dir}/SHA256SUMS.txt"
ditto -c -k --norsrc --keepParent "${package_dir}" "${staged_archive}"
(
  cd "${build_dir}"
  shasum -a 256 KiddoSproutBlocker-macOS.zip > SHA256SUMS.txt
)

# Keep the last complete download available while this build runs. These
# same-filesystem renames expose only fully assembled replacements to Docker
# Compose Watch and to a local web server.
mv -f "${staged_archive}" "${dist_dir}/KiddoSproutBlocker-macOS.zip"
mv -f "${staged_checksums}" "${dist_dir}/SHA256SUMS.txt"

codesign --verify --deep --strict "${app_dir}"
printf 'Built %s\n' "${dist_dir}/KiddoSproutBlocker-macOS.zip"
printf 'Built universal macOS app for: %s\n' "$(/usr/bin/lipo -archs "${macos_dir}/KiddoSproutBlocker")"
