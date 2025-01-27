import math

import geojson
import requests

SOURCE = "https://raw.githubusercontent.com/georgique/world-geojson/develop"

COUNTRIES_TO_NORMALISE = {
    ("france", "mainland"),
    ("italy", "mainland"),
    ("spain", "mainland"),
    ("spain", "canary_islands"),
}


def fetch_country_geojson(country, area):
    url = f"{SOURCE}/countries/{country}.json"

    if area is not None:
        url = f"{SOURCE}/areas/{country}/{area}.json"

    response = requests.get(url)

    if response.status_code != 200:
        raise ValueError(f"{url} does not exist")

    collection = geojson.loads(response.text)

    for feature in collection.features:
        feature.properties.update({"country": country, "area": area})

    if (country, area) in COUNTRIES_TO_NORMALISE:
        collection = normalise_coordinates(collection)

    return collection


def normalise_coordinates(collection):
    for feature in collection.features:
        feature.geometry.coordinates = [
            [
                normalise_point(latitude, longitude)
                for latitude, longitude in coordinates
            ]
            for coordinates in feature.geometry.coordinates
        ]

    return collection


def normalise_point(latitude, longitude):
    while math.floor(longitude) < -180:
        longitude += 360
    while math.ceil(longitude) > 180:
        longitude -= 360

    while math.floor(latitude) <= -90:
        latitude += 180
    while math.ceil(latitude) >= 90:
        latitude -= 180

    return [latitude, longitude]
