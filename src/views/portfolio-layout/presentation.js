// Display settings only: calculations and stored project values keep full precision.
import { displayValue, numericValue } from './aggregation';

export const FORMAT_DEFAULTS = { mode: 'auto', decimals: null, currency: 'USD', percentScale: 'whole' };
export const ORIGINAL_PALETTE = ['#1f5fa8', '#28a745', '#ffd600', '#d93025', '#17a2b8', '#6c757d', '#6f42c1', '#fd7e14'];
export const DEFAULT_PALETTE = ['#05204a', '#007fa3', '#3b9b71', '#e1a62a', '#8060b4', '#cc6565', '#5c8cb5', '#78864b', '#b35b92', '#75959b'];
export const PALETTES = [
  { value: 'original', label: 'Original colours', colors: ORIGINAL_PALETTE },
  { value: 'ocean', label: 'Ocean', colors: ['#075985', '#0284c7', '#0e7490', '#38bdf8', '#14b8a6', '#1d4ed8', '#7dd3fc', '#155e75'] },
  { value: 'forest', label: 'Forest', colors: ['#166534', '#16a34a', '#65a30d', '#84cc16', '#0f766e', '#34d399', '#4d7c0f', '#a3e635'] },
  { value: 'warm', label: 'Warm', colors: ['#b91c1c', '#ea580c', '#d97706', '#eab308', '#be123c', '#fb923c', '#f43f5e', '#a16207'] },
  { value: 'purple', label: 'Purple', colors: ['#6d28d9', '#9333ea', '#c026d3', '#a855f7', '#4338ca', '#db2777', '#7c3aed', '#e879f9'] }
];
export const CARD_LABELS = ['Overall', 'G1', 'G2', 'G3', 'Operationalised'];
export const KPI_LABELS = ['Capacity Gain ($)', 'DL Value ($)', 'IDL Value ($)', 'Yield Value ($)', 'Quality Value ($)'];

export function formatSettings(widget) {
  // Reading every field while constructing chart options makes decimal,
  // currency and percentage-scale changes reactive, before callbacks run.
  return { ...FORMAT_DEFAULTS, ...widget.format };
}
export function customFormat(widget) { return Boolean(widget.format && widget.format.mode !== 'auto'); }
export function formatValue(value, unit, settings, automatic = null) {
  const config = { ...FORMAT_DEFAULTS, ...settings };
  if (config.mode === 'auto') return automatic ? automatic(value) : displayValue(value, unit);
  let number = numericValue(value);
  if (['millions', 'currencyMillions'].includes(config.mode)) number /= 1000000;
  if (config.mode === 'percent' && config.percentScale === 'fraction') number *= 100;
  const decimals = config.decimals === null ? 2 : config.decimals;
  const options = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  if (['currency', 'currencyMillions'].includes(config.mode)) Object.assign(options, { style: 'currency', currency: config.currency });
  const formatted = number.toLocaleString('en-US', options);
  return formatted + (['millions', 'currencyMillions'].includes(config.mode) ? 'M' : config.mode === 'percent' ? '%' : '');
}
export function originalColors(widget) {
  if (widget.chartType === 'combo') return ['#05204a', '#037d50'];
  if (widget.kind === 'builtin') {
    if (['cumulative_trend', 'annual_trend'].includes(widget.builtin)) return ['#05204a', '#037d50'];
    if (widget.builtin === 'executive_cards') return ['#1E3A8A', '#0A2D55', '#4A235A', '#312E81', '#065F46'];
    return ORIGINAL_PALETTE;
  }
  return ['dtitInvolved', 'foakNoak', 'pillars'].includes(widget.groupBy) ? ORIGINAL_PALETTE : DEFAULT_PALETTE;
}
export function paletteColors(widget, fallback = originalColors(widget)) {
  return !widget.appearance || widget.appearance.palette === 'original' ? fallback
    : PALETTES.find(p => p.value === widget.appearance.palette)?.colors || fallback;
}
export function categoryColor(widget, label, index, fallback) {
  const overrides = widget.appearance?.categoryColors;
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, label)) return overrides[label];
  const colors = paletteColors(widget, fallback);
  return colors[index % colors.length];
}
export function chartColors(widget, labels, fallback = originalColors(widget)) {
  // Preserve the exact original options when no styling has been saved.
  return widget.appearance ? labels.map((label, i) => categoryColor(widget, label, i, fallback)) : fallback;
}
export function primaryColor(widget) { return widget.appearance?.primaryColor || paletteColors(widget)[0]; }
export function contrastColor(hex) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.179 ? '#111827' : '#ffffff';
}
