# MCP in Browser - Architecture Documentation

## Overview

MCP in Browser is a browser automation Chrome/Firefox extension built with WXT (Web Extension Tools) and Vue 3 + TypeScript. It provides browser automation tools to Claude Code via the Model Context Protocol (MCP).

## Enhanced Architecture (v2.0)

The project has been refactored with the following improvements:

### Directory Structure

```
mcp-in-browser/
├── src/
│   ├── core/              # Core infrastructure
│   │   ├── errors.ts      # Error types and handling
│   │   ├── config.ts      # Configuration management
│   │   ├── logger.ts      # Structured logging
│   │   ├── validator.ts   # Runtime schema validation
│   │   └── id-generator.ts # ID generation
│   ├── messaging/         # Message handling
│   │   └── message-queue.ts # Request/response queuing
│   ├── bridge/            # WebSocket bridge client
│   │   └── client.ts     # Unified bridge client
│   ├── concurrency/       # Concurrency control
│   │   └── task-queue.ts # Task queue with limits
│   ├── content/          # Content script utilities
│   │   ├── locators.ts   # Element location strategies
│   │   ├── wait-for.ts   # Advanced wait strategies
│   │   ├── interactions.ts # User interaction methods
│   │   └── page-info.ts  # Page information extraction
│   ├── cache/            # Caching layer
│   │   └── cache-manager.ts # LRU cache with TTL
│   ├── testing/          # Test infrastructure
│   │   └── helpers.ts    # Test utilities
│   └── background/       # Background script modules
│       └── tools.ts      # Tool execution handlers
├── entrypoints/
│   ├── background.ts      # Background script entry point
│   ├── content.ts        # Content script (enhanced)
│   ├── popup/            # Popup UI
│   └── sidepanel/        # Side panel UI
├── mcp-server/          # MCP server
│   ├── index.ts          # MCP server entry point
│   ├── index-new.ts      # Enhanced MCP server
│   ├── bridge.ts         # WebSocket bridge server
│   └── tests/           # Test suite
├── background-bridge.ts  # Extension bridge client (legacy)
└── background-bridge-new.ts # Enhanced bridge client
```

## Core Components

### 1. Error Handling (`core/errors.ts`)

- **AppError**: Base error class with error codes
- **ErrorCode**: Enum of all possible error types
- **handleError()**: Standardized error response formatting

```typescript
throw new AppError(ErrorCode.ELEMENT_NOT_FOUND, 'Element not found');
```

### 2. Configuration (`core/config.ts`)

```typescript
interface AppConfig {
  bridge: { url, port, reconnectInterval, maxReconnectAttempts, messageQueueLimit };
  timeouts: { contentScriptResponse, elementWait, pageLoad, networkIdle };
  concurrency: { maxPerTab, maxGlobal };
  logging: { level, enableTracing };
}
```

### 3. Logging (`core/logger.ts`)

- Structured logging with levels (debug, info, warn, error)
- Log history with filtering
- Request ID tracking for distributed tracing

```typescript
logger.info('Context', 'Message', { data }, requestId);
```

### 4. Schema Validation (`core/validator.ts`)

- Runtime validation for all tool inputs
- Zod-like API with type safety
- Pre-defined schemas for all tools

```typescript
const validated = Schemas.navigate.parse({ url: 'https://example.com' });
```

### 5. WebSocket Bridge Client (`bridge/client.ts`)

Unified implementation for both extension and MCP server:

- Auto-reconnection with exponential backoff
- Message queue for offline buffering
- Request timeout handling
- Custom message handler support

### 6. Task Queue (`concurrency/task-queue.ts`)

Per-tab concurrency control:

- Global max concurrent tasks
- Per-tab task limits
- Priority-based scheduling
- Automatic queue processing

### 7. Element Locators (`content/locators.ts`)

Multiple element location strategies:

- CSS selector
- XPath
- Text content
- ARIA label
- ARIA role
- Name attribute
- Placeholder

```typescript
ElementLocator.byCSS('#button');
ElementLocator.byText('Submit');
ElementLocator.byXPath('//div[@class="item"]');
```

### 8. Advanced Wait Strategies (`content/wait-for.ts`)

- `waitFor.element()` - Wait for element in DOM
- `waitFor.visible()` - Wait for element to be visible
- `waitFor.clickable()` - Wait for element to be clickable
- `waitFor.pageLoad()` - Wait for page load
- `waitFor.networkIdle()` - Wait for network idle
- `waitFor.urlChange()` - Wait for URL change
- `waitFor.textContent()` - Wait for text content
- `waitFor.attribute()` - Wait for attribute value
- `waitFor.custom()` - Custom wait conditions

### 9. User Interactions (`content/interactions.ts`)

- `click()` - Click element with options
- `clickAt()` - Click at coordinates
- `fill()` - Fill input field
- `type()` - Type text character by character
- `pressKey()` - Press keyboard keys with modifiers
- `hover()` - Hover over element
- `selectOption()` - Select dropdown option
- `getText()` - Get element text
- `getAttribute()` - Get element attribute

### 10. Page Information (`content/page-info.ts`)

- `getPageContent()` - Get full page content
- `getElementInfo()` - Get detailed element info
- `getFormValues()` - Extract form data
- `getVisibleText()` - Get all visible text
- `getLinks()` - Get all links
- `getImages()` - Get all images
- `getHeadings()` - Get page headings
- `getPageStructure()` - Get page structure

### 11. Cache Manager (`cache/cache-manager.ts`)

LRU cache with TTL:

- Maximum size enforcement
- Time-to-live expiration
- Least-recently-used eviction
- Access statistics
- Bulk operations

```typescript
cache.set('key', value, ttl);
cache.get('key'); // undefined if expired
```

### 12. Test Infrastructure (`testing/helpers.ts`)

- `TestRunner` - Test execution framework
- `MockChrome` - Chrome API mocks
- `TestDataGenerator` - Test data generation
- `Assertions` - Test assertions
- `AsyncTestUtils` - Async test utilities

## Tool Definitions

All tools are defined in `src/background/tools.ts`:

| Tool | Description | New |
|------|-------------|-----|
| navigate | Navigate to URL | |
| click | Click element | |
| click_at | Click at coordinates | |
| fill | Fill input field | |
| type | Type text char by char | ✅ |
| press_key | Press keyboard key | ✅ |
| hover | Hover over element | ✅ |
| select_option | Select dropdown option | ✅ |
| get_page_content | Get page content | |
| screenshot | Take screenshot | |
| list_tabs | List all tabs | |
| activate_tab | Activate tab | |
| reload | Reload page | |
| query_selector | Query single element | |
| query_selector_all | Query all elements | |
| get_form_values | Get form values | |
| get_text | Get element text | ✅ |
| get_attribute | Get element attribute | ✅ |
| wait_for | Wait for element | ✅ |
| wait_for_visible | Wait for visible | ✅ |
| wait_for_text | Wait for text content | ✅ |

## Communication Flow

```
Claude Code
    ↓
MCP Server (stdio)
    ↓ WebSocket
Bridge Server (ws://localhost:37373)
    ↓ WebSocket
Extension Background (BridgeClient)
    ↓ chrome.runtime.sendMessage
Content Script
    ↓
DOM Interaction
```

## Configuration

Configuration is stored in Chrome storage and can be updated at runtime:

```typescript
import { updateConfig } from './src/background';

await updateConfig({
  logging: { level: 'debug', enableTracing: true },
  concurrency: { maxPerTab: 5, maxGlobal: 20 },
});
```

## Development Commands

```bash
# Development
npm run dev              # Chrome development
npm run dev:firefox      # Firefox development

# Build
npm run build            # Chrome production
npm run build:firefox    # Firefox production

# MCP Server
npm run bridge           # Start bridge server
npm run mcp-server       # Start MCP server
npm run mcp-server:enhanced  # Start enhanced MCP server

# Testing
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode

# Type checking
npm run typecheck        # TypeScript type checking

# Linting and formatting
npm run lint             # ESLint
npm run format           # Prettier
```

## Migration Guide

### From v1.0 to v2.0

1. Update imports to use new `src/` directory structure
2. Use `AppError` and `ErrorCode` for error handling
3. Use `Schemas` for input validation
4. Use `logger` for structured logging
5. Use new tool APIs (type, press_key, hover, etc.)

### Example: Old vs New

**Old:**
```typescript
chrome.tabs.sendMessage(tabId, { type: 'click', selector: '#button' });
```

**New:**
```typescript
import { Interactions } from './src/content/interactions';

const result = await Interactions.click('#button', {
  scrollIntoView: true,
  waitForClickable: true,
});
```

## Performance Optimizations

1. **LRU Cache**: Element queries and page content are cached
2. **Request Queue**: Automatic request batching and deduplication
3. **Concurrency Control**: Per-tab limits prevent overload
4. **Lazy Loading**: Content script modules loaded on demand
5. **Message Queue**: Offline buffering prevents message loss

## Security Considerations

1. All user inputs are validated using schemas
2. Content script isolation with `defineContentScript`
3. No sensitive data in logs
4. Secure WebSocket connections (WSS recommended for production)

## Future Enhancements

- [ ] iframe support
- [ ] Shadow DOM support
- [ ] WebSocket-based MCP transport (no bridge)
- [ ] Visual regression testing
- [ ] Workflow orchestration
- [ ] Browser profile management
- [ ] Recording and replay
