// Core JSON-compatible value type
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Basic JSON Schema type
export type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: (string | number)[];
  description?: string;
  [key: string]: unknown;
};

// Core types only - no barrel exports
