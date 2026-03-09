/**
 * Generates the HTML string for a Leaflet.js map.
 */
export function getMapHtml(lat, lng, interactive = true) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            * { margin: 0; padding: 0; }
            html, body, #map { width: 100%; height: 100%; touch-action: none; }
            ${interactive ? `
            .center-pin {
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -100%);
                z-index: 1000;
                pointer-events: none;
                font-size: 38px;
                filter: drop-shadow(0 3px 4px rgba(0,0,0,0.35));
            }
            .center-dot {
                position: absolute;
                top: 50%; left: 50%;
                width: 8px; height: 8px;
                background: rgba(14,165,233,0.5);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                z-index: 999;
                pointer-events: none;
            }
            ` : ''}
        </style>
    </head>
    <body>
        <div id="map"></div>
        ${interactive ? '<div class="center-pin">📍</div><div class="center-dot"></div>' : ''}
        <script>
            var map = L.map('map', {
                zoomControl: false,
                attributionControl: false,
                dragging: true,
                tap: true,
                touchZoom: true,
                doubleClickZoom: true,
                scrollWheelZoom: true,
                boxZoom: true,
                keyboard: true,
                bounceAtZoomLimits: true
            }).setView([${lat}, ${lng}], 15);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                minZoom: 10
            }).addTo(map);

            ${interactive ? `
            function sendCenter() {
                var c = map.getCenter();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'location',
                    latitude: c.lat,
                    longitude: c.lng
                }));
            }
            map.on('moveend', sendCenter);
            sendCenter();
            ` : `
            L.marker([${lat}, ${lng}]).addTo(map);
            `}

            window.updateMarker = function(lat, lng) {
                map.setView([lat, lng], 16, { animate: true });
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'location',
                    latitude: lat,
                    longitude: lng
                }));
            };
        </script>
    </body>
    </html>`;
}
