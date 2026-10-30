export const FORM_SECTIONS = [
  { value: 'details', label: '1. Project Details' },
  { value: 'values', label: '2. Yearly Data' },
  { value: 'kpis', label: '3. Key Performance Indicators' },
  { value: 'milestones', label: '4. Timeline Milestones' }
];

export function fieldSection(field) {
  // Existing numeric fields retain their placement until an admin moves them.
  return field.formSection ?? (field.type === 'number' ? 'values' : 'details');
}

export function sectionLabel(section) {
  return FORM_SECTIONS.find(item => item.value === section)?.label || section;
}
