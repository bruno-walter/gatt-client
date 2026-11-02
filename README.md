# BLE GATT Client

A browser-based Bluetooth Low Energy GATT explorer powered by the Web Bluetooth API.

## Features

- Connect to any BLE device
- Browse GATT services and characteristics
- Read and write characteristic values
- Subscribe to characteristic notifications
- Works in Chrome, Edge, and Opera on desktop and Android

## Web Bluetooth Support

This application uses the **Web Bluetooth API**, which is currently supported in:

- **Chrome** and **Edge** on Windows, macOS, Linux, and Android
- **Opera** on desktop and Android

**Important Notes:**

- Web Bluetooth requires **user initiation** (you must click "Connect" first)
- Connections require **HTTPS** or **localhost** (not `http://`)
- On Android, you may need to grant location permission for BLE scanning
- Only one BLE device can be connected at a time

## How to Use

1. Open the GitHub Pages site in a compatible browser
2. Click **Connect** and select your device
3. Once connected, click **Discover Services** to browse the GATT database
4. Click any characteristic to read its value, write to it, or subscribe to notifications

## Deployment

This project is configured for GitHub Pages deployment. The site will be available at:

`https://<your-username>.github.io/gatt-client/`

## Development

To run locally:

```bash
# Simple Python HTTP server
cd gatt-client-public
python3 -m http.server 8000

# Or use Live Server extension in VS Code
```