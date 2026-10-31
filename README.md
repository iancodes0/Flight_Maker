# GeoFS Flight Generator

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Open `geofs-flight-generator.user.js` from this repository.
3. Copy the entire file.
4. Open the Tampermonkey dashboard and select **Create a new script**.
5. Replace the template with the copied script.
6. Save the script.

## Usage

1. Open [GeoFS](https://www.geo-fs.com/geofs.php).
2. Enter the departure airport's ICAO code, such as `KJFK`.
3. Enter the arrival airport's ICAO code, such as `KLAX`.
4. Enter the aircraft name.
5. Enter a callsign if needed.
6. Select **Generate and load flight**.

The route is loaded into the GeoFS flight planner with:

- Climb steps at 10,000, 18,000, and 26,000 feet
- A `TOC` waypoint at 35,000 feet
- A `TOD` waypoint before descent
- Descent steps at 26,000, 18,000, and 10,000 feet

Reload GeoFS after updating the userscript in Tampermonkey.
