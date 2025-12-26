import { onMessage } from './protocol';
import { Interactions } from '../../src/content/interactions';
import { WaitFor } from '../../src/content/wait-for';
import { PageInfo } from '../../src/content/page-info';

// Register all content script handlers

// Interaction handlers
onMessage('click', async ({ data }) => {
  return await Interactions.click(data.selector, data.options || {});
});

onMessage('click_at', async ({ data }) => {
  return await Interactions.clickAt(data.x, data.y, data.options || {});
});

onMessage('fill', async ({ data }) => {
  return await Interactions.fill(data.selector, data.value, data.options || {});
});

onMessage('type', async ({ data }) => {
  return await Interactions.type(data.selector, data.text, data.options || {});
});

onMessage('press_key', async ({ data }) => {
  return await Interactions.pressKey(data.key, data.options || {});
});

onMessage('hover', async ({ data }) => {
  return await Interactions.hover(data.selector, data.options || {});
});

onMessage('select_option', async ({ data }) => {
  return await Interactions.selectOption(data.selector, data.value);
});

// Content handlers
onMessage('get_page_content', async ({ data }) => {
  const content = data.selector ? PageInfo.getPageContent(data.selector) : PageInfo.getPageContent();
  return { success: true, content };
});

onMessage('query_selector', async ({ data }) => {
  const result = await WaitFor.element(data.selector);
  const element = Array.isArray(result) ? result[0] : result;
  return { success: true, element: PageInfo.getElementInfo(element) };
});

onMessage('query_selector_all', async ({ data }) => {
  const result = await WaitFor.element(data.selector, { all: true });
  const elements = Array.isArray(result) ? result : [result];
  return { success: true, elements: elements.map(el => PageInfo.getElementInfo(el)) };
});

onMessage('get_form_values', async ({ data }) => {
  return { success: true, values: PageInfo.getFormValues(data.selector) };
});

onMessage('get_text', async ({ data }) => {
  return await Interactions.getText(data.selector);
});

onMessage('get_attribute', async ({ data }) => {
  return await Interactions.getAttribute(data.selector, data.attribute);
});

// Waiting handlers
onMessage('wait_for', async ({ data }) => {
  await WaitFor.element(data.selector, data.options);
  return { success: true };
});

onMessage('wait_for_visible', async ({ data }) => {
  await WaitFor.visible(data.selector, data.options);
  return { success: true };
});

onMessage('wait_for_text', async ({ data }) => {
  await WaitFor.textContent(data.selector, data.text, data.options);
  return { success: true };
});

// Health check
onMessage('ping', async () => {
  return { pong: true };
});
