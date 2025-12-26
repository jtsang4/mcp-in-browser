/**
 * Runtime Input Validation using Zod-like schemas
 */

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export class Schema<T = unknown> {
  constructor(
    private validateFn: (value: unknown) => ValidationResult<T>
  ) {}

  validate(value: unknown): ValidationResult<T> {
    return this.validateFn(value);
  }

  parse(value: unknown): T {
    const result = this.validate(value);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data!;
  }

  static string(options?: { min?: number; max?: number; pattern?: RegExp }) {
    return new Schema<string>((value) => {
      if (typeof value !== 'string') {
        return { success: false, error: 'Expected string' };
      }
      if (options?.min !== undefined && value.length < options.min) {
        return { success: false, error: `String must be at least ${options.min} characters` };
      }
      if (options?.max !== undefined && value.length > options.max) {
        return { success: false, error: `String must be at most ${options.max} characters` };
      }
      if (options?.pattern && !options.pattern.test(value)) {
        return { success: false, error: 'String does not match required pattern' };
      }
      return { success: true, data: value };
    });
  }

  static number(options?: { min?: number; max?: number; integer?: boolean }) {
    return new Schema<number>((value) => {
      if (typeof value !== 'number') {
        return { success: false, error: 'Expected number' };
      }
      if (options?.integer && !Number.isInteger(value)) {
        return { success: false, error: 'Expected integer' };
      }
      if (options?.min !== undefined && value < options.min) {
        return { success: false, error: `Number must be at least ${options.min}` };
      }
      if (options?.max !== undefined && value > options.max) {
        return { success: false, error: `Number must be at most ${options.max}` };
      }
      return { success: true, data: value };
    });
  }

  static boolean() {
    return new Schema<boolean>((value) => {
      if (typeof value !== 'boolean') {
        return { success: false, error: 'Expected boolean' };
      }
      return { success: true, data: value };
    });
  }

  static literal<T extends string | number | boolean>(literalValues: readonly T[]) {
    return new Schema<T>((value) => {
      if (!literalValues.includes(value as T)) {
        return { success: false, error: `Expected one of: ${literalValues.join(', ')}` };
      }
      return { success: true, data: value as T };
    });
  }

  static optional<T>(schema: Schema<T>) {
    return new Schema<T | undefined>((value) => {
      if (value === undefined || value === null) {
        return { success: true, data: undefined };
      }
      return schema.validate(value);
    });
  }

  static object<T extends Record<string, Schema<unknown>>>(shape: T) {
    return new Schema<{ [K in keyof T]?: T[K] extends Schema<infer V> ? V : never }>((value) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { success: false, error: 'Expected object' };
      }

      const result: Record<string, unknown> = {};
      for (const [key, schema] of Object.entries(shape)) {
        const fieldResult = schema.validate((value as Record<string, unknown>)[key]);
        if (!fieldResult.success) {
          return { success: false, error: `Field "${key}": ${fieldResult.error}` };
        }
        if (fieldResult.data !== undefined) {
          result[key] = fieldResult.data;
        }
      }

      return { success: true, data: result as { [K in keyof T]?: T[K] extends Schema<infer V> ? V : never } };
    });
  }

  static array<T>(itemSchema: Schema<T>) {
    return new Schema<T[]>((value) => {
      if (!Array.isArray(value)) {
        return { success: false, error: 'Expected array' };
      }

      const result: T[] = [];
      for (let i = 0; i < value.length; i++) {
        const itemResult = itemSchema.validate(value[i]);
        if (!itemResult.success) {
          return { success: false, error: `Array index ${i}: ${itemResult.error}` };
        }
        result.push(itemResult.data!);
      }

      return { success: true, data: result };
    });
  }
}

// Tool input schemas
export const Schemas = {
  navigate: Schema.object({
    url: Schema.string({ min: 1 }),
    tabId: Schema.optional(Schema.number({ integer: true, min: 0 })),
  }),

  click: Schema.object({
    selector: Schema.string({ min: 1 }),
    tabId: Schema.optional(Schema.number({ integer: true, min: 0 })),
  }),

  clickAt: Schema.object({
    x: Schema.number({ min: 0 }),
    y: Schema.number({ min: 0 }),
    tabId: Schema.optional(Schema.number({ integer: true, min: 0 })),
  }),

  fill: Schema.object({
    selector: Schema.string({ min: 1 }),
    value: Schema.string(),
    tabId: Schema.optional(Schema.number({ integer: true, min: 0 })),
  }),

  getPageContent: Schema.object({
    selector: Schema.optional(Schema.string({ min: 1 })),
    tabId: Schema.optional(Schema.number({ integer: true, min: 0 })),
  }),

  screenshot: Schema.object({
    tabId: Schema.optional(Schema.number({ integer: true, min: 0 })),
    format: Schema.optional(Schema.literal(['png', 'jpeg'] as const)),
    quality: Schema.optional(Schema.number({ min: 0, max: 100 })),
  }),

  listTabs: Schema.object({
    activeOnly: Schema.optional(Schema.boolean()),
  }),

  activateTab: Schema.object({
    tabId: Schema.number({ integer: true, min: 0 }),
  }),

  reload: Schema.object({
    tabId: Schema.optional(Schema.number({ integer: true, min: 0 })),
  }),

  querySelector: Schema.object({
    selector: Schema.string({ min: 1 }),
    tabId: Schema.optional(Schema.number({ integer: true, min: 0 })),
  }),

  querySelectorAll: Schema.object({
    selector: Schema.string({ min: 1 }),
    tabId: Schema.optional(Schema.number({ integer: true, min: 0 })),
  }),

  getFormValues: Schema.object({
    selector: Schema.optional(Schema.string({ min: 1 })),
    tabId: Schema.optional(Schema.number({ integer: true, min: 0 })),
  }),
} as const;
