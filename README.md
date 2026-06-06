# Unreal Engine Bridge

A minimal Chrome extension that lets hosted HTTP(S) pages proxy requests to a local Unreal Engine 5 Remote Control HTTP API running on `http://127.0.0.1:30010`.

## Why this exists

Browsers do not allow remote websites to directly call your local Unreal Engine Remote Control endpoint on `localhost`. `Unreal Engine Bridge` solves that by:

1. injecting a content script into HTTP(S) pages,
2. forwarding page messages to the extension service worker,
3. proxying approved local HTTP requests to Unreal Engine, and
4. returning the response back to the page.

## Features

- Chrome extension built with Manifest V3
- Source files are organized under `src/`
- Supports bridge health checks through `UE_BRIDGE_PING`
- Supports proxied local HTTP requests through `UE_LOCAL_FETCH`
- Restricts requests to local HTTP hosts only
- Restricts requests to port `30010` on `127.0.0.1` / `localhost`
- Returns both text and base64 payloads so pages can render JSON or binary responses such as images
- Includes a full example page in `examples/index.html`
- Includes a packaged release artifact in `examples/unreal-engine-bridge.zip`

## Installation

### Load unpacked extension from source

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `src/` folder in this repository

> Chrome requires `manifest.json` to be at the root of the selected folder, so when developing locally you should load `src/`, not the repository root.

### Install from zip

1. Unzip `examples/unreal-engine-bridge.zip`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the extracted `unreal-engine-bridge` folder

## Unreal Engine requirements

Before using the bridge, enable the **Remote Control API** plugin in Unreal Engine.

Then make sure Unreal Engine exposes the Remote Control HTTP API locally:

- Base URL: `http://127.0.0.1:30010`
- Protocol: HTTP
- Allowed hosts: `127.0.0.1`, `localhost`
- Allowed port: `30010`

### Unreal settings

For the bridge and the example page to work reliably, configure the following Unreal settings.

#### `RemoteControlSettings`

```ini
bRestrictServerAccess=True
bEnableRemotePythonExecution=True
```

Optional for screenshot flows only:

```ini
bAllowConsoleCommandRemoteExecution=True
```

#### `EditorPerformanceSettings`

```ini
bThrottleCPUWhenNotForeground=False
```

These settings are important because:

- `bRestrictServerAccess=True` keeps the Remote Control server limited to local access.
- `bEnableRemotePythonExecution=True` is required by screenshot and other Python-driven helper flows used by `examples/index.html`.
- `bAllowConsoleCommandRemoteExecution=True` is only needed for flows that trigger Unreal console commands, such as the screenshot example that calls `HighResShot`.
- `bThrottleCPUWhenNotForeground=False` helps avoid background-editor throttling when Chrome and Unreal are open side by side.

If your Unreal instance uses a different port, update both:

- `src/manifest.json` host permissions
- the validation logic in `src/background.js`
- any calling page such as `examples/index.html`

## Quick start

1. Start Unreal Engine with Remote Control HTTP API enabled on `127.0.0.1:30010`
2. Install the extension in Chrome
3. Host or open an HTTP(S) page that speaks the bridge protocol
4. Open `examples/index.html` from a local web server or copy its bridge logic into your own tool page
5. Call `UE_BRIDGE_PING` to confirm the extension is available
6. Call `UE_LOCAL_FETCH` to proxy local requests through the extension

> Important: Chrome extensions do **not** run on `file://` pages in this setup. Use an HTTP(S) page.

## Security model

`src/background.js` intentionally keeps the proxy narrow:

- only `http://` URLs are allowed
- only `127.0.0.1` and `localhost` are allowed
- only port `30010` is allowed
- unsupported message types are rejected

This prevents arbitrary cross-network proxying from remote pages.

## Example page

`examples/index.html` is the hosted example page and contains:

- extension install hints
- bridge connectivity checks
- multiple Unreal Engine Remote Control API examples
- screenshot and asset utility examples

You can use it as:

- a manual QA page
- a protocol reference
- a starting point for your own hosted Unreal tools

## Development

Because this project is plain JavaScript, there is no build step.

After editing `src/manifest.json`, `src/background.js`, or `src/content.js`:

1. go to `chrome://extensions`
2. find **Unreal Engine Bridge**
3. click **Reload**
4. refresh your tool page

## Rebuild the zip package

From the repository root:

```bash
mkdir -p examples
rm -f examples/unreal-engine-bridge.zip
tmpdir=$(mktemp -d)
mkdir -p "$tmpdir/unreal-engine-bridge"
cp src/manifest.json src/background.js src/content.js "$tmpdir/unreal-engine-bridge/"
(cd "$tmpdir" && zip -rq /path/to/this/repo/examples/unreal-engine-bridge.zip unreal-engine-bridge)
rm -rf "$tmpdir"
```

This keeps the repository source under `src/` while producing a release zip whose extracted folder has `manifest.json` at the root, which is what Chrome expects.

## Publishing checklist

- Update `src/manifest.json` version
- Reload the extension locally and verify `UE_BRIDGE_PING`
- Verify at least one `UE_LOCAL_FETCH` request succeeds against UE5
- Rebuild `examples/unreal-engine-bridge.zip`
- Update this `README.md` if the protocol or permissions change
- Commit and tag the release in Git

