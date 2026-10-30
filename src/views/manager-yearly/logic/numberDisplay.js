// Format custom DECIMAL values for display without rounding their source data.
export function wholeNumberDisplay(value) {
  const text = String(value).trim();
  const match = /^(-?)(\d{1,14})(?:\.(\d{1,4}))?$/.exec(text);
  if (!match) return String(value);
  // The integer part fits safely in Number; converting the entire decimal
  // first could turn .4999 into .5 near the database's precision limit.
  let integer = Number(match[2]);
  if (match[3] && match[3][0] >= '5') integer += 1;
  const sign = match[1] && integer !== 0 ? '-' : '';
  return sign + integer.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
