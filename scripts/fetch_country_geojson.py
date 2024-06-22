import requests
import geojson


SOURCE = "https://raw.githubusercontent.com/georgique/world-geojson/develop"


def fetch_geojson(country, area):
    url = f"{SOURCE}/countries/{country}.json"

    if area is not None:
        url = f"{SOURCE}/areas/{country}/{area}.json"

    response = requests.get(url)

    if response.status_code != 200:
        raise ValueError(f"{url} does not exist")

    collection = geojson.loads(response.text)

    for feature in collection.features:
        feature.properties.update({"country": country, "area": area})

    return collection
