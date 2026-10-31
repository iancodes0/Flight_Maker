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
6. Open **Flight settings** if you want to choose a different cruising altitude.
7. Select **Generate and load flight**.

The **Flight settings** dropdown also lets you change the panel hotkey. The default hotkey is `K`. Press it while GeoFS has focus to hide or show the flight planner. The hotkey does not toggle the panel while typing in a field.

The route is loaded into the GeoFS flight planner with:

- Configurable cruising altitude from 20,000 to 80,000 feet
- Realistic climb steps based on the selected cruising altitude
- A `TOC` waypoint at the selected cruising altitude
- A `TOD` waypoint before descent
- Descent steps based on the selected cruising altitude

Reload GeoFS after updating the userscript in Tampermonkey.
