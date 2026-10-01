#!/bin/sh
# Renders the security headers for the API the bundle was built against.
# An empty VITE_API_URL means the API is served from the app's own origin,
# which 'self' already covers.
set -eu

api_origin=$(printf '%s' "${VITE_API_URL:-}" | sed -E 's#^(https?://[^/]+).*#\1#')
api_ws_origin=$(printf '%s' "$api_origin" | sed -E 's#^http#ws#')

API_ORIGIN="$api_origin" API_WS_ORIGIN="$api_ws_origin" \
    envsubst '${API_ORIGIN} ${API_WS_ORIGIN}' < "$1" > "$2"
