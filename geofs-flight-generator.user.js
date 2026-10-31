// ==UserScript==
// @name         GeoFS Flight Generator
// @namespace    https://example.invalid/geofs-flight-generator
// @version      1.0.0
// @description  Generate and load a GeoFS-compatible flight plan between two airports.
// @author       tamsam
// @match        https://www.geo-fs.com/geofs.php*
// @match        https://geo-fs.com/geofs.php*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    const PANEL_ID = "geofs-flight-generator";
    const STYLE_ID = `${PANEL_ID}-style`;

    function waitForGeoFS(callback) {
        if (window.geofs && geofs.flightPlan && geofs.mainAirportList) {
            callback();
            return;
        }
        window.setTimeout(() => waitForGeoFS(callback), 500);
    }

    function installStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            #${PANEL_ID} {
                position: fixed; z-index: 2147483647; top: 76px; right: 20px;
                width: 340px; padding: 0 0 16px; overflow: hidden; color: #edf4ff;
                background: linear-gradient(145deg, #16283f 0%, #0c1728 100%);
                border: 1px solid #38577c; border-radius: 12px;
                box-shadow: 0 12px 35px #000b, inset 0 1px #ffffff12;
                font: 13px/1.4 Arial, sans-serif;
            }
            #${PANEL_ID} .gfg-header {
                padding: 17px 19px 15px; background: #1c3858; border-bottom: 1px solid #416589;
            }
            #${PANEL_ID} h2 { margin: 0; color: #fff; font-size: 17px; font-weight: 600; letter-spacing: .2px; }
            #${PANEL_ID} .gfg-subtitle { margin-top: 3px; color: #9fb8d5; font-size: 11px; }
            #${PANEL_ID} .gfg-form { padding: 15px 19px 0; }
            #${PANEL_ID} .gfg-field { margin-bottom: 12px; }
            #${PANEL_ID} label { display: block; margin: 0 0 5px; color: #b7cbe3; font-size: 11px; font-weight: 600; letter-spacing: .4px; text-transform: uppercase; }
            #${PANEL_ID} input {
                box-sizing: border-box; width: 100%; padding: 9px 10px; color: #fff;
                background: #091525; border: 1px solid #426181; border-radius: 6px;
                outline: none; transition: border-color .15s, box-shadow .15s;
            }
            #${PANEL_ID} input:focus { border-color: #69b5ff; box-shadow: 0 0 0 2px #4ba8ff2b; }
            #${PANEL_ID} .gfg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            #${PANEL_ID} button {
                width: 100%; margin-top: 4px; padding: 10px; color: #fff;
                background: linear-gradient(180deg, #3e9be3, #2070b8);
                border: 1px solid #64b6f0; border-radius: 6px; cursor: pointer;
                font-weight: 600; letter-spacing: .2px; transition: filter .15s, transform .15s;
            }
            #${PANEL_ID} button:hover { filter: brightness(1.12); }
            #${PANEL_ID} button:active { transform: translateY(1px); }
            #${PANEL_ID} #gfg-status { min-height: 18px; margin-top: 11px; color: #9fd5ff; font-size: 12px; }
            #${PANEL_ID} .gfg-note { margin-top: 12px; padding-top: 11px; color: #829ab7; border-top: 1px solid #ffffff12; font-size: 11px; }
        `;
        document.head.appendChild(style);
    }

    function makePanel() {
        if (document.getElementById(PANEL_ID)) return;
        const panel = document.createElement("section");
        panel.id = PANEL_ID;
        panel.innerHTML = `
            <div class="gfg-header">
                <h2>Flight Planner</h2>
                <div class="gfg-subtitle">Create a route and load it directly into GeoFS</div>
            </div>
            <div class="gfg-form">
                <div class="gfg-row">
                    <div class="gfg-field">
                        <label for="gfg-departure">Departure</label>
                        <input id="gfg-departure" maxlength="4" placeholder="KJFK" autocomplete="off">
                    </div>
                    <div class="gfg-field">
                        <label for="gfg-arrival">Arrival</label>
                        <input id="gfg-arrival" maxlength="4" placeholder="KLAX" autocomplete="off">
                    </div>
                </div>
                <div class="gfg-field">
                    <label for="gfg-aircraft">Aircraft</label>
                    <input id="gfg-aircraft" placeholder="Boeing 737-700" autocomplete="off">
                </div>
                <div class="gfg-field">
                    <label for="gfg-callsign">Callsign <span>(optional)</span></label>
                    <input id="gfg-callsign" placeholder="UAL123" autocomplete="off">
                </div>
                <button id="gfg-generate">Generate and load flight</button>
                <div id="gfg-status" role="status"></div>
                <div class="gfg-note">A direct route with intermediate waypoints and labeled TOC/TOD markers will be loaded into GeoFS.</div>
            </div>
        `;
        document.body.appendChild(panel);

        const status = panel.querySelector("#gfg-status");

        panel.querySelector("#gfg-generate").addEventListener("click", () => {
            try {
                const departure = panel.querySelector("#gfg-departure").value.trim().toUpperCase();
                const arrival = panel.querySelector("#gfg-arrival").value.trim().toUpperCase();
                const aircraft = panel.querySelector("#gfg-aircraft").value.trim();
                const callsign = panel.querySelector("#gfg-callsign").value.trim();
                const plan = buildPlan(departure, arrival, aircraft, callsign);
                geofs.flightPlan.import(plan);
                status.textContent = `Flight loaded • ${plan.nodes.length} waypoints`;
            } catch (error) {
                status.textContent = error instanceof Error ? error.message : "Could not generate the flight.";
            }
        });
    }

    function buildPlan(departure, arrival, aircraft, callsign) {
        if (!/^[A-Z0-9]{3,4}$/.test(departure) || !/^[A-Z0-9]{3,4}$/.test(arrival)) {
            throw new Error("Enter valid 3- or 4-character ICAO airport codes.");
        }
        if (departure === arrival) throw new Error("Departure and arrival must be different.");
        const start = geofs.mainAirportList[departure];
        const end = geofs.mainAirportList[arrival];
        if (!start) throw new Error(`Departure airport ${departure} was not found in GeoFS.`);
        if (!end) throw new Error(`Arrival airport ${arrival} was not found in GeoFS.`);

        const distance = greatCircleDistance(start, end);
        const intermediateCount = Math.max(0, Math.min(30, Math.ceil(distance / 100) - 1));
        const cruiseAltitude = 35000;
        const nodes = [{ ident: departure, type: "DPT", lat: start[0], lon: start[1], alt: 0 }];
        const tocFraction = 0.18;
        const todFraction = 0.82;
        const addRoutePoint = (ident, fraction, altitude) => {
            const point = greatCirclePoint(start, end, fraction);
            nodes.push({ ident, type: "FIX", lat: point[0], lon: point[1], alt: altitude });
        };
        addRoutePoint("CLB1", 0.04, 10000);
        addRoutePoint("CLB2", 0.09, 18000);
        addRoutePoint("CLB3", 0.14, 26000);
        const tocPoint = greatCirclePoint(start, end, tocFraction);
        const todPoint = greatCirclePoint(start, end, todFraction);
        nodes.push({ ident: "TOC", type: "FIX", lat: tocPoint[0], lon: tocPoint[1], alt: cruiseAltitude });
        for (let index = 1; index <= intermediateCount; index += 1) {
            const fraction = index / (intermediateCount + 1);
            if (fraction <= tocFraction || fraction >= todFraction) continue;
            const point = greatCirclePoint(start, end, fraction);
            nodes.push({
                ident: `ENR${String(index).padStart(2, "0")}`,
                type: "FIX",
                lat: point[0],
                lon: point[1],
                alt: cruiseAltitude,
            });
        }
        nodes.push({ ident: "TOD", type: "FIX", lat: todPoint[0], lon: todPoint[1], alt: cruiseAltitude });
        addRoutePoint("DES1", 0.87, 26000);
        addRoutePoint("DES2", 0.92, 18000);
        addRoutePoint("DES3", 0.97, 10000);
        nodes.push({ ident: arrival, type: "DST", lat: end[0], lon: end[1], alt: 0 });
        return {
            nodes,
            aircraft: aircraft || "",
            callsign: callsign || "",
            route: "direct-great-circle",
            generatedAt: new Date().toISOString(),
        };
    }

    function greatCircleDistance(first, second) {
        const radians = Math.PI / 180;
        const lat1 = first[0] * radians;
        const lat2 = second[0] * radians;
        const deltaLat = (second[0] - first[0]) * radians;
        const deltaLon = (second[1] - first[1]) * radians;
        const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
        return 3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function greatCirclePoint(first, second, fraction) {
        const radians = Math.PI / 180;
        const lat1 = first[0] * radians;
        const lon1 = first[1] * radians;
        const lat2 = second[0] * radians;
        const lon2 = second[1] * radians;
        const angle = 2 * Math.asin(Math.sqrt(
            Math.sin((lat2 - lat1) / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
        ));
        if (angle === 0) return [first[0], first[1]];
        const sine = Math.sin(angle);
        const weight1 = Math.sin((1 - fraction) * angle) / sine;
        const weight2 = Math.sin(fraction * angle) / sine;
        const x = weight1 * Math.cos(lat1) * Math.cos(lon1) + weight2 * Math.cos(lat2) * Math.cos(lon2);
        const y = weight1 * Math.cos(lat1) * Math.sin(lon1) + weight2 * Math.cos(lat2) * Math.sin(lon2);
        const z = weight1 * Math.sin(lat1) + weight2 * Math.sin(lat2);
        return [Math.atan2(z, Math.sqrt(x * x + y * y)) / radians, Math.atan2(y, x) / radians];
    }

    waitForGeoFS(() => {
        installStyles();
        makePanel();
    });
})();
