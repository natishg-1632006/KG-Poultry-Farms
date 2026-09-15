import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures an HTML element safely into a canvas by rendering it inside an isolated iframe,
 * completely preventing html2canvas from failing on Tailwind v4's oklch/oklab host CSS styles.
 */
export async function captureSafeCanvas(element, options = {}) {
  if (!element) {
    throw new Error('Element for PDF capture was not found.');
  }

  // 1. Create a clean, isolated hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '850px';
  iframe.style.height = '1200px';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background-color: #ffffff; color: #0f172a; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 6px 10px; }
          </style>
        </head>
        <body style="background: #ffffff;">
          <div id="pdf-wrapper" style="width: 800px; background: #ffffff; padding: 10px;"></div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // 2. Clone target element into iframe
    const wrapper = iframeDoc.getElementById('pdf-wrapper');
    const clone = element.cloneNode(true);
    
    // Ensure inline styles don't carry any raw oklch string
    const cloneHtml = clone.outerHTML.replace(/oklch\([^)]+\)/gi, '#334155').replace(/oklab\([^)]+\)/gi, '#334155');
    wrapper.innerHTML = cloneHtml;

    // Small delay to allow fonts & layout rendering
    await new Promise((resolve) => setTimeout(resolve, 150));

    const targetNode = wrapper.firstElementChild || wrapper;

    // 3. Render html2canvas inside clean iframe environment
    const canvas = await html2canvas(targetNode, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 850,
      ...options
    });

    return canvas;
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

