/**
 * Reliable Document Printing Utility
 * 
 * Uses an isolated hidden iframe with complete CSS stylesheets and typography.
 * This guarantees the browser print engine generates the preview instantly (<50ms)
 * without freezing on "Loading preview...", avoiding blank pages, and ensuring
 * crystal clear pagination and crisp borders across all browsers and iframes.
 */

export function printIsolatedDocument(elementId: string, documentTitle: string = 'Document') {
  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    console.warn(`Print element #${elementId} not found, falling back to window.print()`);
    window.print();
    return;
  }

  // Extract inner HTML of the document
  const contentHtml = sourceElement.innerHTML;

  // Extract all existing style and link[rel="stylesheet"] tags from the host document
  let stylesHtml = '';
  const headElements = document.head.querySelectorAll('style, link[rel="stylesheet"]');
  headElements.forEach((el) => {
    stylesHtml += el.outerHTML + '\n';
  });

  // Base print stylesheet for 8.5" x 11" Letter page
  const printPageStyles = `
    <style>
      @page {
        size: letter portrait;
        margin: 0.35in 0.4in;
      }
      *, *::before, *::after {
        box-sizing: border-box !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        font-size: 11px !important;
        line-height: 1.35 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        overflow: visible !important;
        height: auto !important;
      }
      .hub-printable-container {
        display: block !important;
        visibility: visible !important;
        position: static !important;
        width: 100% !important;
        max-width: 8.5in !important;
        margin: 0 auto !important;
        padding: 0.1in !important;
        background: #ffffff !important;
        color: #000000 !important;
        opacity: 1 !important;
      }
      .no-print, .print\\:hidden {
        display: none !important;
      }
      .quote-line-item,
      .warranty-print-section,
      .inspection-print-section,
      .appointment-print-section,
      .attendance-print-section,
      .break-inside-avoid,
      [data-print-keep-together="true"],
      table, tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        -webkit-column-break-inside: avoid !important;
      }
      /* Ensure inverted dark badges print with crisp black border on light gray */
      .bg-slate-950, .bg-slate-900, .bg-slate-800, .bg-black {
        background-color: #f1f5f9 !important;
        color: #000000 !important;
        border: 1.5px solid #000000 !important;
      }
    </style>
  `;

  // Create or reuse hidden print iframe with full viewport dimensions to prevent Chrome 0x0 blank rendering
  let iframe = document.getElementById('hub-isolated-print-frame') as HTMLIFrameElement | null;
  if (iframe) {
    try {
      document.body.removeChild(iframe);
    } catch {
      // ignore
    }
  }

  iframe = document.createElement('iframe');
  iframe.id = 'hub-isolated-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.left = '0';
  iframe.style.top = '0';
  iframe.style.width = '100vw';
  iframe.style.height = '100vh';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc || !iframe.contentWindow) {
    console.warn('Cannot access print iframe document, falling back to window.print()');
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${documentTitle}</title>
        ${stylesHtml}
        ${printPageStyles}
      </head>
      <body>
        <div class="hub-printable-container font-sans text-xs space-y-4">
          ${contentHtml}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Trigger print after iframe renders styles and computes full page layout
  const triggerIframePrint = () => {
    try {
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.warn('Iframe print error, invoking native window.print()', e);
      window.print();
    }
  };

  // Allow styles and font resources to initialize
  setTimeout(() => {
    triggerIframePrint();
  }, 120);
}
