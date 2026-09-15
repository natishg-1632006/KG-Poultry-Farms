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
import { captureSafeCanvas } from '../../utils/pdfGenerator';

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
  const invDate = invoiceData?.invoiceDate || invoiceData?.dispatchDate || dispatch?.dispatchDate || dispatch?.date || new Date().toISOString().split('T')[0];
  const customerName = invoiceData?.customerName || dispatch?.vehicleName || dispatch?.traderName || dispatch?.customerName || 'General Trader';
  const customerPhone = invoiceData?.customerPhone || dispatch?.customerPhone || dispatch?.driverMobileNumber || '';
  const vehicleNo = invoiceData?.vehicleNumber || dispatch?.vehicleNumber || 'TN-38-AX-1234';
  const driverName = invoiceData?.driverName || dispatch?.driverName || 'Suresh';

  // Calculate totals from boxSets or invoiceData
  const loadedSets = boxSets.filter(s => Number(s.loadedWeight) > 0);
  const totalBoxes = boxSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
  const totalTareWeight = boxSets.reduce((acc, s) => acc + (Number(s.emptyBoxWeight) || 0), 0);
  const totalGrossWeight = boxSets.reduce((acc, s) => acc + (Number(s.loadedWeight) || 0), 0);
  
  const totalNetWeight = (boxSets && boxSets.length > 0)
    ? parseFloat(boxSets.reduce((sum, s) => sum + (Number(s.totalChickenWeight) || 0), 0).toFixed(2))
    : parseFloat(Number(invoiceData?.totalWeightKg || dispatch?.totalWeight || dispatch?.netWeight || 0).toFixed(2));

  const totalBirds = (boxSets && boxSets.length > 0)
    ? boxSets.reduce((sum, s) => sum + (Number(s.chickenCount) || 0), 0)
    : (invoiceData?.totalChickens || dispatch?.totalBirds || dispatch?.birdsCount || 0);

  const currentRate = invoiceData?.ratePerKg || ratePerKg || 135;
  const avgWeight = totalBirds > 0 ? (totalNetWeight / totalBirds).toFixed(3) : (dispatch?.averageWeight || 0);

  // PDF Generation Function - using captureSafeCanvas to sanitize host document oklch styles
  const handleDownloadPDF = async () => {
    const el = document.getElementById('trader-invoice-document');
    if (!el) return;
    setDownloading(true);
    try {
      const canvas = await captureSafeCanvas(el);
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      const subPageTopMargin = 12; // Top margin space on Page 2 and below only

      let heightLeft = imgHeight;
      let renderedCanvasY = 0;

      // Render Page 1 (offset 0 - no top margin on Page 1)
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      renderedCanvasY += pageHeight;
      heightLeft -= pageHeight;

      // Render Page 2 and below (with top margin space at starting of Page 2+)
      while (heightLeft > 0) {
        const position = subPageTopMargin - renderedCanvasY;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, subPageTopMargin, 'F');

        const canvasSliceOnSubPage = pageHeight - subPageTopMargin;
        renderedCanvasY += canvasSliceOnSubPage;
        heightLeft -= canvasSliceOnSubPage;
      }

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

  const renderDocumentContent = () => (
    <div
      id="trader-invoice-document"
      style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#e2e8f0', width: '800px', boxSizing: 'border-box' }}
      className="p-8 border rounded-2xl shadow-sm space-y-6 font-sans print:p-0 print:border-none print:shadow-none"
    >
      {/* Top Farm Brand & Official Invoice Header (Side-by-side flex layout) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/kg-logo.jpg"
            alt="KG Poultry Logo"
            style={{ height: '56px', width: '56px', borderRadius: '9999px', objectFit: 'contain', border: '2px solid #059669', padding: '2px' }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div>
            <h1 style={{ color: '#0f172a', fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em', textTransform: 'uppercase', margin: 0 }}>
              KG POULTRY FARMS
            </h1>
            <p style={{ color: '#047857', fontSize: '12px', fontWeight: '800', margin: '2px 0 0 0' }}>
              Authorized Farmer: Ponni
            </p>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', margin: '2px 0 0 0' }}>
              Phone: 9080691947 • Email: kgpoultryfarms@gmail.com
            </p>
          </div>
        </div>

        {/* Light Green Official Invoice Badge Box (Right-aligned compact box) */}
        <div
          style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 18px', borderRadius: '16px', textAlign: 'right', shrink: 0 }}
        >
          <div style={{ color: '#166534', fontSize: '10px', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.05em' }}>
            OFFICIAL INVOICE
          </div>
          <div style={{ color: '#0f172a', fontSize: '18px', fontWeight: '900', letterSpacing: '-0.02em', margin: '2px 0 0 0' }}>
            {invNumber}
          </div>
          <div style={{ color: '#475569', fontSize: '12px', fontWeight: '700', margin: '2px 0 0 0' }}>
            Date: {invDate}
          </div>
        </div>
      </div>

      {/* Green Horizontal Dividing Line */}
      <div style={{ backgroundColor: '#10b981', height: '2px', width: '100%', borderRadius: '9999px' }}></div>

      {/* Billed To & Vehicle Transport Info Container Box (Explicit 2-Column Grid) */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px'
        }}
      >
        {/* Left Column: Billed To */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            BILLED TO
          </span>
          <div style={{ color: '#0f172a', fontSize: '14px', fontWeight: '900' }}>
            {customerName}
          </div>
          <div style={{ color: '#475569', fontSize: '12px', fontWeight: '600' }}>
            Contact: {customerPhone || '9080691947'}
          </div>
        </div>

        {/* Right Column: Vehicle & Transport Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid #cbd5e1', paddingLeft: '16px' }}>
          <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            VEHICLE & TRANSPORT INFO
          </span>
          <div style={{ color: '#0f172a', fontSize: '12px', fontWeight: '700' }}>
            Vehicle Number: <strong style={{ color: '#047857', fontWeight: '800' }}>{vehicleNo}</strong>
          </div>
          <div style={{ color: '#334155', fontSize: '12px', fontWeight: '600' }}>
            Driver: {driverName}
          </div>
          <div style={{ color: '#334155', fontSize: '12px', fontWeight: '600' }}>
            Dispatch Date: {invDate}
          </div>
          <div style={{ color: '#0f172a', fontSize: '12px', fontWeight: '700' }}>
            Total Boxes: <strong>{totalBoxes} Boxes</strong>
          </div>
          <div style={{ color: '#0f172a', fontSize: '12px', fontWeight: '700' }}>
            Total Birds: <strong>{totalBirds} Birds</strong>
          </div>
        </div>
      </div>

      {/* Weighing Scale Breakdown (Tare & Gross Load) */}
      <div className="space-y-2">
        <h3 style={{ color: '#0f172a' }} className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="h-4 w-4" style={{ color: '#047857' }} />
          <span>WEIGHING SCALE BREAKDOWN (TARE & GROSS LOAD)</span>
        </h3>

        <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
          <table className="w-full text-left text-xs">
            <thead style={{ backgroundColor: '#f8fafc', color: '#475569' }} className="font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-300">
              <tr>
                <th className="py-2.5 px-3">SET #</th>
                <th className="py-2.5 px-3">BOXES</th>
                <th className="py-2.5 px-3">EMPTY TARE WT</th>
                <th className="py-2.5 px-3">GROSS LOADED WT</th>
                <th className="py-2.5 px-3">NET CHICKEN WT</th>
                <th className="py-2.5 px-3">BIRDS</th>
                <th className="py-2.5 px-3">AVG WT / BIRD</th>
              </tr>
            </thead>
            <tbody style={{ color: '#334155' }} className="divide-y divide-slate-200 font-medium">
              {boxSets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-4 text-center text-slate-400 font-medium italic">
                    Total Dispatch Weight: {totalNetWeight.toFixed(2)} kg ({totalBirds} birds)
                  </td>
                </tr>
              ) : (
                boxSets.map((s, idx) => {
                  const isLoaded = Number(s.loadedWeight) > 0;
                  const boxesInSet = Number(s.boxesInSet) || 5;
                  const totalEmptyTare = Number(s.emptyBoxWeight) || 0;
                  const gross = isLoaded ? Number(s.loadedWeight) : 0;
                  const net = isLoaded ? (s.totalChickenWeight || (gross - totalEmptyTare)) : 0;

                  return (
                    <tr key={s.id || idx} className="hover:bg-slate-50">
                      <td style={{ color: '#0f172a' }} className="py-2.5 px-3 font-bold">Set #{s.boxSetNumber || (idx + 1)}</td>
                      <td className="py-2.5 px-3 font-semibold">{boxesInSet} Boxes</td>
                      <td style={{ color: '#64748b' }} className="py-2.5 px-3">{s.emptyBoxWeight} kg</td>
                      <td style={{ color: '#0f172a' }} className="py-2.5 px-3 font-semibold">{isLoaded ? `${gross} kg` : 'Pending'}</td>
                      <td style={{ color: '#047857' }} className="py-2.5 px-3 font-extrabold">{isLoaded ? `${net.toFixed(2)} kg` : '—'}</td>
                      <td style={{ color: '#0f172a' }} className="py-2.5 px-3 font-bold">{s.chickenCount || '—'}</td>
                      <td style={{ color: '#475569' }} className="py-2.5 px-3 font-semibold">{isLoaded ? `${s.averageChickenWeight || (net / (s.chickenCount || 1)).toFixed(3)} kg` : '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot style={{ backgroundColor: '#ffffff', color: '#0f172a' }} className="font-extrabold border-t-2 border-slate-900 text-xs">
              <tr>
                <td style={{ color: '#0f172a' }} className="py-3 px-3 font-black uppercase">TOTALS</td>
                <td className="py-3 px-3 font-black">{totalBoxes} Boxes</td>
                <td style={{ color: '#475569' }} className="py-3 px-3 font-extrabold">{totalTareWeight.toFixed(1)} kg</td>
                <td style={{ color: '#0f172a' }} className="py-3 px-3 font-black">{totalGrossWeight.toFixed(1)} kg</td>
                <td style={{ color: '#047857' }} className="py-3 px-3 font-black text-sm">{totalNetWeight.toFixed(2)} kg</td>
                <td style={{ color: '#047857' }} className="py-3 px-3 font-black">{totalBirds} Birds</td>
                <td style={{ color: '#047857' }} className="py-3 px-3 font-black">{avgWeight} kg/bird</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Verified Dispatch Seal Stamp Section */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '6px' }}>
          <div
            style={{
              borderColor: '#059669',
              backgroundColor: '#f0fdf4',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '112px',
              width: '112px',
              borderRadius: '9999px',
              borderWidth: '4px',
              borderStyle: 'dashed',
              padding: '8px',
              transform: 'rotate(-2deg)'
            }}
          >
            <div style={{ borderColor: '#10b981', position: 'absolute', inset: '4px', borderRadius: '9999px', borderWidth: '2px', borderStyle: 'double' }}></div>
            <div style={{ color: '#065f46', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              <span style={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1 }}>KG POULTRY</span>
              <span style={{ color: '#064e3b', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>VERIFIED</span>
              <span style={{ color: '#047857', fontSize: '7px', fontWeight: '700', textTransform: 'uppercase' }}>OFFICIAL SEAL</span>
            </div>
          </div>
          <div style={{ color: '#1e293b', fontSize: '12px', fontWeight: '900' }}>KG Poultry Farms Verified Dispatch</div>
          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>Authorized Quality & Weight Certificate</div>
        </div>
      </div>

      {/* Footer Terms */}
      <div style={{ borderColor: '#e2e8f0', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '16px', textAlign: 'center', fontSize: '10px', fontWeight: '500' }}>
        This invoice is computer generated and verified by KG Poultry Farms Weighing System.
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dispatch Invoice - Vehicle ${vehicleNo}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 py-1">
        {/* Header Bar: Meta & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 border border-emerald-200 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">Vehicle {vehicleNo} Invoice</h3>
              <p className="text-xs text-slate-500 font-semibold truncate">
                Trader: <strong className="text-slate-800">{customerName}</strong> • Date: <strong className="text-slate-800">{invDate}</strong>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-black text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>{downloading ? 'Exporting...' : 'PDF'}</span>
            </button>

            <button
              onClick={handleSendToTraderWhatsApp}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3 py-2 text-xs font-black text-white shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 text-white" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Scrollable Document Preview for Mobile & Desktop */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100/60 p-2 sm:p-4 flex justify-center max-w-full">
          {renderDocumentContent()}
        </div>
      </div>
    </Modal>
  );
};
