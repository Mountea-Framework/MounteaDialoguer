#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./steam_build_upload_mac.sh
# Optional environment overrides:
#   STEAM_SDK_ROOT
#   CONTENT_BUILDER_DIR
#   STEAM_BUILDER_DIR
#   STEAM_CONTENT_DIR
#   STEAM_APP_BUILD_VDF
#   STEAM_APP_ID
#   STEAM_DEPOT_ID_MAC (defaults to 4509322 for this project)
#   STEAM_BUILD_DESC
#   STEAM_SET_LIVE
#   STEAM_PREVIEW (0|1)

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -n "${STEAM_SDK_ROOT:-}" ]]; then
	STEAM_SDK_ROOT="$STEAM_SDK_ROOT"
else
	for sdk_candidate in \
		"$HOME/Applications/Steam/SDK/sdk" \
		"$HOME/Applications/Steam/SDK" \
		"$HOME/SteamworksSDK" \
		"$HOME/Library/Application Support/Steam/steamapps/common/Steamworks SDK/sdk" \
		"$HOME/Library/Application Support/Steam/steamapps/common/Steamworks SDK"; do
		if [[ -d "$sdk_candidate" ]]; then
			STEAM_SDK_ROOT="$sdk_candidate"
			break
		fi
	done
	STEAM_SDK_ROOT="${STEAM_SDK_ROOT:-$HOME/Applications/Steam/SDK/sdk}"
fi

if [[ -n "${CONTENT_BUILDER_DIR:-}" ]]; then
	CONTENT_BUILDER_DIR="$CONTENT_BUILDER_DIR"
elif [[ -d "$STEAM_SDK_ROOT/tools/ContentBuilder" ]]; then
	CONTENT_BUILDER_DIR="$STEAM_SDK_ROOT/tools/ContentBuilder"
elif [[ -d "$STEAM_SDK_ROOT/sdk/tools/ContentBuilder" ]]; then
	CONTENT_BUILDER_DIR="$STEAM_SDK_ROOT/sdk/tools/ContentBuilder"
else
	CONTENT_BUILDER_DIR="$STEAM_SDK_ROOT/tools/ContentBuilder"
fi

STEAM_BUILDER_DIR="${STEAM_BUILDER_DIR:-$CONTENT_BUILDER_DIR/builder_osx}"
STEAM_CONTENT_DIR="${STEAM_CONTENT_DIR:-$CONTENT_BUILDER_DIR/content/macos}"
STEAM_APP_BUILD_VDF="${STEAM_APP_BUILD_VDF:-}"
STEAM_APP_ID="${STEAM_APP_ID:-4509320}"
STEAM_DEPOT_ID_MAC="${STEAM_DEPOT_ID_MAC:-4509322}"
STEAM_BUILD_DESC="${STEAM_BUILD_DESC:-macOS build $(date '+%Y-%m-%d %H:%M:%S')}"
STEAM_SET_LIVE="${STEAM_SET_LIVE:-}"
STEAM_PREVIEW="${STEAM_PREVIEW:-0}"
STEAM_USERNAME="semjonprophet"
GENERATED_VDF_DIR=""

find_mac_build_dir() {
	local release_dir="$REPO_DIR/release"
	local candidate=""
	local candidates=(
		"$release_dir/mac-universal"
		"$release_dir/mac-arm64"
		"$release_dir/mac-x64"
		"$release_dir/mac"
	)

	for candidate in "${candidates[@]}"; do
		if [[ -d "$candidate" ]] && find "$candidate" -maxdepth 1 -type d -name "*.app" | grep -q .; then
			echo "$candidate"
			return 0
		fi
	done

	return 1
}

resolve_steamcmd_bin() {
	local candidates=(
		"$STEAM_BUILDER_DIR/steamcmd.sh"
		"$STEAM_BUILDER_DIR/steamcmd"
		"$CONTENT_BUILDER_DIR/builder_osx/steamcmd.sh"
		"$CONTENT_BUILDER_DIR/builder/steamcmd.sh"
	)
	local cmd=""

	for cmd in "${candidates[@]}"; do
		if [[ -f "$cmd" ]] && [[ ! -x "$cmd" ]]; then
			chmod +x "$cmd" >/dev/null 2>&1 || true
		fi
		if [[ -x "$cmd" ]]; then
			echo "$cmd"
			return 0
		fi
	done

	if command -v steamcmd >/dev/null 2>&1; then
		command -v steamcmd
		return 0
	fi

	return 1
}

create_temp_app_build_vdf() {
	if [[ -z "$STEAM_DEPOT_ID_MAC" ]]; then
		echo "ERROR: STEAM_DEPOT_ID_MAC is required when STEAM_APP_BUILD_VDF is not provided." >&2
		return 1
	fi

	if [[ ! "$STEAM_APP_ID" =~ ^[0-9]+$ ]]; then
		echo "ERROR: STEAM_APP_ID must be numeric (current: \"$STEAM_APP_ID\")." >&2
		return 1
	fi

	if [[ ! "$STEAM_DEPOT_ID_MAC" =~ ^[0-9]+$ ]]; then
		echo "ERROR: STEAM_DEPOT_ID_MAC must be numeric (current: \"$STEAM_DEPOT_ID_MAC\")." >&2
		return 1
	fi

	if [[ ! "$STEAM_PREVIEW" =~ ^[01]$ ]]; then
		echo "ERROR: STEAM_PREVIEW must be 0 or 1 (current: \"$STEAM_PREVIEW\")." >&2
		return 1
	fi

	GENERATED_VDF_DIR="$(mktemp -d /tmp/mountea-steam-build-XXXXXX)"
	local vdf_path="$GENERATED_VDF_DIR/app_build_${STEAM_APP_ID}_mac.vdf"
	local build_output_dir="$CONTENT_BUILDER_DIR/output"

	cat >"$vdf_path" <<EOF
"AppBuild"
{
	"AppID" "$STEAM_APP_ID"
	"Desc" "$STEAM_BUILD_DESC"
	"Preview" "$STEAM_PREVIEW"
	"ContentRoot" "$STEAM_CONTENT_DIR"
	"BuildOutput" "$build_output_dir"
	"Depots"
	{
		"$STEAM_DEPOT_ID_MAC"
		{
			"FileMapping"
			{
				"LocalPath" "*"
				"DepotPath" "."
				"Recursive" "1"
			}
		}
	}
}
EOF

	if [[ -n "$STEAM_SET_LIVE" ]]; then
		local setlive_tmp
		setlive_tmp="$(mktemp /tmp/mountea-steam-setlive-XXXXXX)"
		awk -v branch="$STEAM_SET_LIVE" '
			/^[[:space:]]*"Preview"[[:space:]]*/ {
				print
				print "\t\"SetLive\" \"" branch "\""
				next
			}
			{ print }
		' "$vdf_path" >"$setlive_tmp"
		mv "$setlive_tmp" "$vdf_path"
	fi

	echo "$vdf_path"
}

cleanup_temp_vdf() {
	if [[ -n "$GENERATED_VDF_DIR" ]] && [[ -d "$GENERATED_VDF_DIR" ]]; then
		rm -rf "$GENERATED_VDF_DIR"
	fi
}

trap cleanup_temp_vdf EXIT

echo
echo "[1/3] Building Steam package..."
(
	cd "$REPO_DIR"
	npm run electron:pack:steam
)

if ! SRC_DIR="$(find_mac_build_dir)"; then
	echo "ERROR: Build output not found under \"$REPO_DIR/release\" (expected mac*/<App>.app)." >&2
	exit 1
fi

echo
echo "[2/3] Copying build to Steam ContentBuilder..."
mkdir -p "$STEAM_CONTENT_DIR"
# Mirror content similarly to robocopy /MIR but avoid macOS metadata/mtime permission issues.
rsync -rl --delete "$SRC_DIR"/ "$STEAM_CONTENT_DIR"/

if ! STEAMCMD_BIN="$(resolve_steamcmd_bin)"; then
	echo "ERROR: steamcmd not found. Checked ContentBuilder and PATH." >&2
	exit 1
fi

if [[ -n "$STEAM_APP_BUILD_VDF" ]]; then
	if [[ "$STEAM_APP_BUILD_VDF" != /* ]]; then
		STEAM_APP_BUILD_VDF="$STEAM_BUILDER_DIR/$STEAM_APP_BUILD_VDF"
	fi
	if [[ ! -f "$STEAM_APP_BUILD_VDF" ]]; then
		echo "ERROR: App build VDF not found: \"$STEAM_APP_BUILD_VDF\"" >&2
		exit 1
	fi
else
	if ! STEAM_APP_BUILD_VDF="$(create_temp_app_build_vdf)"; then
		exit 1
	fi
fi

echo
echo "[3/3] Uploading build to Steam depot..."
STEAMCMD_DIR="$(cd "$(dirname "$STEAMCMD_BIN")" && pwd)"
STEAMCMD_EXE="$(basename "$STEAMCMD_BIN")"
(
	cd "$STEAMCMD_DIR"
	"./$STEAMCMD_EXE" +login "$STEAM_USERNAME" +run_app_build "$STEAM_APP_BUILD_VDF" +quit
)

echo
echo "SUCCESS: Build packed, copied, and uploaded."
echo "Next: set the new BuildID live on your Steam branch in Steamworks."
