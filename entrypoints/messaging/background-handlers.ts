import { onMessage } from './protocol';
import { browser } from 'wxt/browser';

// Register handlers that run in background context

onMessage('navigate', async ({ data }) => {
  try {
    if (data.tabId) {
      await browser.tabs.update(data.tabId, { url: data.url });
      await browser.tabs.update(data.tabId, { active: true });
    } else {
      await browser.tabs.create({ url: data.url });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

onMessage('reload', async ({ data }) => {
  try {
    if (data.tabId) {
      await browser.tabs.reload(data.tabId);
    } else {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await browser.tabs.reload(tabs[0].id);
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

onMessage('list_tabs', async ({ data }) => {
  try {
    const query = data.activeOnly ? { active: true } : {};
    const tabs = await browser.tabs.query(query);
    return tabs.map((tab) => ({
      id: tab.id!,
      url: tab.url || '',
      title: tab.title || '',
      active: tab.active,
    }));
  } catch (error) {
    return [];
  }
});

onMessage('activate_tab', async ({ data }) => {
  try {
    await browser.tabs.update(data.tabId, { active: true });
    const tab = await browser.tabs.get(data.tabId);
    if (tab.windowId) {
      await browser.windows.update(tab.windowId, { focused: true });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

onMessage('get_current_tab', async () => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab) return null;
    return {
      id: tab.id!,
      url: tab.url,
      title: tab.title,
    };
  } catch (error) {
    return null;
  }
});

onMessage('screenshot', async ({ data }) => {
  try {
    let tab;
    if (data.tabId !== undefined) {
      tab = await browser.tabs.get(data.tabId);
    } else {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      tab = tabs[0];
    }

    if (!tab?.windowId) {
      return { success: false, error: 'No active tab or window found' };
    }

    const window = await browser.windows.get(tab.windowId);
    const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
      format: data.format || 'png',
      quality: data.quality || 90,
    });

    return {
      success: true,
      screenshot: {
        dataUrl,
        width: window.width || 0,
        height: window.height || 0,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});
