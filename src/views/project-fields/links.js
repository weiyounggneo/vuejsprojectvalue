export function projectUrl(value) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if ([...text].length > 2048 || !/^https?:\/\//i.test(text) || /[\s\\]/u.test(text)) return '';
  if ([...text].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return '';
  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
