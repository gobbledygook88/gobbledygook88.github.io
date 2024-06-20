from argparse import ArgumentParser, BooleanOptionalAction
from csv import DictReader
from fetch_country_geojson import fetch_geojson
from build import env
import os
import geojson


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


def fetch_and_write_all_geojson_files():
    logbook = read_logbook()
    countries = get_countries_with_areas(logbook)

    for country, area in countries:
        geojson = fetch_geojson(country, area)
        destination = f"logbook/geojson/{country}"

        if area is not None:
            destination += f"_{area}"

        destination += ".geojson"

        print(f"Writing {destination}")

        write_file(destination, geojson)


def merge_geojson_files():
    source_dir = os.path.join("logbook", "geojson")
    files = os.listdir(source_dir)
    collection = []

    for file in files:
        with open(os.path.join(source_dir, file), "r") as f:
            layer = geojson.load(f)
            collection.append(layer)

    destination_dir = os.path.join("build", "travel", "logbook")
    destination = os.path.join(destination_dir, "logbook.geojson")

    os.makedirs(destination_dir, exist_ok=True)

    with open(destination, "w", encoding="utf-8") as f:
        geojson.dump(geojson.GeometryCollection(collection), f)


def build_logbook_html():
    pass


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("--fetch-geojson", action=BooleanOptionalAction)
    parser.set_defaults(fetch_geojson=False)

    args = parser.parse_args()

    if args.fetch_geojson:
        fetch_and_write_all_geojson_files()

    merge_geojson_files()
    build_logbook_html()
