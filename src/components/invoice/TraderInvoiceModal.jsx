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
  Layers,
  Share2
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { captureSafeCanvas, saveAndOpenPdf, downloadPdfFile } from '../../utils/pdfGenerator';
import { KG_LOGO_BASE64 } from '../../assets/logo';
import { useLanguage } from '../../context/LanguageContext';

const WhatsAppIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.105 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

export const TraderInvoiceModal = ({
  isOpen,
  onClose,
  dispatch,
  boxSets = [],
  invoiceData,
  ratePerKg = 135,
  onRateChange
}) => {
  const { t, language } = useLanguage();
  const [shareStatusText, setShareStatusText] = useState('');
  const [downloadStatusText, setDownloadStatusText] = useState('');
  const [waStatusText, setWaStatusText] = useState('');
  const [waSupervisorStatusText, setWaSupervisorStatusText] = useState('');

  if (!isOpen) return null;

  // Normalize data between direct dispatch object or saved invoiceData
  const invNumber = invoiceData?.id || `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const invDate = invoiceData?.invoiceDate || invoiceData?.dispatchDate || dispatch?.dispatchDate || dispatch?.date || new Date().toISOString().split('T')[0];
  const customerName = invoiceData?.customerName || dispatch?.vehicleName || dispatch?.traderName || dispatch?.customerName || 'General Trader';
  const customerPhone = invoiceData?.customerPhone || dispatch?.customerPhone || dispatch?.traderPhone || dispatch?.driverMobileNumber || dispatch?.mobileNumber || dispatch?.phone || '';
  const vehicleNo = invoiceData?.vehicleNumber || dispatch?.vehicleNumber || 'TN-38-AX-1234';
  const driverName = invoiceData?.driverName || dispatch?.driverName || 'Suresh';

  // Calculate totals from boxSets or invoiceData/dispatch
  const loadedSets = boxSets.filter(s => Number(s.loadedWeight) > 0);
  const totalBoxes = (boxSets && boxSets.length > 0)
    ? boxSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0)
    : (invoiceData?.totalBoxes || dispatch?.totalBoxCount || dispatch?.totalCrates || 0);

  const totalTareWeight = boxSets.reduce((acc, s) => acc + (Number(s.emptyBoxWeight) || 0), 0);
  const totalGrossWeight = boxSets.reduce((acc, s) => acc + (Number(s.loadedWeight) || 0), 0);
  
  // Calculate net weight from loaded sets or fallback to dispatch / invoice totals
  const calculatedNetFromSets = loadedSets.reduce((sum, s) => {
    const gross = Number(s.loadedWeight) || 0;
    const tare = Number(s.emptyBoxWeight) || 0;
    const net = Number(s.totalChickenWeight) > 0 ? Number(s.totalChickenWeight) : Math.max(0, gross - tare);
    return sum + net;
  }, 0);

  const totalNetWeight = calculatedNetFromSets > 0
    ? parseFloat(calculatedNetFromSets.toFixed(2))
    : parseFloat(Number(invoiceData?.totalWeightKg || dispatch?.totalWeight || dispatch?.netWeight || 0).toFixed(2));

  const calculatedBirdsFromSets = loadedSets.reduce((sum, s) => sum + (Number(s.chickenCount) || 0), 0);
  const totalBirds = calculatedBirdsFromSets > 0
    ? calculatedBirdsFromSets
    : (invoiceData?.totalChickens || dispatch?.totalBirds || dispatch?.birdsCount || ((dispatch?.totalBoxCount || 0) * (dispatch?.chickenCountPerBox || 12)) || 0);

  const currentRate = invoiceData?.ratePerKg || ratePerKg || 135;
  const avgWeight = totalBirds > 0 ? (totalNetWeight / totalBirds).toFixed(3) : (dispatch?.averageWeight || 0);

  // Helper to generate jsPDF document from rendered element
  const generatePdfInstance = async () => {
    const el = document.getElementById('trader-invoice-document');
    if (!el) return null;
    const canvas = await captureSafeCanvas(el);
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    if (imgHeight <= pdfHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
    } else {
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 3) {
        position = position - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }
    }

    return pdf;
  };

  // 1. Native Share PDF Function (Opens Share Chooser ONLY; does not auto-download to storage)
  const handleSharePDF = async () => {
    setShareStatusText('preparing');
    try {
      const pdf = await generatePdfInstance();
      if (!pdf) {
        setShareStatusText('error');
        setTimeout(() => setShareStatusText(''), 3000);
        return;
      }

      setShareStatusText('opening');
      const success = await saveAndOpenPdf(pdf, `KG-Poultry-Invoice-${invNumber}.pdf`);
      if (!success) {
        setShareStatusText('error');
        setTimeout(() => setShareStatusText(''), 3000);
      } else {
        setTimeout(() => setShareStatusText(''), 1000);
      }
    } catch (err) {
      alert('PDF Share Error: ' + err.message);
      setShareStatusText('error');
      setTimeout(() => setShareStatusText(''), 3000);
    }
  };

  // 2. Explicit Download PDF Function (Saves PDF to public Downloads folder)
  const handleDownloadPDF = async () => {
    setDownloadStatusText('preparing');
    try {
      const pdf = await generatePdfInstance();
      if (!pdf) {
        setDownloadStatusText('error');
        setTimeout(() => setDownloadStatusText(''), 3000);
        return;
      }

      setDownloadStatusText('saving');
      const success = await downloadPdfFile(pdf, `KG-Poultry-Invoice-${invNumber}.pdf`);
      if (!success) {
        setDownloadStatusText('error');
        setTimeout(() => setDownloadStatusText(''), 3000);
      } else {
        setTimeout(() => setDownloadStatusText(''), 1000);
      }
    } catch (err) {
      alert('PDF Download Error: ' + err.message);
      setDownloadStatusText('error');
      setTimeout(() => setDownloadStatusText(''), 3000);
    }
  };

  // 3. Send PDF to Trader WhatsApp Function
  const handleSendToTraderWhatsApp = async () => {
    let phoneToUse = customerPhone;
    if (!phoneToUse) {
      const input = window.prompt('Enter Trader WhatsApp Mobile Number (10 digits):');
      if (input === null) return;
      phoneToUse = input;
    }

    setWaStatusText('preparing');
    try {
      const pdf = await generatePdfInstance();
      if (!pdf) {
        setWaStatusText('error');
        setTimeout(() => setWaStatusText(''), 3000);
        return;
      }

      setWaStatusText('sending');

      if (Capacitor.isNativePlatform()) {
        const success = await saveAndOpenPdf(
          pdf,
          `KG-Poultry-Invoice-${invNumber}.pdf`,
          { targetPackage: 'whatsapp', phone: phoneToUse }
        );
        if (!success) {
          setWaStatusText('error');
          setTimeout(() => setWaStatusText(''), 3000);
        } else {
          setTimeout(() => setWaStatusText(''), 1000);
        }
      } else {
        downloadPdfFile(pdf, `KG-Poultry-Invoice-${invNumber}.pdf`);
        const textMessage = `🐔 *KG POULTRY FARMS - INVOICE ${invNumber}* 🐔\nAttached PDF Invoice for Vehicle ${vehicleNo}. Total Net Weight: ${totalNetWeight.toFixed(2)} kg (${totalBirds} birds).`;
        const cleanPhone = phoneToUse ? phoneToUse.replace(/\D/g, '') : '';
        const phoneParam = cleanPhone.length >= 10 ? (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone) : '';
        const waUrl = phoneParam
          ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(textMessage)}`
          : `https://wa.me/?text=${encodeURIComponent(textMessage)}`;
        window.open(waUrl, '_blank');
        setTimeout(() => setWaStatusText(''), 1000);
      }
    } catch (err) {
      alert('WhatsApp PDF Export Error: ' + err.message);
      setWaStatusText('error');
      setTimeout(() => setWaStatusText(''), 3000);
    }
  };

  // 4. Send PDF to Supervisor WhatsApp Function (Mobile Number: 9500979771)
  const handleSendToSupervisorWhatsApp = async () => {
    const supervisorPhone = '919500979771';

    setWaSupervisorStatusText('preparing');
    try {
      const pdf = await generatePdfInstance();
      if (!pdf) {
        setWaSupervisorStatusText('error');
        setTimeout(() => setWaSupervisorStatusText(''), 3000);
        return;
      }

      setWaSupervisorStatusText('sending');

      if (Capacitor.isNativePlatform()) {
        const success = await saveAndOpenPdf(
          pdf,
          `KG-Poultry-Invoice-${invNumber}.pdf`,
          { targetPackage: 'whatsapp', phone: supervisorPhone }
        );
        if (!success) {
          setWaSupervisorStatusText('error');
          setTimeout(() => setWaSupervisorStatusText(''), 3000);
        } else {
          setTimeout(() => setWaSupervisorStatusText(''), 1000);
        }
      } else {
        downloadPdfFile(pdf, `KG-Poultry-Invoice-${invNumber}.pdf`);
        const textMessage = `\u{1F414} *KG POULTRY FARMS - DISPATCH INVOICE* \u{1F414}
\u{1F4C6} Date: ${invDate}
\u{1F69A} Vehicle: ${vehicleNo} (${driverName})
\u{1F464} Trader: ${customerName}
\u{1F4E6} Total Boxes: ${totalBoxes}
\u{1F424} Total Birds: ${totalBirds}
\u{2696}\u{FE0F} Total Net Wt: ${totalNetWeight.toFixed(2)} kg
\u{1F4C8} Avg Wt: ${avgWeight} g/bird
\u{1F4C4} Invoice #: ${invNumber}

\u{1F4C4} PDF Invoice file downloaded to device.`;

        const waUrl = `https://wa.me/${supervisorPhone}?text=${encodeURIComponent(textMessage)}`;
        window.open(waUrl, '_blank');
        setTimeout(() => setWaSupervisorStatusText(''), 1000);
      }
    } catch (err) {
      alert('WhatsApp PDF Export Error: ' + err.message);
      setWaSupervisorStatusText('error');
      setTimeout(() => setWaSupervisorStatusText(''), 3000);
    }
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
            src={KG_LOGO_BASE64 || "/kg-logo.jpg"}
            alt="KG Poultry Logo"
            style={{ height: '56px', width: '56px', borderRadius: '9999px', objectFit: 'contain', border: '2px solid #059669', padding: '2px' }}
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

        {/* Action Buttons (Show ONLY buttons in popup as requested) */}
        <div className="grid grid-cols-1 gap-2.5 pt-2">
          {/* 1. Send PDF to Supervisor WhatsApp (9500979771) */}
          <button
            onClick={handleSendToSupervisorWhatsApp}
            disabled={Boolean(waSupervisorStatusText)}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] hover:bg-[#1faa53] px-4 py-3 text-xs font-black text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <WhatsAppIcon className="h-4 w-4 text-white shrink-0" />
            <span>
              {waSupervisorStatusText === 'preparing'
                ? 'Preparing PDF...'
                : waSupervisorStatusText === 'sending'
                ? 'Opening Supervisor WhatsApp...'
                : waSupervisorStatusText === 'error'
                ? 'Unable to Open WhatsApp'
                : (language === 'ta' ? 'மேற்பார்வையாளருக்கு அனுப்பு (வாட்ஸ்அப் PDF)' : 'Send to Supervisor (WhatsApp PDF)')}
            </span>
          </button>

          {/* 2. Send PDF to Trader */}
          <button
            onClick={handleSendToTraderWhatsApp}
            disabled={Boolean(waStatusText)}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-3 text-xs font-black text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Send className="h-4 w-4 text-white shrink-0" />
            <span>
              {waStatusText === 'preparing'
                ? 'Preparing PDF...'
                : waStatusText === 'sending'
                ? 'Opening WhatsApp...'
                : waStatusText === 'error'
                ? 'Unable to Open WhatsApp'
                : (language === 'ta' ? 'வியாபாரிக்கு அனுப்பு (வாட்ஸ்அப்)' : 'Send to Trader')}
            </span>
          </button>

          {/* 3. Download PDF Invoice */}
          <button
            onClick={handleDownloadPDF}
            disabled={Boolean(downloadStatusText)}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-3 text-xs font-black text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              {downloadStatusText === 'preparing'
                ? 'Preparing PDF...'
                : downloadStatusText === 'saving'
                ? 'Saving PDF to Downloads...'
                : downloadStatusText === 'error'
                ? 'Error Downloading PDF'
                : (language === 'ta' ? 'PDF ரசீதைப் பதிவிறக்கு' : 'Download PDF Invoice')}
            </span>
          </button>

          {/* 4. Share PDF Invoice (Native Mobile App Only) */}
          {Capacitor.isNativePlatform() && (
            <button
              onClick={handleSharePDF}
              disabled={Boolean(shareStatusText)}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-3 text-xs font-black text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Share2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                {shareStatusText === 'preparing'
                  ? 'Preparing PDF...'
                  : shareStatusText === 'opening'
                  ? 'Opening Share Menu...'
                  : shareStatusText === 'error'
                  ? 'Unable to Share PDF'
                  : 'Share PDF Invoice'}
              </span>
            </button>
          )}

          {/* 5. Print Invoice (Web Browsers Only - Hidden on Mobile App) */}
          {!Capacitor.isNativePlatform() && (
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-3 text-xs font-bold text-slate-800 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="h-4 w-4 text-slate-600 shrink-0" />
              <span>{language === 'ta' ? 'ரசீதை அச்சிடு' : 'Print Invoice'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Offscreen document template positioned at -9999px for crisp canvas PDF generation */}
      <div style={{ position: 'fixed', left: '-9999px', top: '0px', width: '800px', backgroundColor: '#ffffff', pointerEvents: 'none', zIndex: -9999 }}>
        {renderDocumentContent()}
      </div>
    </Modal>
  );
};
