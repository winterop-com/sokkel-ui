#!/usr/bin/env bash
# Downloads MaxMind's GeoLite2 City into examples/network/geolite/, which git ignores: its license
# forbids redistributing it, and MaxMind updates it twice a week, so it is fetched, never committed.
#
# The license key is read at run time from 1Password, through the reference in MAXMIND_LICENSE_REF
# (such as op://Private/MaxMind/license key). It is held in this script's memory only: never written
# to disk, never printed, and handed to curl on its standard input rather than on its command line,
# where other processes could read it. MAXMIND_ACCOUNT_REF, or MAXMIND_ACCOUNT_ID, names the account
# too, for MaxMind's newer download with the account and key as basic auth; without either, the key
# goes in the older download's address.
#
#   MAXMIND_LICENSE_REF='op://Private/MaxMind/license key' examples/network/scripts/geolite.sh

set -euo pipefail

if [[ -z "${MAXMIND_LICENSE_REF:-}" ]]; then
    echo "Set MAXMIND_LICENSE_REF to the 1Password reference of the MaxMind license key, such as op://Private/MaxMind/license key." >&2
    exit 2
fi
command -v op >/dev/null || { echo "The 1Password CLI (op) is not installed." >&2; exit 2; }
command -v curl >/dev/null || { echo "curl is not installed." >&2; exit 2; }

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target="$here/geolite"
edition="GeoLite2-City"

key="$(op read --no-newline "$MAXMIND_LICENSE_REF")"
if [[ ! "$key" =~ ^[A-Za-z0-9_]+$ ]]; then
    echo "What $MAXMIND_LICENSE_REF holds does not read as a MaxMind license key." >&2
    exit 1
fi
account="${MAXMIND_ACCOUNT_ID:-}"
if [[ -n "${MAXMIND_ACCOUNT_REF:-}" ]]; then account="$(op read --no-newline "$MAXMIND_ACCOUNT_REF")"; fi
if [[ -n "$account" && ! "$account" =~ ^[0-9]+$ ]]; then
    echo "The MaxMind account id is not a number." >&2
    exit 1
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Fetches the edition with the suffix given (tar.gz or tar.gz.sha256) into a file; the secret goes to
# curl as its configuration on standard input, written by printf, a shell builtin.
fetch() {
    local suffix="$1" out="$2"
    if [[ -n "$account" ]]; then
        printf 'url = "https://download.maxmind.com/geoip/databases/%s/download?suffix=%s"\nuser = "%s:%s"\n' \
            "$edition" "$suffix" "$account" "$key" |
            curl --config - --fail --silent --show-error --location --proto '=https' --output "$out"
    else
        printf 'url = "https://download.maxmind.com/app/geoip_download?edition_id=%s&license_key=%s&suffix=%s"\n' \
            "$edition" "$key" "$suffix" |
            curl --config - --fail --silent --show-error --location --proto '=https' --output "$out"
    fi
}

echo "Downloading $edition"
fetch tar.gz "$work/download.tar.gz"
fetch tar.gz.sha256 "$work/download.sha256"
unset key account

expected="$(awk '{ print $1 }' "$work/download.sha256")"
if command -v sha256sum >/dev/null; then
    actual="$(sha256sum "$work/download.tar.gz" | awk '{ print $1 }')"
else
    actual="$(shasum -a 256 "$work/download.tar.gz" | awk '{ print $1 }')"
fi
if [[ -z "$expected" || "$expected" != "$actual" ]]; then
    echo "The download's checksum does not match the one MaxMind gives; nothing was changed." >&2
    exit 1
fi

# The archive is untrusted: it is unpacked into an empty folder of its own, and only the database and
# its license files are taken from it.
mkdir "$work/unpacked"
tar -xzf "$work/download.tar.gz" -C "$work/unpacked"
database="$(find "$work/unpacked" -type f -name "$edition.mmdb" | head -n 1)"
if [[ -z "$database" ]]; then
    echo "The archive holds no $edition.mmdb; nothing was changed." >&2
    exit 1
fi

mkdir -p "$target"
for notice in LICENSE.txt COPYRIGHT.txt; do
    found="$(dirname "$database")/$notice"
    if [[ -f "$found" ]]; then cp "$found" "$target/$notice"; fi
done
cp "$database" "$target/.$edition.mmdb.new"
mv -f "$target/.$edition.mmdb.new" "$target/$edition.mmdb"
echo "$edition is in ${target#"$here/"}/$edition.mmdb ($(du -h "$target/$edition.mmdb" | awk '{ print $1 }'))."
