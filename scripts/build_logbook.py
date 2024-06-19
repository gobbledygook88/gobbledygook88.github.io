from argparse import ArgumentParser, BooleanOptionalAction
from csv import DictReader
from fetch_country_geojson import fetch_geojson


def read_logbook():
    with open("logbook/locations.csv", "r") as f:
        return list(DictReader(f))


def write_file(destination, contents):
    with open(destination, "w") as f:
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


def build_logbook_js():
    pass


def build_logbook_html():
    pass


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("--fetch-geojson", action=BooleanOptionalAction)
    parser.set_defaults(fetch_geojson=False)

    args = parser.parse_args()

    if args.fetch_geojson:
        fetch_and_write_all_geojson_files()

    build_logbook_js()
    build_logbook_html()
