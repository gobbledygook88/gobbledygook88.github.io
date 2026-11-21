import json
import os
from argparse import ArgumentParser, BooleanOptionalAction
from csv import DictReader

import geojson
from build_places_geojson import build_places_geojson, build_unique_places_geojson
from build_uk_counties_geojson import (
    build_uk_counties_geojson,
    fetch_uk_counties_geojson,
)
from fetch_country_geojson import fetch_country_geojson
from fetch_london_boroughs_geojson import (
    build_london_boroughs_geojson,
    fetch_london_boroughs_geojson,
)
from fetch_usa_states_geojson import build_usa_states_geojson, fetch_usa_states_geojson


def read_logbook():
    with open("logbook/locations.csv", "r") as f:
        return list(DictReader(f))


def read_timeline():
    with open("logbook/timeline_statistics.json", "r") as f:
        return json.loads(f.read())


def write_file(destination, contents):
    with open(destination, "w", encoding="utf-8") as f:
        f.write(contents)


def get_countries_with_areas(logbook):
    return {
        (location["country"], location["area"] if location["area"] != "" else None)
        for location in logbook
    }


def fetch_country_geojson_files(logbook):
    countries = get_countries_with_areas(logbook)

    for country, area in countries:
        collection = fetch_country_geojson(country, area)
        destination = f"logbook/geojson/countries/{country}"

        if area is not None:
            destination += f"_{area}"

        destination += ".geojson"

        print(f"Writing {destination}")

        write_file(destination, geojson.dumps(collection))


def build_country_geojson():
    source_dir = os.path.join("logbook", "geojson", "countries")
    files = os.listdir(source_dir)
    collection = []

    for file in files:
        with open(os.path.join(source_dir, file), "r") as f:
            feature = geojson.load(f)
            collection.append(feature)

    destination_dir = os.path.join("build", "travel", "logbook")
    destination = os.path.join(destination_dir, "logbook_countries.geojson")

    os.makedirs(destination_dir, exist_ok=True)

    with open(destination, "w", encoding="utf-8") as f:
        geojson.dump(geojson.FeatureCollection(collection), f)


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument(
        "--fetch-all-geojson", action=BooleanOptionalAction, default=False
    )
    parser.add_argument(
        "--fetch-country-geojson", action=BooleanOptionalAction, default=False
    )
    parser.add_argument(
        "--fetch-usa-states-geojson", action=BooleanOptionalAction, default=False
    )
    parser.add_argument(
        "--fetch-uk-counties-geojson", action=BooleanOptionalAction, default=False
    )
    parser.add_argument(
        "--fetch-london-boroughs-geojson", action=BooleanOptionalAction, default=False
    )

    args = parser.parse_args()

    logbook = read_logbook()
    timeline = read_timeline()

    if args.fetch_all_geojson or args.fetch_country_geojson:
        fetch_country_geojson_files(logbook)

    if args.fetch_all_geojson or args.fetch_usa_states_geojson:
        fetch_usa_states_geojson()

    if args.fetch_all_geojson or args.fetch_uk_counties_geojson:
        fetch_uk_counties_geojson()

    if args.fetch_all_geojson or args.fetch_london_boroughs_geojson:
        fetch_london_boroughs_geojson()

    build_country_geojson()
    build_unique_places_geojson(timeline)
    build_places_geojson(timeline)
    build_usa_states_geojson(timeline)
    build_uk_counties_geojson(timeline)
    build_london_boroughs_geojson(timeline)
