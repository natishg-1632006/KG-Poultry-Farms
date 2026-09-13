import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import {
  Printer,
  Download,
  Send,
  ShieldCheck,
  FileText,
  Truck,
  User,
  Calendar,
  Layers
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const TraderInvoiceModal = ({
  isOpen,
  onClose,
  dispatch,
  boxSets = [],
  invoiceData,
  ratePerKg = 135,
  onRateChange
}) => {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  // Normalize data between direct dispatch object or saved invoiceData
  const invNumber = invoiceData?.id || `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const invDate = invoiceData?.invoiceDate || dispatch?.dispatchDate || new Date().toISOString().split('T')[0];
  const customerName = invoiceData?.customerName || dispatch?.vehicleName || 'KG Wholesale Poultry Traders';
  const customerPhone = invoiceData?.customerPhone || dispatch?.driverMobileNumber || '';
  const vehicleNo = invoiceData?.vehicleNumber || dispatch?.vehicleNumber || 'TN-38-C-5544';
  const driverName = invoiceData?.driverName || dispatch?.driverName || 'Karthik';

  // Calculate totals from boxSets or invoiceData
  const loadedSets = boxSets.filter(s => Number(s.loadedWeight) > 0);
  const totalBoxes = boxSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
  const totalTareWeight = boxSets.reduce((acc, s) => acc + ((Number(s.emptyBoxWeight) || 0) * (Number(s.boxesInSet) || 1)), 0);
  const totalGrossWeight = boxSets.reduce((acc, s) => acc + (Number(s.loadedWeight) || 0), 0);
  
  const totalNetWeight = loadedSets.length > 0
    ? loadedSets.reduce((acc, s) => acc + (Number(s.totalChickenWeight) || 0), 0)
    : (invoiceData?.totalWeightKg || dispatch?.totalWeight || 0);

  const totalBirds = loadedSets.length > 0
    ? loadedSets.reduce((acc, s) => acc + (Number(s.chickenCount) || 0), 0)
    : (invoiceData?.totalChickens || 0);

  const currentRate = invoiceData?.ratePerKg || ratePerKg || 135;
  const grandTotal = totalNetWeight * currentRate;
  const avgWeight = totalBirds > 0 ? (totalNetWeight / totalBirds).toFixed(3) : (dispatch?.averageWeight || 0);

  // PDF Generation Function - with oklch color parser fix
  const handleDownloadPDF = async () => {
    const el = document.getElementById('trader-invoice-document');
    if (!el) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const mapOklchToHex = (text) => {
            if (!text || !text.includes('oklch')) return text;
            return text
              .replace(/--color-slate-950:\s*oklch\([^)]+\)/gi, '--color-slate-950: #020617')
              .replace(/--color-slate-900:\s*oklch\([^)]+\)/gi, '--color-slate-900: #0f172a')
              .replace(/--color-slate-800:\s*oklch\([^)]+\)/gi, '--color-slate-800: #1e293b')
              .replace(/--color-slate-700:\s*oklch\([^)]+\)/gi, '--color-slate-700: #334155')
              .replace(/--color-slate-600:\s*oklch\([^)]+\)/gi, '--color-slate-600: #475569')
              .replace(/--color-slate-500:\s*oklch\([^)]+\)/gi, '--color-slate-500: #64748b')
              .replace(/--color-slate-400:\s*oklch\([^)]+\)/gi, '--color-slate-400: #94a3b8')
              .replace(/--color-slate-300:\s*oklch\([^)]+\)/gi, '--color-slate-300: #cbd5e1')
              .replace(/--color-slate-200:\s*oklch\([^)]+\)/gi, '--color-slate-200: #e2e8f0')
              .replace(/--color-slate-100:\s*oklch\([^)]+\)/gi, '--color-slate-100: #f1f5f9')
              .replace(/--color-slate-50:\s*oklch\([^)]+\)/gi, '--color-slate-50: #f8fafc')
              .replace(/--color-emerald-900:\s*oklch\([^)]+\)/gi, '--color-emerald-900: #064e3b')
              .replace(/--color-emerald-800:\s*oklch\([^)]+\)/gi, '--color-emerald-800: #065f46')
              .replace(/--color-emerald-700:\s*oklch\([^)]+\)/gi, '--color-emerald-700: #047857')
              .replace(/--color-emerald-600:\s*oklch\([^)]+\)/gi, '--color-emerald-600: #059669')
              .replace(/--color-emerald-500:\s*oklch\([^)]+\)/gi, '--color-emerald-500: #10b981')
              .replace(/--color-emerald-100:\s*oklch\([^)]+\)/gi, '--color-emerald-100: #d1fae5')
              .replace(/--color-emerald-50:\s*oklch\([^)]+\)/gi, '--color-emerald-50: #f0fdf4')
              .replace(/--color-teal-900:\s*oklch\([^)]+\)/gi, '--color-teal-900: #134e4a')
              .replace(/--color-teal-700:\s*oklch\([^)]+\)/gi, '--color-teal-700: #0f766e')
              .replace(/oklch\([^)]+\)/gi, '#334155');
          };

          // 1. Sanitize all <style> tags in cloned document by replacing oklch(...) with exact hex colors
          const styleTags = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            const styleTag = styleTags[i];
            if (styleTag.textContent && styleTag.textContent.includes('oklch')) {
              styleTag.textContent = mapOklchToHex(styleTag.textContent);
            }
          }

          // 2. Sanitize element inline styles and attribute styles
          const container = clonedDoc.getElementById('trader-invoice-document');
          if (container) {
            const nodes = [container, ...Array.from(container.querySelectorAll('*'))];
            nodes.forEach((node) => {
              const inlineStyle = node.getAttribute('style') || '';
              if (inlineStyle.includes('oklch')) {
                node.setAttribute('style', mapOklchToHex(inlineStyle));
              }
            });
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`KG-Poultry-Invoice-${invNumber}.pdf`);
    } catch (err) {
      alert('PDF Export Error: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // WhatsApp Send Function
  const handleSendToTraderWhatsApp = () => {
    const textMessage = 
`🐔 *KG POULTRY FARMS - OFFICIAL DISPATCH INVOICE* 🐔
----------------------------------------
📄 *Invoice No:* ${invNumber}
📅 *Date:* ${invDate}
🚛 *Vehicle No:* ${vehicleNo}
👤 *Driver Name:* ${driverName}
📱 *Trader Contact:* ${customerName} (${customerPhone || 'N/A'})

📦 *LOAD & WEIGHING BREAKDOWN:*
- Total Net Weight: *${totalNetWeight.toFixed(2)} kg*
- Total Birds: *${totalBirds} birds*
- Average Weight: *${avgWeight} kg/bird*
----------------------------------------
✅ *Officially Verified & Passed by KG Poultry Farms*
Thank you for your business!`;

    const cleanPhone = customerPhone ? customerPhone.replace(/\D/g, '') : '';
    const phoneParam = cleanPhone.length >= 10 ? (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone) : '';
    
    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(textMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(textMessage)}`;

    window.open(waUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Trader Invoice - ${vehicleNo}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Action Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Dispatch Trader Bill & Load Certificate</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendToTraderWhatsApp}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send to Trader (WhatsApp)</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>{downloading ? 'Exporting PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* Printable / Capturable Document Container */}
        <div
          id="trader-invoice-document"
          style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
          className="rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 font-sans"
        >
          {/* Farm Brand Header */}
          <div
            style={{ borderBottom: '2px solid #059669' }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 gap-4"
          >
            <div className="flex items-center gap-4">
              <img
                src="/kg-logo.jpg"
                alt="KG Poultry Farms Official Logo"
                className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-2xl shadow-xs border border-emerald-200 p-1 bg-white shrink-0"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>KG POULTRY FARMS</span>
                  <span
                    style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
                    className="rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
                  >
                    Verified Farm
                  </span>
                </h1>
                <p style={{ color: '#047857' }} className="text-xs font-semibold">Broiler Meat Sales & Wholesale Vehicle Dispatch</p>
                <p className="text-[11px] font-medium text-slate-500 mt-1">
                  Plot #45, Farm Zone, Palani Road, Dindigul, Tamil Nadu - 624001
                </p>
                <p className="text-[11px] font-medium text-slate-400">
                  Phone: +91 98421 01234 • Email: sales@kgpoultryfarms.com
                </p>
              </div>
            </div>

            <div
              style={{ backgroundColor: '#f0fdf4', borderColor: '#d1fae5' }}
              className="text-left sm:text-right p-3 rounded-2xl border shrink-0"
            >
              <div style={{ color: '#047857' }} className="text-xs uppercase font-extrabold tracking-wider">Official Invoice</div>
              <div className="text-lg font-black text-slate-900 tracking-tight mt-0.5">{invNumber}</div>
              <div className="text-xs text-slate-600 font-bold mt-1">Date: {invDate}</div>
            </div>
          </div>

          {/* Trader & Dispatch Details Grid */}
          <div
            style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border text-xs"
          >
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Billed To (Trader / Customer)</span>
              <div className="font-black text-slate-900 text-sm">{customerName}</div>
              {customerPhone && <div className="text-slate-600 font-medium">Contact: {customerPhone}</div>}
              <div className="text-slate-600 font-medium">Destination: Wholesale Poultry Market</div>
            </div>

            <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Vehicle & Transport Info</span>
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Vehicle Number: <strong style={{ color: '#047857' }}>{vehicleNo}</strong></span>
              </div>
              <div className="text-slate-600 font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Driver: {driverName}</span>
              </div>
              <div className="text-slate-600 font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Dispatch Time: {invDate}</span>
              </div>
            </div>
          </div>

          {/* Complete Box Sets Load & Empty Tare Breakdown Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-emerald-600" />
              <span>Weighing Scale Breakdown (Tare & Gross Load)</span>
            </h3>

            <div style={{ borderColor: '#e2e8f0' }} className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-xs">
                <thead style={{ backgroundColor: '#f1f5f9', color: '#334155' }} className="font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Set #</th>
                    <th className="py-2.5 px-3">Boxes</th>
                    <th className="py-2.5 px-3">Empty Tare Wt</th>
                    <th className="py-2.5 px-3">Gross Loaded Wt</th>
                    <th className="py-2.5 px-3">Net Chicken Wt</th>
                    <th className="py-2.5 px-3">Birds</th>
                    <th className="py-2.5 px-3">Avg Wt / Bird</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {boxSets.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-4 text-center text-slate-400">
                        Total Dispatch Weight: {totalNetWeight.toFixed(2)} kg ({totalBirds} birds)
                      </td>
                    </tr>
                  ) : (
                    boxSets.map((s) => {
                      const isLoaded = Number(s.loadedWeight) > 0;
                      const boxesInSet = Number(s.boxesInSet) || 5;
                      const totalEmptyTare = (Number(s.emptyBoxWeight) || 0) * boxesInSet;
                      const gross = isLoaded ? Number(s.loadedWeight) : 0;
                      const net = isLoaded ? (s.totalChickenWeight || (gross - totalEmptyTare)) : 0;

                      return (
                        <tr key={s.id || s.boxSetNumber} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-bold text-slate-900">Set #{s.boxSetNumber}</td>
                          <td className="py-2 px-3">{boxesInSet} Boxes</td>
                          <td className="py-2 px-3 text-slate-500">{s.emptyBoxWeight} kg</td>
                          <td className="py-2 px-3 font-semibold">{isLoaded ? `${gross} kg` : 'Pending'}</td>
                          <td style={{ color: '#047857' }} className="py-2 px-3 font-bold">{isLoaded ? `${net.toFixed(2)} kg` : '—'}</td>
                          <td className="py-2 px-3">{s.chickenCount || '—'}</td>
                          <td className="py-2 px-3 text-slate-600">{isLoaded ? `${s.averageChickenWeight || (net / (s.chickenCount || 1)).toFixed(3)} kg` : '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot style={{ backgroundColor: '#f8fafc', color: '#0f172a' }} className="font-bold border-t border-slate-200 text-xs">
                  <tr>
                    <td className="py-2.5 px-3">TOTALS</td>
                    <td className="py-2.5 px-3">{totalBoxes} Boxes</td>
                    <td className="py-2.5 px-3 text-slate-600">{totalTareWeight.toFixed(1)} kg</td>
                    <td className="py-2.5 px-3 text-slate-800">{totalGrossWeight.toFixed(1)} kg</td>
                    <td style={{ color: '#047857' }} className="py-2.5 px-3 font-black text-sm">{totalNetWeight.toFixed(2)} kg</td>
                    <td style={{ color: '#0f766e' }} className="py-2.5 px-3 font-extrabold">{totalBirds} Birds</td>
                    <td style={{ color: '#064e3b' }} className="py-2.5 px-3">{avgWeight} kg/bird</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Verified Farm Seal Stamp Section */}
          <div className="flex justify-end pt-2">
            <div className="flex flex-col items-center justify-center p-3 text-center space-y-2">
              <div
                style={{ borderColor: '#059669', backgroundColor: '#f0fdf4' }}
                className="relative flex items-center justify-center h-28 w-28 rounded-full border-4 border-dashed shadow-xs p-2 transform rotate-[-3deg]"
              >
                <div style={{ borderColor: '#10b981' }} className="absolute inset-1 rounded-full border"></div>
                <div style={{ color: '#065f46' }} className="flex flex-col items-center justify-center space-y-0.5 text-center">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                  <span className="text-[8px] font-black uppercase tracking-widest leading-none">KG POULTRY</span>
                  <span style={{ color: '#064e3b' }} className="text-[9px] font-extrabold uppercase tracking-tighter">VERIFIED</span>
                  <span style={{ color: '#047857' }} className="text-[7px] font-bold uppercase">OFFICIAL SEAL</span>
                </div>
              </div>
              <div className="text-[11px] font-bold text-slate-700">KG Poultry Farms Verified Dispatch</div>
              <div className="text-[10px] text-slate-400 font-medium">Authorized Quality & Weight Certificate</div>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400 font-medium">
            This invoice is computer generated and verified by KG Poultry Farms Weighing System • All weights measured on calibrated digital scales.
          </div>
        </div>
      </div>
    </Modal>
  );
};
