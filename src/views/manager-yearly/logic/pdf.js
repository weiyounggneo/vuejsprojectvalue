// Pdf logic for ManagerYearlyTracking. Functions run on the page instance.
import html2pdf from 'html2pdf.js';

export const methods = {
  async exportToPDF() {
      if (this.activeTab !== 'analytics' && this.activeTab !== 'timeline') {
        alert('Please switch to the Portfolio Overview or Project Timeline tab to export the dashboard.');
        return;
      }

      this.isProcessing = true;
      this.processingMessage = 'Generating single-page PDF... This may take a few seconds.';

      try {
        const element = document.querySelector('.analytics-section');
        const dashboardWidth = element.scrollWidth;
        const dashboardHeight = element.scrollHeight;
        
        const opt = {
          margin:       0,
          filename:     this.activeTab === 'analytics' ? 'Portfolio_Overview_Dashboard.pdf' : 'Project_Timeline_Dashboard.pdf',
          image:        { type: 'jpeg', quality: 1 },
          html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#f4f6f9',
            windowWidth: dashboardWidth,
            width: dashboardWidth,
            height: dashboardHeight
          },
          jsPDF: { 
            unit: 'px', 
            format: [dashboardWidth, dashboardHeight], 
            orientation: dashboardWidth > dashboardHeight ? 'landscape' : 'portrait' 
          } 
        };

        await html2pdf().set(opt).from(element).save();
      } catch (err) {
        alert('Error generating PDF: ' + err.message);
      } finally {
        this.isProcessing = false;
        this.processingMessage = '';
      }
    }
};
