import json
import os

import geojson
import requests

SOURCE = "https://raw.githubusercontent.com/radoi90/housequest-data/refs/heads/master/london_boroughs.geojson"
DESTINATION = "logbook/geojson/london_boroughs/london_boroughs.geojson"


def fetch_london_boroughs_geojson():
    response = requests.get(SOURCE)

    with open(DESTINATION, "w") as f:
        f.write(response.text)


def build_london_boroughs_geojson(timeline):
    with open(DESTINATION, "r") as f:
        london_boroughs_geojson = json.loads(f.read())

    visited_boroughs = timeline["london_boroughs"]

    collection = list(
        filter(
            lambda f: any(
                f["properties"]["name"] in borough for borough in visited_boroughs
            ),
            london_boroughs_geojson["features"],
        )
    )

    if len(collection) != len(visited_boroughs):
        raise RuntimeError("Could not find GeoJSON for all visited London boroughs")

    destination_dir = os.path.join("build", "travel", "logbook")
    destination = os.path.join(destination_dir, "logbook_london_boroughs.geojson")

    os.makedirs(destination_dir, exist_ok=True)

    with open(destination, "w", encoding="utf-8") as f:
        geojson.dump(geojson.FeatureCollection(collection), f)
