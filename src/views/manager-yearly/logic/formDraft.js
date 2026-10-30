// The form edits its own copy. Submit emits a snapshot to the page controller.
export function cloneForm(form = {}) {
  return {
    ...form,
    sitesArray: [...(form.sitesArray || [])],
    customFields: { ...(form.customFields || {}) }
  };
}
