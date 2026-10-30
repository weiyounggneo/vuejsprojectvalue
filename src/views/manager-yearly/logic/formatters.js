// Formatters logic for ManagerYearlyTracking. Functions run on the page instance.
export const methods = {
  formatCurrency(value) {
      if (value === null || value === undefined || value === '') return '';
      return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    },

  formatPercent(value) {
      if (value === null || value === undefined || value === '') return '';
      return `${value}%`;
    },

  formatMillions(value) {
      if (!value) return '$0.00M';
      return '$' + (Number(value) / 1000000).toFixed(2) + 'M';
    },

  formatDate(val) {
      if (!val) return '-';
      
      const dateObj = new Date(val);
      // Fallback if the date is invalid
      if (isNaN(dateObj.getTime())) return String(val).slice(0, 10); 
      
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yyyy = dateObj.getFullYear();
      
      return `${mm}-${yyyy}`;
    },

  getRagClass(actual, target) {
      if (!actual || !target) return 'pending-cell';
      const actualDate = new Date(actual);
      const targetDate = new Date(target);
      return actualDate > targetDate ? 'rag-red' : 'rag-green';
    }
};
