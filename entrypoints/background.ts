import { onMessage } from '@/messaging/protocol';
import type { ProtocolMapType } from '@/messaging/protocol';
import { connectToBridge } from '../background-bridge';

// Store for pending responses from content scripts
const pendingResponses = new Map<string, {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

// Generate unique message IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Send a message to a content script and wait for a response
 */
function sendToContentScript<T>(
  tabId: number,
  message: { type: string; id: string; [key: string]: unknown },
  timeout = 30000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      pendingResponses.delete(message.id);
      reject(new Error('Content script response timeout'));
    }, timeout);

    pendingResponses.set(message.id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout: timeoutHandle,
    });

    chrome.tabs.sendMessage(tabId, message).catch((error: unknown) => {
      pendingResponses.delete(message.id);
      clearTimeout(timeoutHandle);
      reject(error as Error);
    });
  });
}

/**
 * Handle responses from content scripts
 */
chrome.runtime.onMessage.addListener((message: { type: string; id?: string; [key: string]: unknown }, sender: chrome.runtime.MessageSender) => {
  if (message.type === 'response' && message.id && pendingResponses.has(message.id)) {
    const pending = pendingResponses.get(message.id)!;
    clearTimeout(pending.timeout);
    pendingResponses.delete(message.id);

    if (message.error) {
      pending.reject(new Error(message.error as string));
    } else {
      pending.resolve(message.data);
    }
  }
  return false;
});

// Set up message handlers for each tool type
onMessage('tabs_list', async ({ data }) => {
  const query = data?.activeOnly ? { active: true } : {};
  const tabs = await chrome.tabs.query(query);
  return tabs.map(tab => ({
    id: tab.id!,
    url: tab.url || '',
    title: tab.title || '',
    active: tab.active,
  }));
});

onMessage('tabs_activate', async ({ data }) => {
  const tabId = data?.tabId as number;
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update((await chrome.tabs.get(tabId)).windowId!, { focused: true });
});

onMessage('tabs_get_current', async () => {
  const tab = await chrome.tabs.query({ active: true, currentWindow: true }).then((tabs: chrome.tabs.Tab[]) => tabs[0]);
  if (!tab?.id) return null;
  return {
    id: tab.id,
    url: tab.url || '',
    title: tab.title || '',
    active: tab.active,
  };
});

onMessage('navigate', async ({ data }) => {
  const tabId = data?.tabId as number | undefined;
  const url = data?.url as string;

  if (tabId !== undefined) {
    await chrome.tabs.update(tabId, { url });
    await chrome.tabs.update(tabId, { active: true });
  } else {
    await chrome.tabs.create({ url });
  }

  return { success: true };
});

onMessage('reload', async ({ data }) => {
  const tabId = data as number | undefined;
  if (tabId !== undefined) {
    await chrome.tabs.reload(tabId);
  } else {
    const tab = await chrome.tabs.query({ active: true, currentWindow: true }).then((tabs: chrome.tabs.Tab[]) => tabs[0]);
    if (tab?.id) {
      await chrome.tabs.reload(tab.id);
    }
  }
  return { success: true };
});

onMessage('click', async ({ data }) => {
  const tabId = (data?.tabId as number | undefined) ?? (await chrome.tabs.query({ active: true, currentWindow: true }).then((tabs: chrome.tabs.Tab[]) => tabs[0]))?.id;

  if (!tabId) {
    return { success: false, error: 'No active tab' };
  }

  try {
    const result = await sendToContentScript<{ success: boolean; error?: string }>(tabId, {
      type: 'click',
      selector: data?.selector as string,
      id: generateId(),
    });
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

onMessage('fill', async ({ data }) => {
  const tabId = (data?.tabId as number | undefined) ?? (await chrome.tabs.query({ active: true, currentWindow: true }).then((tabs: chrome.tabs.Tab[]) => tabs[0]))?.id;

  if (!tabId) {
    return { success: false, error: 'No active tab' };
  }

  try {
    const result = await sendToContentScript<{ success: boolean; error?: string }>(tabId, {
      type: 'fill',
      selector: data?.selector as string,
      value: data?.value as string,
      id: generateId(),
    });
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

onMessage('get_page_content', async ({ data }) => {
  const tabId = (data?.tabId as number | undefined) ?? (await chrome.tabs.query({ active: true, currentWindow: true }).then((tabs: chrome.tabs.Tab[]) => tabs[0]))?.id;

  if (!tabId) {
    return { success: false, error: 'No active tab', content: undefined };
  }

  try {
    const result = await sendToContentScript<{ success: boolean; content?: { url: string; title: string; text?: string; html?: string; selectedContent?: string }; error?: string }>(tabId, {
      type: 'get_page_content',
      selector: data?.selector as string | undefined,
      id: generateId(),
    });
    // Add timestamp to content to match PageContent type
    if (result.success && result.content) {
      return {
        success: true,
        content: {
          url: result.content.url,
          title: result.content.title,
          text: result.content.text,
          html: result.content.html,
          selectedContent: result.content.selectedContent,
          timestamp: Date.now(),
        }
      };
    }
    return { success: false, error: result.error, content: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error), content: undefined };
  }
});

onMessage('screenshot', async ({ data }) => {
  const tabId = (data?.tabId as number | undefined) ?? (await chrome.tabs.query({ active: true, currentWindow: true }).then((tabs: chrome.tabs.Tab[]) => tabs[0]))?.id;

  if (!tabId) {
    return { success: false, error: 'No active tab' };
  }

  try {
    const currentWindow = await chrome.windows.getCurrent();
    if (!currentWindow.id) {
      return { success: false, error: 'No current window' };
    }
    const dataUrl = await chrome.tabs.captureVisibleTab(
      currentWindow.id,
      { format: (data?.format as 'png' | 'jpeg') || 'png', quality: (data?.quality as number) || 90 }
    );

    return {
      success: true,
      screenshot: { dataUrl, width: 0, height: 0 },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

onMessage('query_selector', async ({ data }) => {
  const tabId = (data?.tabId as number | undefined) ?? (await chrome.tabs.query({ active: true, currentWindow: true }).then((tabs: chrome.tabs.Tab[]) => tabs[0]))?.id;

  if (!tabId) {
    return { success: false, error: 'No active tab' };
  }

  try {
    const result = await sendToContentScript<{ success: boolean; element?: string; error?: string }>(tabId, {
      type: 'query_selector',
      selector: data?.selector as string,
      id: generateId(),
    });
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

onMessage('query_selector_all', async ({ data }) => {
  const tabId = (data?.tabId as number | undefined) ?? (await chrome.tabs.query({ active: true, currentWindow: true }).then((tabs: chrome.tabs.Tab[]) => tabs[0]))?.id;

  if (!tabId) {
    return { success: false, error: 'No active tab' };
  }

  try {
    const result = await sendToContentScript<{ success: boolean; elements?: string[]; error?: string }>(tabId, {
      type: 'query_selector_all',
      selector: data?.selector as string,
      id: generateId(),
    });
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

onMessage('get_form_values', async ({ data }) => {
  const tabId = (data?.tabId as number | undefined) ?? (await chrome.tabs.query({ active: true, currentWindow: true }).then((tabs: chrome.tabs.Tab[]) => tabs[0]))?.id;

  if (!tabId) {
    return { success: false, error: 'No active tab' };
  }

  try {
    const result = await sendToContentScript<{ success: boolean; values?: Record<string, unknown>; error?: string }>(tabId, {
      type: 'get_form_values',
      selector: data?.selector as string | undefined,
      id: generateId(),
    });
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

onMessage('ping', async ({ data }) => {
  const tabId = data as number;
  try {
    await sendToContentScript<unknown>(tabId, { type: 'ping', id: generateId() }, 5000);
    return true;
  } catch {
    return false;
  }
});

export default defineBackground(() => {
  console.log('Claude in Chrome background script initialized', { id: browser.runtime.id });
  // Initialize the WebSocket bridge connection
  connectToBridge();
});

