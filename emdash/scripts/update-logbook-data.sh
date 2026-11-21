#!/usr/bin/env bash
# Regenerates the logbook page's data from the repo root's logbook/ folder
# (statistics computed from a Google Takeout export, plus boundary GeoJSON),
# using the original Python pipeline. Run it after updating logbook/, then
# commit the results:
#   emdash/public/travel/logbook/*.geojson   map layers, served as static files
#   emdash/src/data/logbook-statistics.json  numbers shown on the page
#
# Pass --fetch-all-geojson to re-download the country/state/county boundaries.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
site="$repo_root/emdash"

cd "$repo_root"
# build_logbook.py also copies the old site's logbook.js into build/js
mkdir -p build/js
uv run scripts/build_logbook.py "$@"

mkdir -p "$site/public/travel/logbook"
cp build/travel/logbook/*.geojson "$site/public/travel/logbook/"
# Only the numbers the page shows (the full statistics file is ~1.5 MB)
python3 - "$site/src/data/logbook-statistics.json" <<'PY'
import json, sys

stats = json.load(open("logbook/timeline_statistics.json"))
summary = {
    key: stats[key]
    for key in (
        "num_continents",
        "num_countries",
        "num_cities",
        "num_countries_per_continent",
        "num_usa_states",
        "num_london_boroughs",
    )
}
for direction in ("northern", "southern", "western", "eastern"):
    summary[f"most_{direction}_place"] = stats[f"most_{direction}_place"]["name"]

with open(sys.argv[1], "w") as output:
    json.dump(summary, output, indent="\t", ensure_ascii=False)
    output.write("\n")
PY

echo "Updated $(ls "$site/public/travel/logbook" | wc -l | tr -d ' ') map layers and the statistics."
