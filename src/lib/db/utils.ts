/**
 * Utility functions for database queries.
 * These helpers are used across multiple query files to normalize data and handle errors.
 */

/**
 * Normalizes a string value, converting null or undefined to an empty string.
 * 
 * @param value - The string value to normalize (can be string, null, or undefined)
 * @returns A non-null string (empty string if input was null/undefined)
 */
export function normalizeString(value: string | null | undefined): string {
  return value ?? '';
}

/**
 * Normalizes an array value, converting null or undefined to an empty array.
 * 
 * @param value - The array value to normalize (can be array, null, or undefined)
 * @returns A non-null array (empty array if input was null/undefined)
 */
export function normalizeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Ensures a value is defined, throwing an error if it's undefined.
 * Useful for asserting that database query results are not undefined.
 * 
 * @param value - The value to check (can be T or undefined)
 * @param errorMessage - The error message to throw if value is undefined
 * @returns The value if it's defined
 * @throws Error if value is undefined
 */
export function firstOrError<T>(value: T | undefined, errorMessage: string): T {
  if (value === undefined) {
    throw new Error(errorMessage);
  }
  return value;
}

