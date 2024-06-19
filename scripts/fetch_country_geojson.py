import requests


SOURCE = "https://raw.githubusercontent.com/georgique/world-geojson/develop"


def fetch_geojson(country, area):
    url = f"{SOURCE}/countries/{country}.json"

    if area is not None:
        url = f"{SOURCE}/areas/{country}/{area}.json"

    response = requests.get(url)

    if response.status_code != 200:
        raise ValueError(f"{url} does not exist")

    return response.text
