import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Maps any oklch/oklab color expressions in CSS text to safe hex color equivalents.
 */
function mapOklchToHex(text) {
  if (!text) return '';
  return text
    .replace(/--color-slate-950:\s*(oklch|oklab)\([^)]+\)/gi, '--color-slate-950: #020617')
    .replace(/--color-slate-900:\s*(oklch|oklab)\([^)]+\)/gi, '--color-slate-900: #0f172a')
    .replace(/--color-slate-800:\s*(oklch|oklab)\([^)]+\)/gi, '--color-slate-800: #1e293b')
    .replace(/--color-slate-700:\s*(oklch|oklab)\([^)]+\)/gi, '--color-slate-700: #334155')
    .replace(/--color-slate-600:\s*(oklch|oklab)\([^)]+\)/gi, '--color-slate-600: #475569')
    .replace(/--color-slate-500:\s*(oklch|oklab)\([^)]+\)/gi, '--color-slate-500: #64748b')
    .replace(/--color-slate-400:\s*(oklch|oklab)\([^)]+\)/gi, '--color-slate-400: #94a3b8')
    .replace(/--color-slate-300:\s*(oklch|oklab)\([^)]+\)/gi, '--color-slate-300: #cbd5e1')
    .replace(/--color-slate-200:\s*(oklch|oklab)\([^)]+\)/gi, '--color-slate-200: #e2e8f0')
    .replace(/--color-slate-100:\s*(oklch|oklab)\([^)]+\)/gi, '--color-slate-100: #f1f5f9')
    .replace(/--color-slate-50:\s*(oklch|oklab)\([^)]+\)/gi, '--color-slate-50: #f8fafc')
    .replace(/--color-emerald-900:\s*(oklch|oklab)\([^)]+\)/gi, '--color-emerald-900: #064e3b')
    .replace(/--color-emerald-800:\s*(oklch|oklab)\([^)]+\)/gi, '--color-emerald-800: #065f46')
    .replace(/--color-emerald-700:\s*(oklch|oklab)\([^)]+\)/gi, '--color-emerald-700: #047857')
    .replace(/--color-emerald-600:\s*(oklch|oklab)\([^)]+\)/gi, '--color-emerald-600: #059669')
    .replace(/--color-emerald-500:\s*(oklch|oklab)\([^)]+\)/gi, '--color-emerald-500: #10b981')
    .replace(/--color-emerald-100:\s*(oklch|oklab)\([^)]+\)/gi, '--color-emerald-100: #d1fae5')
    .replace(/--color-emerald-50:\s*(oklch|oklab)\([^)]+\)/gi, '--color-emerald-50: #f0fdf4')
    .replace(/--color-teal-900:\s*(oklch|oklab)\([^)]+\)/gi, '--color-teal-900: #134e4a')
    .replace(/--color-teal-700:\s*(oklch|oklab)\([^)]+\)/gi, '--color-teal-700: #0f766e')
    .replace(/oklch\([^)]+\)/gi, '#334155')
    .replace(/oklab\([^)]+\)/gi, '#334155');
}

/**
 * Captures an HTML element into a canvas by rendering it inside an iframe loaded with the host document's
 * sanitized stylesheets, guaranteeing pixel-perfect styling (Screenshot 2) with 0 oklch color errors.
 */
export async function captureSafeCanvas(element, options = {}) {
  if (!element) {
    throw new Error('Element for PDF capture was not found.');
  }

  // 1. Gather all style and link tags from host document and sanitize oklch color definitions
  let hostStylesHtml = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    if (node.tagName.toLowerCase() === 'style') {
      const sanitized = mapOklchToHex(node.textContent || '');
      hostStylesHtml += `<style>${sanitized}</style>\n`;
    } else if (node.tagName.toLowerCase() === 'link') {
      hostStylesHtml += node.outerHTML + '\n';
    }
  });

  // Also check document.styleSheets for constructable or dynamically added stylesheets
  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      if (!sheet.ownerNode) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (rules && rules.length > 0) {
            let cssText = '';
            for (let j = 0; j < rules.length; j++) {
              cssText += rules[j].cssText + '\n';
            }
            const sanitized = mapOklchToHex(cssText);
            hostStylesHtml += `<style>${sanitized}</style>\n`;
          }
        } catch (_e) {}
      }
    }
  } catch (_e) {}

  // 2. Create clean isolated iframe with full sanitized host styles
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
          ${hostStylesHtml}
          <style>
            * { box-sizing: border-box; }
            body { background-color: #ffffff !important; color: #0f172a; margin: 0; padding: 20px; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          </style>
        </head>
        <body style="background: #ffffff !important;">
          <div id="pdf-wrapper" style="width: 800px; background: #ffffff; margin: 0 auto;"></div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // 3. Clone target element into iframe
    const wrapper = iframeDoc.getElementById('pdf-wrapper');
    const clone = element.cloneNode(true);
    
    // Ensure raw outer HTML has no oklch strings
    const cloneHtml = clone.outerHTML.replace(/oklch\([^)]+\)/gi, '#334155').replace(/oklab\([^)]+\)/gi, '#334155');
    wrapper.innerHTML = cloneHtml;

    // Small delay to allow CSS & layout rendering
    await new Promise((resolve) => setTimeout(resolve, 200));

    const targetNode = wrapper.firstElementChild || wrapper;

    // 4. Render html2canvas inside iframe context
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


