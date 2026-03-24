# Driver Live Route & Map Tracking

## Overview
This document describes the mapping solution implemented for Delivery Drivers. The map track gives the driver a visual path from the store's origin to the customer's delivery destination, along with live real-time location tracking of the driver themselves.

## 1. Open Source Mapping Stack
To avoid API costs, the Google Maps implementation was replaced entirely with a free, open-source stack.

**Components:**
1. **Leaflet.js:** An open-source JavaScript library used for mobile-friendly interactive maps.
2. **OpenStreetMap (OSM):** Provides the map tiles.
3. **Open Source Routing Machine (OSRM):** A public API mapping service that computes driving routes, distances, and ETAs.

## 2. Driver Location Tracking (Geolocation API)
A live tracking element has been added so the driver can see themselves navigating the route.

**Implementation Details (`driver_order_map.html`):**
- Utilizes the browser's native `navigator.geolocation.watchPosition` API.
- Upon receiving GPS permission from the driver, their `[lat, lng]` coordinates are constantly read.
- **Marker:** A pulsing circular marker with a motorcycle icon (`fas fa-motorcycle`) updates its position dynamically on the Leaflet map as the driver moves.
- **Locate Me Button:** A floating UI button at the bottom-right allows the driver to snap the viewport back directly to their current real-time location.

## 3. Map Coordinate Fixes & Fallbacks
- **Double JSON Encoding Issue:** Both `json.dumps()` on the backend (`delivery_driver_views.py`) and Django's `|json_script` filter on the frontend caused coordinates to be parsed as strings rather than floats, breaking the `[lat, lng]` map initialization. `JSON.parse` is now used properly with `typeof` checks to handle the string payloads.
- **Fallback Logic:** If the OSRM routing service ever fails or is blocked on the client device, a JS `.catch()` error handler will:
  1. Draw a direct (dotted) point-to-point line between the store and customer.
  2. Estimate the distance mathematically using the **Haversine formula**.
