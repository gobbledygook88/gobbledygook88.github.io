import json
import os

import geojson
import requests

SOURCE = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Counties_and_Unitary_Authorities_December_2024_Boundaries_UK_BUC/FeatureServer/replicafilescache/Counties_and_Unitary_Authorities_December_2024_Boundaries_UK_BUC_-7342248301948489151.geojson"
DESTINATION = "logbook/geojson/uk_counties/uk_counties.geojson"


def fetch_uk_counties_geojson():
    response = requests.get(SOURCE)

    with open(DESTINATION, "w") as f:
        f.write(response.text)


def build_uk_counties_geojson(timeline):
    with open(DESTINATION, "r") as f:
        counties_geojson = json.loads(f.read())

    visited_counties = [
        county for counties in timeline["uk_counties"].values() for county in counties
    ]

    if "South Yorkshire" in visited_counties:
        visited_counties.remove("South Yorkshire")
        visited_counties.extend(["Barnsley", "Doncaster", "Rotherham", "Sheffield"])

    if "West Midlands" in visited_counties:
        visited_counties.remove("West Midlands")
        visited_counties.extend(
            [
                "Birmingham",
                "Coventry",
                "Dudley",
                "Sandwell",
                "Solihull",
                "Walsall",
                "Wolverhampton",
            ]
        )

    if "Greater Manchester" in visited_counties:
        visited_counties.remove("Greater Manchester")
        visited_counties.extend(
            [
                "Bolton",
                "Bury",
                "Manchester",
                "Oldham",
                "Rochdale",
                "Salford",
                "Stockport",
                "Tameside",
                "Trafford",
                "Wigan",
            ]
        )

    if "Greater London" in visited_counties:
        visited_counties.remove("Greater London")
        visited_counties.extend(
            [
                "Barking and Dagenham",
                "Barnet",
                "Bexley",
                "Brent",
                "Bromley",
                "Camden",
                "City of London",
                "Croydon",
                "Ealing",
                "Enfield",
                "Greenwich",
                "Hackney",
                "Hammersmith and Fulham",
                "Haringey",
                "Harrow",
                "Havering",
                "Hillingdon",
                "Hounslow",
                "Islington",
                "Kensington and Chelsea",
                "Kingston upon Thames",
                "Lambeth",
                "Lewisham",
                "Merton",
                "Newham",
                "Redbridge",
                "Richmond upon Thames",
                "Southwark",
                "Sutton",
                "Tower Hamlets",
                "Waltham Forest",
                "Wandsworth",
                "Westminster",
            ]
        )

    collection = list(
        filter(
            lambda f: any(
                f["properties"]["CTYUA24NM"] in county for county in visited_counties
            ),
            counties_geojson["features"],
        )
    )

    destination_dir = os.path.join("build", "travel", "logbook")
    destination = os.path.join(destination_dir, "logbook_uk_counties.geojson")

    os.makedirs(destination_dir, exist_ok=True)

    with open(destination, "w", encoding="utf-8") as f:
        geojson.dump(geojson.FeatureCollection(collection), f)
