// ==UserScript==
// @name         GeoFS Flight Generator
// @namespace    https://example.invalid/geofs-flight-generator
// @version      1.3.0
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
    const STORAGE_KEY = "gfg-settings";

    function waitForGeoFS(callback, startedAt = Date.now()) {
        if (window.geofs && geofs.flightPlan && geofs.mainAirportList) {
            callback();
            return;
        }
        if (Date.now() - startedAt > 30000) {
            showStartupError("GeoFS did not finish loading within 30 seconds. Reload the page and try again.");
            return;
        }
        window.setTimeout(() => waitForGeoFS(callback, startedAt), 500);
    }

    function showStartupError(message) {
        const notice = document.createElement("div");
        notice.textContent = message;
        notice.style.cssText = "position:fixed;z-index:2147483647;top:20px;right:20px;padding:12px 16px;color:#fff;background:#7d2630;border:1px solid #e66;border-radius:6px;font:13px Arial,sans-serif";
        document.body.appendChild(notice);
    }

    function installStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            #${PANEL_ID}{position:fixed;z-index:2147483647;top:76px;right:20px;width:360px;max-height:calc(100vh - 96px);overflow:auto;color:#edf4ff;background:linear-gradient(145deg,#16283f,#0c1728);border:1px solid #38577c;border-radius:12px;box-shadow:0 12px 35px #000b;font:13px/1.4 Arial,sans-serif}
            #${PANEL_ID}.gfg-collapsed .gfg-form{display:none}
            #${PANEL_ID} .gfg-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#1c3858;border-bottom:1px solid #416589;cursor:move}
            #${PANEL_ID} h2{margin:0;color:#fff;font-size:17px;font-weight:600}
            #${PANEL_ID} .gfg-subtitle{margin-top:3px;color:#9fb8d5;font-size:11px}
            #${PANEL_ID} .gfg-header button{width:auto;margin:0;padding:2px 8px;background:#294c70;border:1px solid #6b91b6}
            #${PANEL_ID} .gfg-form{padding:15px 19px}
            #${PANEL_ID} .gfg-field{margin-bottom:10px}
            #${PANEL_ID} label{display:block;margin:0 0 5px;color:#b7cbe3;font-size:11px;font-weight:600;letter-spacing:.4px;text-transform:uppercase}
            #${PANEL_ID} input,#${PANEL_ID} select{box-sizing:border-box;width:100%;padding:8px 10px;color:#fff;background:#091525;border:1px solid #426181;border-radius:6px;outline:none}
            #${PANEL_ID} input:focus,#${PANEL_ID} select:focus{border-color:#69b5ff;box-shadow:0 0 0 2px #4ba8ff2b}
            #${PANEL_ID} .gfg-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
            #${PANEL_ID} details{margin:0 0 13px;border:1px solid #2f4d6c;border-radius:6px;background:#102238}
            #${PANEL_ID} summary{padding:9px 10px;color:#bcd4ee;cursor:pointer;font-size:11px;font-weight:600;letter-spacing:.4px;text-transform:uppercase}
            #${PANEL_ID} .gfg-settings{padding:10px 10px 2px;border-top:1px solid #2f4d6c}
            #${PANEL_ID} button{width:100%;margin-top:4px;padding:10px;color:#fff;background:linear-gradient(180deg,#3e9be3,#2070b8);border:1px solid #64b6f0;border-radius:6px;cursor:pointer;font-weight:600}
            #${PANEL_ID} button:hover{filter:brightness(1.12)}
            #${PANEL_ID} .gfg-share{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
            #${PANEL_ID} .gfg-share button{margin-top:0;background:#294c70;border-color:#6b91b6}
            #${PANEL_ID} textarea{box-sizing:border-box;width:100%;min-height:84px;margin-top:8px;padding:8px 10px;color:#fff;background:#091525;border:1px solid #426181;border-radius:6px;resize:vertical;font:11px/1.35 monospace}
            #${PANEL_ID} #gfg-status{min-height:18px;margin-top:11px;color:#9fd5ff;font-size:12px}
            #${PANEL_ID} .gfg-note{margin-top:12px;padding-top:11px;color:#829ab7;border-top:1px solid #ffffff12;font-size:11px}
        `;
        document.head.appendChild(style);
    }

    function readSettings() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch (error) {
            console.warn("GeoFS Flight Generator settings could not be read.", error);
            return {};
        }
    }

    function makePanel() {
        if (document.getElementById(PANEL_ID)) return;
        const settings = readSettings();
        const panel = document.createElement("section");
        panel.id = PANEL_ID;
        panel.innerHTML = `
            <div class="gfg-header"><div><h2>Flight Planner</h2><div class="gfg-subtitle">Create a route and load it directly into GeoFS</div></div><button id="gfg-collapse" type="button" title="Minimize">-</button></div>
            <div class="gfg-form">
                <div class="gfg-row"><div class="gfg-field"><label for="gfg-departure">Departure</label><input id="gfg-departure" list="gfg-airports" maxlength="4" placeholder="KJFK" autocomplete="off"></div><div class="gfg-field"><label for="gfg-arrival">Arrival</label><input id="gfg-arrival" list="gfg-airports" maxlength="4" placeholder="KLAX" autocomplete="off"></div></div>
                <datalist id="gfg-airports"></datalist>
                <div class="gfg-field"><label for="gfg-aircraft">Aircraft</label><input id="gfg-aircraft" placeholder="Boeing 737-700" autocomplete="off"></div>
                <div class="gfg-field"><label for="gfg-callsign">Callsign (optional)</label><input id="gfg-callsign" placeholder="UAL123" autocomplete="off"></div>
                <details open><summary>Flight settings</summary><div class="gfg-settings">
                    <div class="gfg-field"><label for="gfg-route-mode">Route mode</label><select id="gfg-route-mode"><option value="direct">Direct great-circle</option><option value="structured">Structured enroute waypoints</option></select></div>
                    <div class="gfg-row"><div class="gfg-field"><label for="gfg-runway-departure">Departure runway</label><input id="gfg-runway-departure" placeholder="04L"></div><div class="gfg-field"><label for="gfg-runway-arrival">Arrival runway</label><input id="gfg-runway-arrival" placeholder="25R"></div></div>
                    <div class="gfg-row"><div class="gfg-field"><label for="gfg-sid">SID (optional)</label><input id="gfg-sid" placeholder="MERIT"></div><div class="gfg-field"><label for="gfg-star">STAR (optional)</label><input id="gfg-star" placeholder="SEAVU"></div></div>
                    <div class="gfg-field"><label for="gfg-approach">Approach (optional)</label><input id="gfg-approach" placeholder="ILS 25R"></div>
                    <div class="gfg-field"><label for="gfg-direction">Cruise direction</label><select id="gfg-direction"><option value="auto">Auto (east/west)</option><option value="east">Eastbound</option><option value="west">Westbound</option></select></div>
                    <div class="gfg-field"><label for="gfg-cruise-preset">Cruising altitude</label><select id="gfg-cruise-preset"><option value="25000">25,000 ft</option><option value="30000">30,000 ft</option><option value="35000" selected>35,000 ft</option><option value="39000">39,000 ft</option><option value="custom">Custom altitude</option></select></div>
                    <div class="gfg-field" id="gfg-custom-altitude-field" hidden><label for="gfg-custom-altitude">Custom cruising altitude</label><input id="gfg-custom-altitude" type="number" min="20000" max="80000" step="1000" value="35000"></div>
                    <div class="gfg-row"><div class="gfg-field"><label for="gfg-climb-distance">Climb distance (NM)</label><input id="gfg-climb-distance" type="number" min="10" max="500" step="1" value="120"></div><div class="gfg-field"><label for="gfg-descent-distance">Descent distance (NM)</label><input id="gfg-descent-distance" type="number" min="10" max="500" step="1" value="150"></div></div>
                    <div class="gfg-field"><label for="gfg-units">Altitude units</label><select id="gfg-units"><option value="imperial">Feet</option><option value="metric">Meters (converted to feet)</option></select></div>
                    <div class="gfg-field"><label for="gfg-hotkey">Panel hotkey</label><input id="gfg-hotkey" maxlength="1" value="K" autocomplete="off"></div>
                </div></details>
                <button id="gfg-generate">Generate and load flight</button>
                <div class="gfg-share"><button id="gfg-copy" type="button">Copy flight JSON</button><button id="gfg-download" type="button">Download .json</button></div>
                <textarea id="gfg-import-json" placeholder="Paste shared flight JSON here"></textarea><button id="gfg-import" type="button">Load shared JSON</button>
                <div id="gfg-status" role="status"></div>
                <div class="gfg-note">Share a generated flight by copying its JSON or downloading it. The JSON includes route nodes and flight metadata.</div>
            </div>`;
        document.body.appendChild(panel);

        const $ = (id) => panel.querySelector(`#${id}`);
        const status = $("gfg-status");
        const cruisePreset = $("gfg-cruise-preset");
        const customAltitudeField = $("gfg-custom-altitude-field");
        let lastPlan = null;
        const fields = ["gfg-departure", "gfg-arrival", "gfg-aircraft", "gfg-callsign", "gfg-route-mode", "gfg-runway-departure", "gfg-runway-arrival", "gfg-sid", "gfg-star", "gfg-approach", "gfg-direction", "gfg-cruise-preset", "gfg-custom-altitude", "gfg-climb-distance", "gfg-descent-distance", "gfg-units", "gfg-hotkey"];
        fields.forEach((id) => { if (settings[id] !== undefined) $(id).value = settings[id]; });
        cruisePreset.dispatchEvent(new Event("change"));
        $("gfg-airports").innerHTML = Object.keys(geofs.mainAirportList).sort().map((code) => `<option value="${code}"></option>`).join("");
        const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(fields.map((id) => [id, $(id).value]))));
        fields.forEach((id) => $(id).addEventListener("change", save));
        $("gfg-hotkey").addEventListener("input", () => { $("gfg-hotkey").value = $("gfg-hotkey").value.slice(-1).toUpperCase(); save(); });
        cruisePreset.addEventListener("change", () => { customAltitudeField.hidden = cruisePreset.value !== "custom"; });
        $("gfg-collapse").addEventListener("click", () => { panel.classList.toggle("gfg-collapsed"); $("gfg-collapse").textContent = panel.classList.contains("gfg-collapsed") ? "+" : "-"; });
        document.addEventListener("keydown", (event) => {
            if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
            if (event.key.toUpperCase() === ($("gfg-hotkey").value || "K").toUpperCase()) panel.hidden = !panel.hidden;
        });
        makeDraggable(panel);
        $("gfg-generate").addEventListener("click", () => {
            try {
                save();
                const departure = $("gfg-departure").value.trim().toUpperCase();
                const arrival = $("gfg-arrival").value.trim().toUpperCase();
                const altitude = Number($("gfg-custom-altitude").value);
                const selectedAltitude = cruisePreset.value === "custom" ? altitude : Number(cruisePreset.value);
                const cruiseAltitude = $("gfg-units").value === "metric" && cruisePreset.value === "custom"
                    ? Math.round(selectedAltitude * 3.28084 / 1000) * 1000
                    : selectedAltitude;
                const direction = $("gfg-direction").value === "auto"
                    ? routeDirection(departure, arrival)
                    : $("gfg-direction").value;
                const plan = buildPlan($("gfg-departure").value.trim().toUpperCase(), $("gfg-arrival").value.trim().toUpperCase(), $("gfg-aircraft").value.trim(), $("gfg-callsign").value.trim(), cruiseAltitude, {
                    mode: $("gfg-route-mode").value, direction, climbDistance: Number($("gfg-climb-distance").value), descentDistance: Number($("gfg-descent-distance").value), units: $("gfg-units").value,
                    departureRunway: $("gfg-runway-departure").value.trim(), arrivalRunway: $("gfg-runway-arrival").value.trim(), sid: $("gfg-sid").value.trim(), star: $("gfg-star").value.trim(), approach: $("gfg-approach").value.trim(),
                });
                geofs.flightPlan.import(plan);
                lastPlan = plan;
                status.textContent = `Flight loaded - ${plan.nodes.length} waypoints`;
            } catch (error) { status.textContent = error instanceof Error ? error.message : "Could not generate the flight."; }
        });
        $("gfg-copy").addEventListener("click", async () => {
            try {
                if (!lastPlan) throw new Error("Generate a flight before copying its JSON.");
                await navigator.clipboard.writeText(JSON.stringify({ format: "geofs-flight-generator", version: 1, plan: lastPlan }, null, 2));
                status.textContent = "Flight JSON copied to the clipboard.";
            } catch (error) {
                status.textContent = error instanceof Error ? error.message : "Could not copy flight JSON.";
            }
        });
        $("gfg-download").addEventListener("click", () => {
            try {
                if (!lastPlan) throw new Error("Generate a flight before downloading its JSON.");
                const blob = new Blob([JSON.stringify({ format: "geofs-flight-generator", version: 1, plan: lastPlan }, null, 2)], { type: "application/json" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `${lastPlan.callsign || lastPlan.nodes[0].ident + "-to-" + lastPlan.nodes.at(-1).ident}.json`;
                link.click();
                URL.revokeObjectURL(link.href);
                status.textContent = "Flight JSON downloaded.";
            } catch (error) {
                status.textContent = error instanceof Error ? error.message : "Could not download flight JSON.";
            }
        });
        $("gfg-import").addEventListener("click", () => {
            try {
                const shared = JSON.parse($("gfg-import-json").value);
                const plan = shared && shared.format === "geofs-flight-generator" ? shared.plan : shared;
                if (!plan || !Array.isArray(plan.nodes) || plan.nodes.length < 2) throw new Error("Shared JSON does not contain a valid flight plan.");
                if (!plan.nodes.every((node) => typeof node.ident === "string" && Number.isFinite(node.lat) && Number.isFinite(node.lon) && Number.isFinite(node.alt))) {
                    throw new Error("Shared JSON contains an invalid waypoint.");
                }
                geofs.flightPlan.import(plan);
                lastPlan = plan;
                status.textContent = `Shared flight loaded - ${plan.nodes.length} waypoints`;
            } catch (error) {
                status.textContent = error instanceof Error ? error.message : "Could not load shared JSON.";
            }
        });
    }

    function makeDraggable(panel) {
        const header = panel.querySelector(".gfg-header");
        let drag;
        header.addEventListener("pointerdown", (event) => { if (event.target.closest("button")) return; drag = { x: event.clientX - panel.offsetLeft, y: event.clientY - panel.offsetTop }; header.setPointerCapture(event.pointerId); });
        header.addEventListener("pointermove", (event) => { if (!drag) return; panel.style.left = `${Math.max(0, event.clientX - drag.x)}px`; panel.style.top = `${Math.max(0, event.clientY - drag.y)}px`; panel.style.right = "auto"; });
        header.addEventListener("pointerup", () => { drag = null; });
    }

    function buildPlan(departure, arrival, aircraft, callsign, cruiseAltitude, options) {
        if (!/^[A-Z0-9]{3,4}$/.test(departure) || !/^[A-Z0-9]{3,4}$/.test(arrival)) throw new Error("Enter valid 3- or 4-character ICAO airport codes.");
        if (departure === arrival) throw new Error("Departure and arrival must be different.");
        if (!Number.isInteger(cruiseAltitude) || cruiseAltitude < 20000 || cruiseAltitude > 80000 || cruiseAltitude % 1000 !== 0) throw new Error("Cruising altitude must be a whole flight level from 20,000 to 80,000 feet.");
        if (!Number.isFinite(options.climbDistance) || !Number.isFinite(options.descentDistance) || options.climbDistance < 10 || options.descentDistance < 10) throw new Error("Climb and descent distances must be at least 10 NM.");
        const start = geofs.mainAirportList[departure], end = geofs.mainAirportList[arrival];
        if (!start) throw new Error(`Departure airport ${departure} was not found in GeoFS.`);
        if (!end) throw new Error(`Arrival airport ${arrival} was not found in GeoFS.`);
        const distance = greatCircleDistance(start, end);
        const climbFraction = Math.min(.35, options.climbDistance / distance);
        const descentFraction = Math.min(.35, options.descentDistance / distance);
        const tocFraction = Math.max(.05, Math.min(.45, climbFraction));
        const todFraction = Math.min(.95, Math.max(tocFraction + .1, 1 - descentFraction));
        const nodes = [{ ident: departure, type: "DPT", lat: start[0], lon: start[1], alt: 0 }];
        const addPoint = (ident, fraction, altitude) => { const point = greatCirclePoint(start, end, fraction); if (!nodes.some((node) => greatCircleDistance([node.lat, node.lon], point) < 10)) nodes.push({ ident, type: "FIX", lat: point[0], lon: point[1], alt: altitude }); };
        addPoint("CLB1", tocFraction * .3, Math.round(cruiseAltitude * .3 / 1000) * 1000);
        addPoint("CLB2", tocFraction * .65, Math.round(cruiseAltitude * .65 / 1000) * 1000);
        addPoint("CLB3", tocFraction, cruiseAltitude);
        if (options.mode === "structured") {
            const count = Math.min(30, Math.max(0, Math.ceil(distance / 100) - 1));
            for (let index = 1; index <= count; index += 1) { const fraction = index / (count + 1); if (fraction > tocFraction && fraction < todFraction) addPoint(`ENR${String(index).padStart(2, "0")}`, fraction, cruiseAltitude); }
        }
        addPoint("TOD", todFraction, cruiseAltitude);
        addPoint("DES1", todFraction + (1 - todFraction) * .35, Math.round(cruiseAltitude * .65 / 1000) * 1000);
        addPoint("DES2", todFraction + (1 - todFraction) * .7, Math.round(cruiseAltitude * .3 / 1000) * 1000);
        nodes.push({ ident: arrival, type: "DST", lat: end[0], lon: end[1], alt: 0 });
        return { nodes, aircraft: aircraft || "", callsign: callsign || "", route: options.mode === "structured" ? "structured-great-circle" : "direct-great-circle", direction: options.direction, departureRunway: options.departureRunway, arrivalRunway: options.arrivalRunway, sid: options.sid, star: options.star, approach: options.approach, units: options.units, generatedAt: new Date().toISOString() };
    }

    function routeDirection(departure, arrival) {
        const start = geofs.mainAirportList[departure], end = geofs.mainAirportList[arrival];
        if (!start || !end) return "east";
        const delta = ((end[1] - start[1] + 540) % 360) - 180;
        return delta >= 0 ? "east" : "west";
    }

    function greatCircleDistance(first, second) {
        const radians = Math.PI / 180, lat1 = first[0] * radians, lat2 = second[0] * radians, deltaLat = (second[0] - first[0]) * radians, deltaLon = ((second[1] - first[1] + 540) % 360 - 180) * radians;
        const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
        return 3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function greatCirclePoint(first, second, fraction) {
        const radians = Math.PI / 180, lat1 = first[0] * radians, lon1 = first[1] * radians, lat2 = second[0] * radians, lon2 = (first[1] + (((second[1] - first[1] + 540) % 360) - 180)) * radians;
        const angle = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2));
        if (angle === 0) return [first[0], first[1]];
        const sine = Math.sin(angle), weight1 = Math.sin((1 - fraction) * angle) / sine, weight2 = Math.sin(fraction * angle) / sine;
        const x = weight1 * Math.cos(lat1) * Math.cos(lon1) + weight2 * Math.cos(lat2) * Math.cos(lon2), y = weight1 * Math.cos(lat1) * Math.sin(lon1) + weight2 * Math.cos(lat2) * Math.sin(lon2), z = weight1 * Math.sin(lat1) + weight2 * Math.sin(lat2);
        return [Math.atan2(z, Math.sqrt(x * x + y * y)) / radians, ((Math.atan2(y, x) / radians) + 540) % 360 - 180];
    }

    waitForGeoFS(() => { installStyles(); makePanel(); });
})();
