/**
 * Reliable Document Printing Utility
 * 
 * Safely triggers document printing across standard windows and sandboxed iframes.
 * Also provides downloadPrintableDocument as a 100% reliable fallback when browser
 * security restricts iframe window.print() modal dialogs.
 */

export function printIsolatedDocument(elementId: string, documentTitle: string = 'Document'): boolean {
  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    console.warn(`Print element #${elementId} not found, falling back to window.print()`);
    try {
      window.print();
      return true;
    } catch (e) {
      console.warn('Direct window.print() fallback failed:', e);
      return false;
    }
  }

  // Extract all existing style and link[rel="stylesheet"] tags from host document
  let stylesHtml = '';
  try {
    const headElements = document.head.querySelectorAll('style, link[rel="stylesheet"]');
    headElements.forEach((el) => {
      stylesHtml += el.outerHTML + '\n';
    });
  } catch (err) {
    console.warn('Could not extract head styles:', err);
  }

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
      .bg-slate-950, .bg-slate-900, .bg-slate-800, .bg-black {
        background-color: #f1f5f9 !important;
        color: #000000 !important;
        border: 1.5px solid #000000 !important;
      }
    </style>
  `;

  let iframeSuccess = false;

  // Attempt isolated iframe printing
  try {
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
    if (doc && iframe.contentWindow) {
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
              ${sourceElement.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          if (iframe?.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            iframeSuccess = true;
          }
        } catch (e) {
          console.warn('Iframe print error caught:', e);
        }
      }, 100);
    }
  } catch (err) {
    console.warn('Could not construct print iframe:', err);
  }

  // Also invoke direct window.print() safely
  try {
    window.print();
    return true;
  } catch (err) {
    console.warn('Direct window.print() restricted by sandbox:', err);
    return iframeSuccess;
  }
}

/**
 * Downloads a pristine standalone HTML file containing the printable document.
 * Opening this file in any browser tab auto-triggers the system print dialog immediately.
 */
export function downloadPrintableDocument(
  elementId: string, 
  filename: string, 
  documentTitle: string = 'Document'
): boolean {
  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    console.warn(`Element #${elementId} not found for download`);
    return false;
  }

  let stylesHtml = '';
  try {
    const headElements = document.head.querySelectorAll('style, link[rel="stylesheet"]');
    headElements.forEach((el) => {
      stylesHtml += el.outerHTML + '\n';
    });
  } catch (err) {
    console.warn('Could not extract head styles for download:', err);
  }

  const cleanDocHtml = sourceElement.innerHTML;

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle}</title>
  ${stylesHtml}
  <style>
    @page {
      size: letter portrait;
      margin: 0.4in;
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
    }
    .print-wrapper {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.2in;
      background: #ffffff;
      color: #000000;
    }
    .no-print, .print\\:hidden {
      display: none !important;
    }
    @media print {
      .screen-print-banner {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="screen-print-banner no-print" style="background:#0f172a;color:#f8fafc;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:bold;font-family:sans-serif;border-bottom:2px solid #2563eb;margin-bottom:15px;">
    <div>📄 <strong>${documentTitle}</strong> — Official Dealership Document</div>
    <button onclick="window.print()" style="background:#2563eb;color:#ffffff;border:none;padding:8px 18px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:12px;box-shadow:0 1px 2px rgba(0,0,0,0.2);">🖨️ Click to Print (Ctrl+P)</button>
  </div>
  <div class="print-wrapper font-sans text-xs space-y-4">
    ${cleanDocHtml}
  </div>
  <script>
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 250);
    });
  </script>
</body>
</html>`;

  try {
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.toLowerCase().endsWith('.html') ? filename : `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (err) {
    console.error('Failed to download document:', err);
    return false;
  }
}
