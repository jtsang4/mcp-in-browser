/**
 * ID Generator for Requests and Tracing
 */

let sequence = 0;
const TIMESTAMP_BITS = 41;
const RANDOM_BITS = 23;

export function generateId(prefix = 'req'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * Math.pow(2, RANDOM_BITS));

  // Combine timestamp and random for uniqueness across tabs
  const id = BigInt(timestamp) << BigInt(RANDOM_BITS) | BigInt(random);

  return `${prefix}-${id.toString(36)}`;
}

export function parseId(id: string): { prefix?: string; value: string } {
  const parts = id.split('-');
  if (parts.length === 2) {
    return { prefix: parts[0], value: parts[1] };
  }
  return { value: id };
}
