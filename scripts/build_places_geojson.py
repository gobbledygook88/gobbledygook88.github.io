import os
import geojson


def build_places_geojson(timeline):
    build_unique_places_geojson(timeline)
    build_cardinal_places_geojson(timeline)


def build_unique_places_geojson(timeline):
    places = {p["name"]: p for p in timeline["places"]}.values()
    collection = []

    for place in places:
        point = geojson.Point(
            (place["longitude"] / 10_000_000, place["latitude"] / 10_000_000)
        )
        feature = geojson.Feature(geometry=point, properties={"name": place["name"]})

        collection.append(feature)

    destination_dir = os.path.join("build", "travel", "logbook")
    destination = os.path.join(destination_dir, "logbook_unique_places.geojson")

    os.makedirs(destination_dir, exist_ok=True)

    with open(destination, "w", encoding="utf-8") as f:
        geojson.dump(geojson.FeatureCollection(collection), f)


def build_cardinal_places_geojson(timeline):
    cardinal_places = [
        "most_northern_place",
        "most_southern_place",
        "most_eastern_place",
        "most_western_place",
    ]
    collection = []

    for cardinal_place in cardinal_places:
        place = timeline[cardinal_place]

        point = geojson.Point(
            (place["longitude"] / 10_000_000, place["latitude"] / 10_000_000)
        )
        feature = geojson.Feature(geometry=point, properties={"name": place["name"]})

        collection.append(feature)

    destination_dir = os.path.join("build", "travel", "logbook")
    destination = os.path.join(destination_dir, "logbook_cardinal_places.geojson")

    os.makedirs(destination_dir, exist_ok=True)

    with open(destination, "w", encoding="utf-8") as f:
        geojson.dump(geojson.FeatureCollection(collection), f)
