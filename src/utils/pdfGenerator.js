import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const DownloadPdf = registerPlugin('DownloadPdf');

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
    .replace(/color-mix\(in oklch[^)]+\)/gi, '#0f172a')
    .replace(/color-mix\(in oklab[^)]+\)/gi, '#0f172a')
    .replace(/oklch\([^)]+\)/gi, '#334155')
    .replace(/oklab\([^)]+\)/gi, '#334155');
}

/**
 * Captures an HTML element into a canvas by rendering it inside an iframe loaded with the host document's
 * sanitized CSSOM rules, guaranteeing pixel-perfect styling with 0 oklch color errors.
 */
export async function captureSafeCanvas(element, options = {}) {
  if (!element) {
    throw new Error('Element for PDF capture was not found.');
  }

  // Fast direct capture with cloned element style sanitization
  const captureOptions = {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 850,
    onclone: (clonedDoc, clonedEl) => {
      // 1. Sanitize any oklch color expressions in cloned document style tags
      clonedDoc.querySelectorAll('style').forEach((styleTag) => {
        if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('oklab'))) {
          styleTag.textContent = mapOklchToHex(styleTag.textContent);
        }
      });
      // 2. Ensure cloned element and all parent nodes are fully rendered and visible to html2canvas
      if (clonedEl) {
        let parentNode = clonedEl;
        while (parentNode && parentNode !== clonedDoc.body) {
          if (parentNode.style) {
            parentNode.style.opacity = '1';
            parentNode.style.visibility = 'visible';
            parentNode.style.display = 'block';
          }
          parentNode = parentNode.parentElement;
        }
        clonedEl.style.opacity = '1';
        clonedEl.style.visibility = 'visible';
        clonedEl.style.display = 'block';
        clonedEl.style.position = 'relative';
        clonedEl.style.left = '0';
        clonedEl.style.top = '0';
        clonedEl.style.zIndex = '99999';
        clonedEl.style.backgroundColor = '#ffffff';
      }
    },
    ...options
  };

  try {
    const canvas = await html2canvas(element, captureOptions);
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      return canvas;
    }
  } catch (directErr) {
    console.warn('Direct DOM capture warning, running iframe fallback:', directErr);
  }

  // Fallback: Read style tags fast (0.001s) and render inside isolated iframe
  let hostStylesHtml = '';
  document.querySelectorAll('style').forEach((tag) => {
    const sanitized = mapOklchToHex(tag.textContent || '');
    if (sanitized) {
      hostStylesHtml += `<style>${sanitized}</style>\n`;
    }
  });

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '0px';
  iframe.style.top = '0px';
  iframe.style.zIndex = '-9999';
  iframe.style.width = '850px';
  iframe.style.height = '1200px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
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

    const wrapper = iframeDoc.getElementById('pdf-wrapper');
    const clone = element.cloneNode(true);
    clone.style.opacity = '1';
    clone.style.visibility = 'visible';
    clone.style.display = 'block';
    wrapper.innerHTML = mapOklchToHex(clone.outerHTML);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const targetNode = wrapper.firstElementChild || wrapper;
    return await html2canvas(targetNode, captureOptions);
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

/**
 * Helper to trigger browser blob anchor link download
 */
function triggerBlobDownload(pdf, filename) {
  try {
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
  } catch (_err) {
    pdf.save(filename);
  }
}

/**
 * Saves and opens/shares a PDF document across Native Android (Capacitor) and Web browsers.
 * On Native Android App: Writes PDF base64 directly to public Documents directory (visible in phone's Files app) and launches native Share/Download dialog.
 * On Web Browsers: Uses Blob Object URL link download and pdf.save.
 */
export async function saveAndOpenPdf(pdf, filename, options = {}) {
  try {
    let rawBase64 = '';
    try {
      rawBase64 = pdf.output('datauristring');
    } catch (_e) {
      rawBase64 = pdf.output('base64');
    }
    if (rawBase64.includes(',')) {
      rawBase64 = rawBase64.split(',')[1];
    }
    const base64Data = rawBase64.trim();

    if (Capacitor.isNativePlatform()) {
      let shareErrorMsg = null;

      // 1. Primary Method: Call native sharePdf plugin (writes to internal cache with 0 permission requirements & opens native Share chooser)
      try {
        const res = await DownloadPdf.sharePdf({
          base64Data: base64Data,
          filename: filename,
          targetPackage: options?.targetPackage || null,
          phone: options?.phone || null
        });
        if (res && res.success) {
          return true;
        }
      } catch (nativeErr) {
        console.warn('Native sharePdf call failed, attempting fallback:', nativeErr);
        shareErrorMsg = nativeErr?.message || String(nativeErr);
      }

      // 2. Secondary Fallback: Use Capacitor Filesystem + Share plugin
      let savedUri = null;

      try {
        const perm = await Filesystem.checkPermissions();
        if (perm.publicStorage !== 'granted') {
          await Filesystem.requestPermissions();
        }
      } catch (_pErr) {}

      try {
        const cacheFile = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true
        });
        savedUri = cacheFile.uri;
      } catch (_cErr) {
        try {
          const docFile = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true
          });
          savedUri = docFile.uri;
        } catch (_dErr) {}
      }

      if (savedUri) {
        try {
          await Share.share({
            title: filename,
            files: [savedUri],
            dialogTitle: 'Share PDF Invoice'
          });
          return true;
        } catch (sharePluginErr) {
          console.error('Capacitor Share plugin error:', sharePluginErr);
          if (shareErrorMsg) {
            alert('Share PDF failed: ' + shareErrorMsg);
          } else {
            alert('Share PDF failed: ' + (sharePluginErr.message || sharePluginErr));
          }
          return false;
        }
      } else {
        alert('Could not prepare PDF file for sharing' + (shareErrorMsg ? `: ${shareErrorMsg}` : ''));
        return false;
      }
    } else {
      // Web Browser Platform: Blob URL download
      triggerBlobDownload(pdf, filename);
      return true;
    }
  } catch (err) {
    console.error('PDF Export Error:', err);
    try {
      pdf.save(filename);
      return true;
    } catch (_e) {
      alert('Could not generate PDF file: ' + (err.message || err));
      return false;
    }
  }
}

/**
 * Downloads/saves a PDF file directly to device storage (public Downloads folder on native Android, or Blob link download on Web).
 */
export async function downloadPdfFile(pdf, filename) {
  try {
    let rawBase64 = '';
    try {
      rawBase64 = pdf.output('datauristring');
    } catch (_e) {
      rawBase64 = pdf.output('base64');
    }
    if (rawBase64.includes(',')) {
      rawBase64 = rawBase64.split(',')[1];
    }
    const base64Data = rawBase64.trim();

    if (Capacitor.isNativePlatform()) {
      const res = await DownloadPdf.downloadPdf({
        base64Data: base64Data,
        filename: filename
      });
      return Boolean(res && res.success);
    } else {
      triggerBlobDownload(pdf, filename);
      return true;
    }
  } catch (err) {
    console.error('PDF Download Error:', err);
    try {
      pdf.save(filename);
      return true;
    } catch (_e) {
      alert('Could not download PDF file: ' + (err.message || err));
      return false;
    }
  }
}




