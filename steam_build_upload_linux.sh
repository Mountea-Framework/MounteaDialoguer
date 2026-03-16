#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./steam_build_upload_linux.sh [steam_build_username]
# Optional environment overrides:
#   STEAM_SDK_ROOT
#   CONTENT_BUILDER_DIR
#   STEAM_BUILDER_DIR
#   STEAM_CONTENT_DIR
#   STEAM_APP_BUILD_VDF
#   STEAM_APP_ID
#   STEAM_DEPOT_ID_LINUX (defaults to 4509323 for this project)
#   STEAM_BUILD_DESC
#   STEAM_SET_LIVE
#   STEAM_PREVIEW (0|1)
#   STEAM_USERNAME

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -n "${STEAM_SDK_ROOT:-}" ]]; then
	STEAM_SDK_ROOT="$STEAM_SDK_ROOT"
else
	# Common Linux custom install locations (including local Documents SDK extractions).
	for sdk_glob in "$HOME/Documents/Steam/steamworks_sdk_"*/sdk "$HOME/Documents/Steam/steamworks_sdk_"*; do
		if [[ -d "$sdk_glob" ]]; then
			STEAM_SDK_ROOT="$sdk_glob"
			break
		fi
	done

	for sdk_candidate in \
		"$HOME/SteamworksSDK/sdk" \
		"$HOME/SteamworksSDK" \
		"$HOME/Steam/steamapps/common/Steamworks SDK/sdk" \
		"$HOME/Steam/steamapps/common/Steamworks SDK" \
		"$HOME/.steam/steam/steamapps/common/Steamworks SDK/sdk" \
		"$HOME/.steam/steam/steamapps/common/Steamworks SDK"; do
		if [[ -n "${STEAM_SDK_ROOT:-}" ]]; then
			break
		fi
		if [[ -d "$sdk_candidate" ]]; then
			STEAM_SDK_ROOT="$sdk_candidate"
			break
		fi
	done
	STEAM_SDK_ROOT="${STEAM_SDK_ROOT:-$HOME/SteamworksSDK/sdk}"
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

STEAM_BUILDER_DIR="${STEAM_BUILDER_DIR:-$CONTENT_BUILDER_DIR/builder_linux}"
STEAM_CONTENT_DIR="${STEAM_CONTENT_DIR:-$CONTENT_BUILDER_DIR/content/linux}"
STEAM_APP_BUILD_VDF="${STEAM_APP_BUILD_VDF:-}"
STEAM_APP_ID="${STEAM_APP_ID:-4509320}"
STEAM_DEPOT_ID_LINUX="${STEAM_DEPOT_ID_LINUX:-4509323}"
STEAM_BUILD_DESC="${STEAM_BUILD_DESC:-Linux build $(date '+%Y-%m-%d %H:%M:%S')}"
STEAM_SET_LIVE="${STEAM_SET_LIVE:-}"
STEAM_PREVIEW="${STEAM_PREVIEW:-0}"
STEAM_USERNAME="${STEAM_USERNAME:-${1:-semjonprophet}}"
GENERATED_VDF_DIR=""

find_linux_build_dir() {
	local release_dir="$REPO_DIR/release"
	local candidate=""
	local candidates=(
		"$release_dir/linux-unpacked"
		"$release_dir/linux-arm64-unpacked"
		"$release_dir/linux-ia32-unpacked"
		"$release_dir/linux"
	)

	for candidate in "${candidates[@]}"; do
		if [[ -d "$candidate" ]]; then
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
		"$CONTENT_BUILDER_DIR/builder_linux/steamcmd.sh"
		"$CONTENT_BUILDER_DIR/builder/steamcmd.sh"
	)
	local cmd=""
	local cmd_dir=""
	local wrapped_bin=""

	for cmd in "${candidates[@]}"; do
		cmd_dir="$(dirname "$cmd")"
		wrapped_bin="$cmd_dir/linux32/steamcmd"
		if [[ -f "$wrapped_bin" ]] && [[ ! -x "$wrapped_bin" ]]; then
			chmod +x "$wrapped_bin" >/dev/null 2>&1 || true
		fi
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

ensure_steamcmd_runtime() {
	local cmd="$1"
	local wrapped_bin=""

	if [[ "$cmd" == *.sh ]]; then
		wrapped_bin="$(dirname "$cmd")/linux32/steamcmd"
	else
		wrapped_bin="$cmd"
	fi

	if [[ ! -f "$wrapped_bin" ]]; then
		return 0
	fi

	if file "$wrapped_bin" 2>/dev/null | grep -q "ELF 32-bit"; then
		if [[ ! -e /lib/ld-linux.so.2 ]] && [[ ! -e /lib32/ld-linux.so.2 ]]; then
			echo "ERROR: SteamCMD requires 32-bit glibc loader (ld-linux.so.2), but it is missing." >&2
			echo "Install on Ubuntu:" >&2
			echo "  sudo dpkg --add-architecture i386 && sudo apt update" >&2
			echo "  sudo apt install libc6:i386 libstdc++6:i386 libgcc-s1:i386" >&2
			return 1
		fi
	fi

	return 0
}

create_temp_app_build_vdf() {
	if [[ -z "$STEAM_DEPOT_ID_LINUX" ]]; then
		echo "ERROR: STEAM_DEPOT_ID_LINUX is required when STEAM_APP_BUILD_VDF is not provided." >&2
		return 1
	fi

	if [[ ! "$STEAM_APP_ID" =~ ^[0-9]+$ ]]; then
		echo "ERROR: STEAM_APP_ID must be numeric (current: \"$STEAM_APP_ID\")." >&2
		return 1
	fi

	if [[ ! "$STEAM_DEPOT_ID_LINUX" =~ ^[0-9]+$ ]]; then
		echo "ERROR: STEAM_DEPOT_ID_LINUX must be numeric (current: \"$STEAM_DEPOT_ID_LINUX\")." >&2
		return 1
	fi

	if [[ ! "$STEAM_PREVIEW" =~ ^[01]$ ]]; then
		echo "ERROR: STEAM_PREVIEW must be 0 or 1 (current: \"$STEAM_PREVIEW\")." >&2
		return 1
	fi

	GENERATED_VDF_DIR="$(mktemp -d /tmp/mountea-steam-build-XXXXXX)"
	local vdf_path="$GENERATED_VDF_DIR/app_build_${STEAM_APP_ID}_linux.vdf"
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
		"$STEAM_DEPOT_ID_LINUX"
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

if [[ ! -d "$REPO_DIR/node_modules" ]]; then
	echo "ERROR: node_modules not found. Run \"npm ci\" in \"$REPO_DIR\" first." >&2
	exit 1
fi

(
	cd "$REPO_DIR"
	# Use native env var assignment on Linux to avoid requiring cross-env.
	VITE_DIST_CHANNEL=steam STEAM_APP_ID="$STEAM_APP_ID" npx --no-install vite build
	VITE_DIST_CHANNEL=steam STEAM_APP_ID="$STEAM_APP_ID" \
		node scripts/run-electron-builder.mjs \
		--dir \
		--config.extraMetadata.mounteaDistChannel=steam \
		--config.extraMetadata.mounteaSteamAppId="$STEAM_APP_ID"
)

if ! SRC_DIR="$(find_linux_build_dir)"; then
	echo "ERROR: Build output not found under \"$REPO_DIR/release\" (expected linux-unpacked)." >&2
	exit 1
fi

echo
echo "[2/3] Copying build to Steam ContentBuilder..."
mkdir -p "$STEAM_CONTENT_DIR"
rsync -rl --delete "$SRC_DIR"/ "$STEAM_CONTENT_DIR"/

if ! STEAMCMD_BIN="$(resolve_steamcmd_bin)"; then
	echo "ERROR: steamcmd not found. Checked ContentBuilder and PATH." >&2
	exit 1
fi

if ! ensure_steamcmd_runtime "$STEAMCMD_BIN"; then
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
if [[ "$STEAMCMD_BIN" == *.sh ]]; then
	bash "$STEAMCMD_BIN" +login "$STEAM_USERNAME" +run_app_build "$STEAM_APP_BUILD_VDF" +quit
else
	STEAMCMD_DIR="$(cd "$(dirname "$STEAMCMD_BIN")" && pwd)"
	STEAMCMD_EXE="$(basename "$STEAMCMD_BIN")"
	(
		cd "$STEAMCMD_DIR"
		"./$STEAMCMD_EXE" +login "$STEAM_USERNAME" +run_app_build "$STEAM_APP_BUILD_VDF" +quit
	)
fi

echo
echo "SUCCESS: Build packed, copied, and uploaded."
echo "Next: set the new BuildID live on your Steam branch in Steamworks."
