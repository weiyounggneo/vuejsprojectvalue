// Formatters logic for AdminDashboard. Functions run on the page instance.
export const methods = {
  formatDate(val) {
    if (!val) return '-';
    const date = new Date(val);
    return isNaN(date.getTime()) ? val : date.toLocaleString();
  },

  formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '';
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  },

  formatCategoryName(cat) {
    if (!cat) return '';
    return cat.replace(/_/g, ' ');
  }
};
