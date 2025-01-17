from argparse import ArgumentParser, BooleanOptionalAction
from collections import defaultdict
from csv import DictReader
from fetch_country_geojson import fetch_country_geojson
from render import render
import os
import geojson
import shutil


NUM_COUNTRIES_PER_CONTINENT = {
    "africa": 54,
    "asia": 49,
    "europe": 44,
    "north_america": 23,
    "south_america": 12,
    "oceania": 14,
}


def read_logbook():
    with open("logbook/locations.csv", "r") as f:
        return list(DictReader(f))


def write_file(destination, contents):
    with open(destination, "w", encoding="utf-8") as f:
        f.write(contents)


def get_countries_with_areas(logbook):
    return set(
        (location["country"], location["area"] if location["area"] != "" else None)
        for location in logbook
    )


def get_countries(logbook):
    return set(
        (
            location["country"]
            if location["country"] != "united_kingdom"
            else location["area"]
        )
        for location in logbook
    )


def get_continents(logbook):
    return set(location["continent"] for location in logbook)


def get_places(logbook):
    return set(location["location"] for location in logbook)


def get_countries_per_continent(logbook):
    groups = defaultdict(set)

    for location in logbook:
        country = location["country"]

        if location["country"] == "united_kingdom":
            country = location["area"]

        groups[location["continent"]].add(country)

    return groups


def get_num_countries_per_continent(logbook):
    return {
        continent: len(countries)
        for continent, countries in get_countries_per_continent(logbook).items()
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


def merge_country_geojson_files():
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


def build_logbook_html(logbook):
    source_dir = os.path.join("app", "travel")
    source = os.path.join(source_dir, "logbook.html")

    destination_dir = os.path.join("build", "travel", "logbook")
    destination = os.path.join(destination_dir, "index.html")

    with open(source, "r") as f:
        html = render(
            f.read(),
            {
                "page": {
                    "num_countries_visited": len(get_countries(logbook)),
                    "num_places_visited": len(get_places(logbook)),
                    "num_continents_visited": len(get_continents(logbook)),
                    "num_countries_visited_per_continent": get_num_countries_per_continent(
                        logbook
                    ),
                    "num_countries_per_continent": NUM_COUNTRIES_PER_CONTINENT,
                }
            },
        )

    os.makedirs(destination_dir, exist_ok=True)

    with open(destination, "w", encoding="utf-8") as f:
        f.write(html)


def build_logbook_js():
    source_dir = os.path.join("app", "js")
    source = os.path.join(source_dir, "logbook.js")

    destination_dir = os.path.join("build", "js")
    destination = os.path.join(destination_dir, "logbook.js")

    shutil.copyfile(source, destination)


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("--fetch-geojson", action=BooleanOptionalAction)
    parser.set_defaults(fetch_geojson=False)

    args = parser.parse_args()

    logbook = read_logbook()

    if args.fetch_geojson:
        fetch_country_geojson_files(logbook)

    merge_country_geojson_files()
    build_logbook_html(logbook)
    build_logbook_js()
