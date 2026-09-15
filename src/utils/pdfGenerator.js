import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Sanitizes all document stylesheets and style elements to strip oklch/oklab
 * color expressions BEFORE html2canvas parses document.styleSheets.
 */
function sanitizeHostStyles() {
  const backups = [];

  const mapOklchToHex = (text) => {
    if (!text || (!text.includes('oklch') && !text.includes('oklab'))) return text;
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
  };

  // 1. Sanitize style tags
  const styleTags = document.querySelectorAll('style');
  styleTags.forEach((tag) => {
    if (tag.textContent && (tag.textContent.includes('oklch') || tag.textContent.includes('oklab'))) {
      backups.push({ type: 'tag', el: tag, textContent: tag.textContent });
      tag.textContent = mapOklchToHex(tag.textContent);
    }
  });

  // 2. Sanitize CSSOM rules across all loaded stylesheets
  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const sheet = document.styleSheets[i];
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (rule && rule.style && rule.style.cssText) {
            if (rule.style.cssText.includes('oklch') || rule.style.cssText.includes('oklab')) {
              backups.push({ type: 'rule', rule, cssText: rule.style.cssText });
              rule.style.cssText = mapOklchToHex(rule.style.cssText);
            }
          }
        }
      } catch (_err) {
        // Ignore cross-origin sheet errors
      }
    }
  } catch (_err) {}

  // Return restore callback
  return () => {
    backups.forEach((item) => {
      try {
        if (item.type === 'tag') {
          item.el.textContent = item.textContent;
        } else if (item.type === 'rule') {
          item.rule.style.cssText = item.cssText;
        }
      } catch (_err) {}
    });
  };
}

export async function captureSafeCanvas(element, options = {}) {
  const restoreStyles = sanitizeHostStyles();
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      ...options
    });
    return canvas;
  } finally {
    restoreStyles();
  }
}
