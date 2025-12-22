# MCP in Browser

A browser automation Chrome/Firefox extension that works with Claude Code via the Model Context Protocol (MCP). This project provides similar functionality to the official Claude in Chrome extension, but allows you to use your own models and APIs.

## Features

- **Browser Automation Tools**: Navigate, click elements, fill forms, take screenshots
- **Side Panel Chat Interface**: Chat with AI directly in the browser side panel
- **MCP Server Integration**: Works with Claude Code via stdio transport
- **Content Script Automation**: Interact with any web page using CSS selectors
- **Tab Management**: List, activate, and manage browser tabs
- **WebSocket Bridge**: Bidirectional communication between MCP server and browser extension

## Architecture

The project uses a bridge architecture to connect the MCP server (Node.js) with the browser extension:

```
┌─────────────────┐     stdio           ┌──────────────────┐
│   Claude Code   │ ◄─────────────────► │   MCP Server     │
│   (MCP Host)    │                      │  (index.ts)      │
└─────────────────┘                      └────────┬─────────┘
                                                 │
                                                 │ WebSocket
                                                 │
                                        ┌────────▼─────────┐
                                        │   WebSocket      │
                                        │   Bridge         │
                                        │  (bridge.ts)     │
                                        └────────┬─────────┘
                                                 │
                                                 │ WebSocket
                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Browser Extension                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Background.js  │  Content Script │      Side Panel            │
│  - Bridge client│  - DOM actions  │   - Chat UI               │
│  - Tool handler │  - Click/Fill   │   - Tool display          │
│  - Tab mgmt     │  - Page content │   - Context view           │
│  - Screenshots  │                 │                            │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### Components

1. **MCP Server** (`mcp-server/index.ts`): Implements the MCP protocol, exposes browser automation tools
2. **WebSocket Bridge** (`mcp-server/bridge.ts`): Forwards messages between MCP server and browser extension
3. **Browser Extension**: Chrome/Firefox extension that executes browser automation

## Installation

### 1. Build the Extension

```bash
# Install dependencies
pnpm install

# Build for Chrome
pnpm run build

# Or run in development mode
pnpm run dev
```

### 2. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3` directory

### 3. Start the Bridge Server

The bridge server must be running for the MCP server to communicate with the extension:

```bash
pnpm run bridge
```

You should see:
```
[Bridge] WebSocket server started on ws://localhost:37373
[Bridge] Waiting for clients to connect...
```

Then load the extension - you should see:
```
[Bridge] Extension client registered
```

### 4. Configure MCP Server for Claude Code

Add to your Claude Code settings (`~/.config/claude-code/config.json` or similar):

**Option 1: Using tsx directly (Recommended)**

```json
{
  "mcpServers": {
    "mcp-in-browser": {
      "command": "tsx",
      "args": ["/Users/jtsang/Documents/playground/claude-in-chrome/mcp-server/index.ts"]
    }
  }
}
```

**Option 2: Using pnpm**

```json
{
  "mcpServers": {
    "mcp-in-browser": {
      "command": "pnpm",
      "args": ["run", "mcp-server"],
      "cwd": "/Users/jtsang/Documents/playground/claude-in-chrome"
    }
  }
}
```

**Option 3: Using npx (no installation needed)**

```json
{
  "mcpServers": {
    "mcp-in-browser": {
      "command": "npx",
      "args": ["-y", "tsx", "/Users/jtsang/Documents/playground/claude-in-chrome/mcp-server/index.ts"]
    }
  }
}
```

> **Note**: Replace `/Users/jtsang/Documents/playground/claude-in-chrome` with your actual project path.

## Usage Flow

1. **Start the bridge**: `pnpm run bridge`
2. **Load the extension** in Chrome (connects to bridge automatically)
3. **Configure Claude Code** with the MCP server
4. **Use tools** from Claude Code - requests flow: Claude Code → MCP Server → Bridge → Extension

## Available Tools

The MCP server exposes the following tools to Claude Code:

| Tool | Description | Parameters |
|------|-------------|------------|
| `navigate` | Navigate to a URL | `url`, `tabId?` |
| `click` | Click an element | `selector`, `tabId?` |
| `fill` | Fill an input field | `selector`, `value`, `tabId?` |
| `get_page_content` | Get page text/HTML | `selector?`, `tabId?` |
| `screenshot` | Capture page screenshot | `tabId?`, `format?`, `quality?` |
| `list_tabs` | List all open tabs | `activeOnly?` |
| `activate_tab` | Switch to a tab | `tabId` |
| `reload` | Reload current/tab | `tabId?` |
| `query_selector` | Find element details | `selector`, `tabId?` |
| `query_selector_all` | Find all matching elements | `selector`, `tabId?` |
| `get_form_values` | Get form input values | `selector?`, `tabId?` |

## Development

```bash
# Development (with hot reload)
pnpm run dev           # Chrome
pnpm run dev:firefox   # Firefox

# Type checking
pnpm run compile

# Production builds
pnpm run build           # Chrome
pnpm run build:firefox   # Firefox

# Create distributable packages
pnpm run zip             # Chrome
pnpm run zip:firefox     # Firefox

# Run bridge server
pnpm run bridge

# Run MCP server directly (for testing)
pnpm run mcp-server
pnpm run mcp-server:dev  # With watch mode
```

## Project Structure

```
mcp-in-browser/
├── entrypoints/
│   ├── background.ts       # Service worker (bridge client, tool handler)
│   ├── content.ts          # Content script (DOM automation)
│   ├── sidepanel/          # Side panel chat UI
│   │   ├── App.vue
│   │   ├── main.ts
│   │   └── style.css
│   └── popup/              # Extension popup
├── messaging/
│   └── protocol.ts         # Type-safe messaging protocol
├── mcp-server/
│   ├── index.ts            # MCP server implementation
│   └── bridge.ts           # WebSocket bridge
├── types/
│   └── index.ts            # TypeScript definitions
├── background-bridge.ts    # Extension WebSocket client
├── wxt.config.ts           # WXT framework config
└── package.json
```

## Troubleshooting

### Bridge Issues

**Problem**: "Extension not connected" error

**Solution**:
1. Ensure the bridge is running: `pnpm run bridge`
2. Check bridge logs show "Extension client registered"
3. Reload the extension in Chrome

**Problem**: Bridge exits with code 137

**Solution**: This is usually a memory issue or manual kill. Restart:
```bash
pkill -f "tsx.*bridge"
pnpm run bridge
```

### Extension Issues

**Problem**: Extension doesn't connect to bridge

**Solution**: Check the service worker console:
1. Go to `chrome://extensions/`
2. Find "MCP in Browser"
3. Click "Service worker" to view console
4. Look for "[Extension] Connected to bridge"

### MCP Server Issues

**Problem**: Tools timeout

**Solution**:
1. Verify bridge is running and extension is connected
2. Check both bridge and service worker console logs
3. Ensure the content script is injected (navigate to a webpage first)

## Permissions

The extension requires the following Chrome permissions:

- `tabs` - Access tab information and management
- `activeTab` - Interact with the active tab
- `storage` - Store preferences and state
- `sidePanel` - Show the side panel UI
- `scripting` - Inject content scripts
- `<all_urls>` - Access all websites for automation

## Security Considerations

- The extension content script runs on all websites
- Always review AI-generated automation commands before execution
- Sensitive page data (passwords, tokens) is accessible to content scripts
- The bridge uses WebSocket connections on localhost only
- Consider adding authentication for production use

## Limitations

- Content scripts cannot interact with browser chrome UI (settings, extensions pages)
- Some websites may block content script injection (CSP)
- File:// URLs require special Chrome configuration
- Bridge must be running for tools to work

## Roadmap

- [ ] Add support for file uploads
- [ ] Implement drag-and-drop automation
- [ ] Add visual element selection
- [ ] Create recording/playback feature
- [ ] Add multi-step workflow support
- [ ] Firefox support testing

## License

MIT

## Credits

- Built with [WXT](https://wxt.dev/) - Web Extension Tools
- Uses [Vue 3](https://vuejs.org/) for UI
- MCP implementation based on [Model Context Protocol](https://modelcontextprotocol.io/)
