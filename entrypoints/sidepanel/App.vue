<script lang="ts" setup>
import { ref, onMounted, nextTick } from 'vue';
import { sendMessage as sendExtensionMessage } from '@/messaging/protocol';
import { browser } from 'wxt/browser';

interface TabInfo {
  id: number;
  url: string;
  title: string;
  active: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

const messages = ref<ChatMessage[]>([]);
const inputMessage = ref('');
const isLoading = ref(false);
const currentTab = ref<TabInfo | null>(null);
const availableTabs = ref<TabInfo[]>([]);
const chatContainer = ref<HTMLElement | null>(null);

const MCP_SERVER_URL = 'http://localhost:3000';

// Initialize
onMounted(async () => {
  // Load current tab info
  await loadCurrentTab();
  await loadAvailableTabs();

  // Add welcome message
  addMessage('system', 'Claude in Chrome is ready! You can ask me to help you with browser automation tasks like navigating to websites, clicking elements, filling forms, and more.');

  // Listen for tab updates
  browser.tabs.onActivated.addListener(loadCurrentTab);
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url || changeInfo.title) {
      loadCurrentTab();
    }
  });
});

async function loadCurrentTab() {
  try {
    const tab = await browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0]);
    if (tab?.id) {
      currentTab.value = {
        id: tab.id,
        url: tab.url || '',
        title: tab.title || '',
        active: tab.active,
      };
    }
  } catch (error) {
    console.error('Failed to load current tab:', error);
  }
}

async function loadAvailableTabs() {
  try {
    const tabs = await sendExtensionMessage('tabs_list', {});
    availableTabs.value = tabs;
  } catch (error) {
    console.error('Failed to load tabs:', error);
  }
}

function addMessage(role: 'user' | 'assistant' | 'system', content: string) {
  messages.value.push({
    id: Date.now().toString(),
    role,
    content,
    timestamp: Date.now(),
  });
  scrollToBottom();
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

async function sendChatMessage() {
  const userMessage = inputMessage.value.trim();
  if (!userMessage || isLoading.value) return;

  // Add user message
  addMessage('user', userMessage);
  inputMessage.value = '';
  isLoading.value = true;

  try {
    // Get current page context
    const pageContent = await sendExtensionMessage('get_page_content', {});
    const tabs = await sendExtensionMessage('tabs_list', {});

    // Prepare context for the AI
    const context = {
      currentPage: {
        url: currentTab.value?.url || '',
        title: currentTab.value?.title || '',
      },
      availableTabs: tabs.map((t: TabInfo) => ({
        id: t.id,
        url: t.url,
        title: t.title,
        active: t.active,
      })),
      userMessage,
    };

    // Send to MCP server (this would connect to Claude Code)
    const response = await fetch(`${MCP_SERVER_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      throw new Error(`MCP server error: ${response.statusText}`);
    }

    const data = await response.json();

    // Process any tool calls from the response
    if (data.toolCalls && data.toolCalls.length > 0) {
      for (const toolCall of data.toolCalls) {
        await executeToolCall(toolCall);
      }
    }

    // Add assistant response
    addMessage('assistant', data.response || 'No response from server');

  } catch (error) {
    console.error('Error sending message:', error);
    addMessage('system', `Error: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    isLoading.value = false;
  }
}

async function executeToolCall(toolCall: { name: string; parameters: Record<string, import('@/types').JsonValue> }) {
  const { name, parameters } = toolCall;

  try {
    let result;
    switch (name) {
      case 'navigate':
        result = await sendExtensionMessage('navigate', parameters as { url: string; tabId?: number });
        break;
      case 'click':
        result = await sendExtensionMessage('click', parameters as { selector: string; tabId?: number });
        break;
      case 'fill':
        result = await sendExtensionMessage('fill', parameters as { selector: string; value: string; tabId?: number });
        break;
      case 'get_page_content':
        result = await sendExtensionMessage('get_page_content', parameters as { selector?: string; tabId?: number });
        break;
      case 'screenshot':
        result = await sendExtensionMessage('screenshot', parameters as { tabId?: number; format?: 'png' | 'jpeg'; quality?: number });
        break;
      case 'list_tabs':
        result = await sendExtensionMessage('tabs_list', parameters as { activeOnly?: boolean });
        break;
      case 'activate_tab':
        result = await sendExtensionMessage('tabs_activate', parameters as { tabId: number });
        break;
      case 'reload':
        result = await sendExtensionMessage('reload', (parameters as { tabId?: number }).tabId);
        break;
      case 'query_selector':
        result = await sendExtensionMessage('query_selector', parameters as { selector: string; tabId?: number });
        break;
      case 'query_selector_all':
        result = await sendExtensionMessage('query_selector_all', parameters as { selector: string; tabId?: number });
        break;
      case 'get_form_values':
        result = await sendExtensionMessage('get_form_values', parameters as { selector?: string; tabId?: number });
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    addMessage('system', `Executed: ${name}\nResult: ${JSON.stringify(result, null, 2)}`);

    // Refresh current tab info after actions
    await loadCurrentTab();
    await loadAvailableTabs();
  } catch (error) {
    addMessage('system', `Tool execution failed: ${name} - ${error instanceof Error ? error.message : String(error)}`);
  }
}

function handleKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChatMessage();
  }
}

function formatMessage(content: string): string {
  // Simple formatting - in production, use a proper markdown renderer
  return content
    .replace(/```[\s\S]*?```/g, '<pre><code>$&</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}
</script>

<template>
  <div class="sidepanel-container">
    <!-- Header -->
    <header class="header">
      <h1>Claude in Chrome</h1>
      <div class="current-page" v-if="currentTab">
        <span class="page-title">{{ currentTab.title }}</span>
        <span class="page-url">{{ currentTab.url }}</span>
      </div>
    </header>

    <!-- Chat Messages -->
    <div ref="chatContainer" class="chat-container">
      <div v-for="message in messages" :key="message.id" :class="['message', `message-${message.role}`]">
        <div class="message-role">{{ message.role }}</div>
        <div class="message-content" v-html="formatMessage(message.content)"></div>
        <div class="message-time">{{ new Date(message.timestamp).toLocaleTimeString() }}</div>
      </div>

      <div v-if="isLoading" class="message message-assistant">
        <div class="message-role">assistant</div>
        <div class="message-content">
          <span class="typing-indicator">Thinking...</span>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="input-container">
      <textarea v-model="inputMessage" @keydown="handleKeyPress"
        placeholder="Ask me to help with browser tasks... (Shift+Enter for new line)" class="message-input" rows="3"
        :disabled="isLoading"></textarea>
      <button @click="sendChatMessage" :disabled="isLoading || !inputMessage.trim()" class="send-button">
        Send
      </button>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button @click="addMessage('user', 'What page am I on?')" class="quick-action">
        Current Page
      </button>
      <button @click="addMessage('user', 'List all open tabs')" class="quick-action">
        List Tabs
      </button>
      <button @click="addMessage('user', 'Take a screenshot')" class="quick-action">
        Screenshot
      </button>
    </div>
  </div>
</template>

<style scoped>
.sidepanel-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a1a;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  padding: 16px;
  border-bottom: 1px solid #333;
  background: #252525;
}

.header h1 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.current-page {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-title {
  font-size: 12px;
  font-weight: 500;
  color: #b0b0b0;
}

.page-url {
  font-size: 11px;
  color: #707070;
  word-break: break-all;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  max-width: 90%;
}

.message-user {
  align-self: flex-end;
  background: #3a3a3a;
}

.message-assistant {
  align-self: flex-start;
  background: #2a3a2a;
}

.message-system {
  align-self: center;
  background: #3a2a2a;
  max-width: 95%;
  font-size: 12px;
}

.message-role {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  opacity: 0.7;
  margin-bottom: 4px;
}

.message-content {
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.message-content :deep(pre) {
  background: #1a1a1a;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}

.message-content :deep(code) {
  background: #1a1a1a;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 12px;
}

.message-time {
  font-size: 10px;
  opacity: 0.5;
  align-self: flex-end;
}

.typing-indicator {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 0.5;
  }

  50% {
    opacity: 1;
  }
}

.input-container {
  padding: 16px;
  border-top: 1px solid #333;
  background: #252525;
  display: flex;
  gap: 8px;
}

.message-input {
  flex: 1;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 12px;
  color: #e0e0e0;
  font-size: 14px;
  font-family: inherit;
  resize: none;
}

.message-input:focus {
  outline: none;
  border-color: #666;
}

.message-input:disabled {
  opacity: 0.5;
}

.send-button {
  padding: 12px 24px;
  background: #4a9eff;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #3a8eef;
}

.send-button:disabled {
  background: #3a3a3a;
  cursor: not-allowed;
  opacity: 0.5;
}

.quick-actions {
  padding: 8px 16px;
  display: flex;
  gap: 8px;
  border-top: 1px solid #333;
}

.quick-action {
  padding: 8px 12px;
  background: #333;
  border: none;
  border-radius: 6px;
  color: #b0b0b0;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.quick-action:hover {
  background: #444;
  color: #e0e0e0;
}
</style>
