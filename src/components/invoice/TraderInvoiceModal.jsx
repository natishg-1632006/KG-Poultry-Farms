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
      style={{
        backgroundColor: '#ffffff',
        color: '#0f172a',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '32px',
        width: '800px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* 1. Top Farm Brand & Official Invoice Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px', marginBottom: '24px' }}>
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

        {/* Official Invoice Badge Box */}
        <div
          style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 18px', borderRadius: '16px', textAlign: 'right', flexShrink: 0 }}
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
      <div style={{ backgroundColor: '#10b981', height: '2px', width: '100%', borderRadius: '9999px', marginBottom: '24px' }}></div>

      {/* 2. Billed To & Vehicle Transport Info Container Box */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
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

      {/* 3. Weighing Scale Breakdown (Tare & Gross Load) */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#0f172a', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <Layers className="h-4 w-4" style={{ color: '#047857' }} />
          <span>WEIGHING SCALE BREAKDOWN (TARE & GROSS LOAD)</span>
        </h3>

        <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', textAlign: 'left', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px', borderBottom: '1px solid #cbd5e1' }}>
              <tr>
                <th style={{ padding: '10px 12px' }}>SET #</th>
                <th style={{ padding: '10px 12px' }}>BOXES</th>
                <th style={{ padding: '10px 12px' }}>EMPTY TARE WT</th>
                <th style={{ padding: '10px 12px' }}>GROSS LOADED WT</th>
                <th style={{ padding: '10px 12px' }}>NET CHICKEN WT</th>
                <th style={{ padding: '10px 12px' }}>BIRDS</th>
                <th style={{ padding: '10px 12px' }}>AVG WT / BIRD</th>
              </tr>
            </thead>
            <tbody style={{ color: '#334155', fontWeight: '500' }}>
              {boxSets.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontWeight: '500' }}>
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
                    <tr key={s.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: '700' }}>Set #{s.boxSetNumber || (idx + 1)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: '600' }}>{boxesInSet} Boxes</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{s.emptyBoxWeight} kg</td>
                      <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: '600' }}>{isLoaded ? `${gross} kg` : 'Pending'}</td>
                      <td style={{ padding: '10px 12px', color: '#047857', fontWeight: '800' }}>{isLoaded ? `${net.toFixed(2)} kg` : '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: '700' }}>{s.chickenCount || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#475569', fontWeight: '600' }}>{isLoaded ? `${s.averageChickenWeight || (net / (s.chickenCount || 1)).toFixed(3)} kg` : '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot style={{ backgroundColor: '#ffffff', color: '#0f172a', fontWeight: '800', borderTop: '2px solid #0f172a', fontSize: '12px' }}>
              <tr>
                <td style={{ padding: '12px 12px', color: '#0f172a', fontWeight: '900', textTransform: 'uppercase' }}>TOTALS</td>
                <td style={{ padding: '12px 12px', color: '#0f172a', fontWeight: '900' }}>{totalBoxes} Boxes</td>
                <td style={{ padding: '12px 12px', color: '#475569', fontWeight: '800' }}>{totalTareWeight.toFixed(1)} kg</td>
                <td style={{ padding: '12px 12px', color: '#0f172a', fontWeight: '900' }}>{totalGrossWeight.toFixed(1)} kg</td>
                <td style={{ padding: '12px 12px', color: '#047857', fontWeight: '900', fontSize: '14px' }}>{totalNetWeight.toFixed(2)} kg</td>
                <td style={{ padding: '12px 12px', color: '#047857', fontWeight: '900' }}>{totalBirds} Birds</td>
                <td style={{ padding: '12px 12px', color: '#047857', fontWeight: '900' }}>{avgWeight} kg/bird</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. Verified Dispatch Seal Stamp Section */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', marginTop: '16px' }}>
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
              <ShieldCheck className="h-6 w-6 text-emerald-600" style={{ color: '#059669', height: '24px', width: '24px' }} />
              <span style={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1 }}>KG POULTRY</span>
              <span style={{ color: '#064e3b', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>VERIFIED</span>
              <span style={{ color: '#047857', fontSize: '7px', fontWeight: '700', textTransform: 'uppercase' }}>OFFICIAL SEAL</span>
            </div>
          </div>
          <div style={{ color: '#1e293b', fontSize: '12px', fontWeight: '900' }}>KG Poultry Farms Verified Dispatch</div>
          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>Authorized Quality & Weight Certificate</div>
        </div>
      </div>

      {/* 5. Footer Terms */}
      <div style={{ borderColor: '#e2e8f0', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '24px', textAlign: 'center', fontSize: '10px', fontWeight: '500' }}>
        This invoice is computer generated and verified by KG Poultry Farms Weighing System.
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dispatch Invoice Options - Vehicle ${vehicleNo}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 py-2">
        {/* Header Icon & Vehicle Meta */}
        <div className="text-center space-y-1">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 border border-emerald-200">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-base font-black text-slate-900">Vehicle {vehicleNo} Invoice</h3>
          <p className="text-xs text-slate-500 font-semibold">
            Trader: <strong className="text-slate-800">{customerName}</strong> • Date: <strong className="text-slate-800">{invDate}</strong>
          </p>
        </div>

        {/* The 3 Action Buttons ONLY */}
        <div className="grid grid-cols-1 gap-2.5 pt-2">
          {/* 1. Download PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-3 text-xs font-black text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>{downloading ? 'Exporting PDF...' : 'Download PDF Invoice'}</span>
          </button>

          {/* 2. Send to Trader (WhatsApp) */}
          <button
            onClick={handleSendToTraderWhatsApp}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-3 text-xs font-black text-white shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Send className="h-4 w-4 text-white" />
            <span>Send to Trader (WhatsApp)</span>
          </button>

          {/* 3. Print Invoice */}
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-3 text-xs font-bold text-slate-800 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Offscreen document template captured safely via iframe by captureSafeCanvas */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '800px', opacity: 0, pointerEvents: 'none', zIndex: -100 }}>
        {renderDocumentContent()}
      </div>
    </Modal>
  );
};
