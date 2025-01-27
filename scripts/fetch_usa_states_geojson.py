import json
import os

import geojson
import requests

SOURCE = "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/refs/heads/master/data/geojson/us-states.json"
DESTINATION = "logbook/geojson/usa_states/usa_states.geojson"


def fetch_usa_states_geojson():
    response = requests.get(SOURCE)

    with open(DESTINATION, "w") as f:
        f.write(response.text)


def build_usa_states_geojson(timeline):
    with open(DESTINATION, "r") as f:
        usa_states_geojson = json.loads(f.read())

    visited_states = timeline["usa_states"]

    collection = list(
        filter(
            lambda f: f["properties"]["name"] in visited_states,
            usa_states_geojson["features"],
        )
    )

    if len(collection) != len(visited_states):
        raise RuntimeError("Could not find GeoJSON for all visited US states")

    destination_dir = os.path.join("build", "travel", "logbook")
    destination = os.path.join(destination_dir, "logbook_usa_states.geojson")

    os.makedirs(destination_dir, exist_ok=True)

    with open(destination, "w", encoding="utf-8") as f:
        geojson.dump(geojson.FeatureCollection(collection), f)
