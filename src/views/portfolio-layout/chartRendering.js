// ApexCharts mutates its configuration. Detach reactive objects without
// serialising them: JSON cloning would remove formatter functions.
export function copyChartValue(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Date) return new Date(value.getTime());
  const result = Array.isArray(value) ? [] : {};
  seen.set(value, result);
  for (const key of Object.keys(value)) {
    Object.defineProperty(result, key, { value: copyChartValue(value[key], seen),
      writable: true, enumerable: true, configurable: true });
  }
  return result;
}
