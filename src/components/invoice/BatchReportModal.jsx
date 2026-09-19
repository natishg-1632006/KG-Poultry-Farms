import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  Printer,
  Download,
  ShieldCheck,
  Building2,
  Wheat,
  Truck,
  Share2
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import jsPDF from 'jspdf';
import { captureSafeCanvas, saveAndOpenPdf } from '../../utils/pdfGenerator';
import { KG_LOGO_BASE64 } from '../../assets/logo';

export const generateBatchReportPDF = async (batchName = 'KgPoultryBatch', onStatusChange) => {
  const container = document.getElementById('batch-invoice-document');
  if (!container) return false;
  try {
    if (onStatusChange) onStatusChange('preparing');
    const pageElements = container.querySelectorAll('.batch-report-page');
    if (!pageElements || pageElements.length === 0) return false;

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];
      const canvas = await captureSafeCanvas(pageEl);
      let imgHeight = (canvas.height * pdfWidth) / canvas.width;

      if (i > 0) pdf.addPage();

      if (imgHeight > pdfHeight) {
        // Auto-scale proportionally to fit within A4 height without clipping any bottom content
        const scaleRatio = pdfHeight / imgHeight;
        const scaledWidth = pdfWidth * scaleRatio;
        const xOffset = (pdfWidth - scaledWidth) / 2;
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', xOffset, 0, scaledWidth, pdfHeight, undefined, 'FAST');
      } else {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      }
    }

    if (onStatusChange) onStatusChange('opening');
    const success = await saveAndOpenPdf(pdf, `KG-Poultry-Batch-Invoice-${batchName}.pdf`);
    return success;
  } catch (err) {
    alert('PDF Export Error: ' + err.message);
    return false;
  }
};

export const BatchReportModal = ({
  isOpen = false,
  onClose,
  historyData,
  autoDownload = false
}) => {
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    if (isOpen && autoDownload && historyData) {
      const timer = setTimeout(() => {
        handleDownloadPDF();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoDownload, historyData]);

  if (!historyData) return null;

  const b = historyData?.batch || historyData || {};
  const dispatches = historyData?.dispatches || [];
  const medicines = historyData?.medicineRecords || [];
  const dailyRecords = historyData?.dailyRecords || [];
  const feedArrivals = historyData?.feedArrivals || historyData?.feedRecords || historyData?.feedLogs || [];

  const totalFeedLoadedBags = feedArrivals.reduce((sum, f) => {
    const bCount = f.bagsReceived !== undefined ? Number(f.bagsReceived) : (Number(f.quantityReceived || 0) / 70);
    return sum + (isNaN(bCount) ? 0 : bCount);
  }, 0);

  const totalFeedLoadedKg = feedArrivals.reduce((sum, f) => {
    const kCount = f.quantityReceived !== undefined ? Number(f.quantityReceived) : (Number(f.bagsReceived || 0) * 70);
    return sum + (isNaN(kCount) ? 0 : kCount);
  }, 0);

  const batchName = b.batchName || b.batchNumber || 'KgPoultryBatch';
  const batchIdCode = b.batchNumber || b.id ? (b.batchNumber || b.id).toUpperCase() : 'KG001';
  const invDate = new Date().toISOString().split('T')[0].split('-').reverse().join('/');
  const assignedFarmer = b.assignedFarmer || 'Ponni Authorized Farmer';
  const chickSupplierName = b.chickSupplier || 'Ponni Hatcheries';
  const arrivalDate = b.chickArrivalDate || b.startDate || b.placementDate || new Date().toISOString().split('T')[0];
  const vehicleNo = b.vehicleNumber || (dispatches[0]?.vehicleNumber) || 'TN-38-AX-1234';
  const driverName = b.driverName || (dispatches[0]?.driverName) || 'Suresh Kumar';

  // Extract / Calculate Traders Summary Breakdown
  let traders = historyData?.traderBreakdown || historyData?.traders || historyData?.aggregations?.traders || [];
  if (traders.length === 0 && dispatches.length > 0) {
    const tMap = {};
    for (const d of dispatches) {
      const name = d.vehicleName || d.traderName || d.customerName || 'General Trader';
      const birds = Number(d.totalBirds || d.birdsCount || 0);
      const wt = Number(d.totalWeight || 0);
      const crates = Number(d.totalCrates || d.cratesCount || d.totalBoxCount || 0);
      if (!tMap[name]) {
        tMap[name] = { traderName: name, totalBirds: 0, totalWeight: 0, totalCrates: 0, dispatchCount: 0 };
      }
      tMap[name].totalBirds += birds;
      tMap[name].totalWeight += wt;
      tMap[name].totalCrates += crates;
      tMap[name].dispatchCount += 1;
    }
    traders = Object.values(tMap);
  }

  // Metrics calculations with full fallbacks
  const initialChicks = Number(historyData?.initialChickCount || historyData?.aggregations?.initialChickCount || b.initialChickCount || b.chickCount || 5000);
  const totalMortality = Number(historyData?.totalMortality ?? historyData?.aggregations?.totalMortality ?? dailyRecords.reduce((sum, r) => sum + Number(r.mortalityCount || 0), 0));
  
  const totalBirdsDispatched = Number(
    historyData?.totalDispatchedBirds ?? 
    historyData?.aggregations?.totalDispatchedBirds ?? 
    dispatches.reduce((acc, d) => acc + Number(d.totalBirds || d.birdsCount || 0), 0)
  );

  const totalNetWeight = Number(
    historyData?.totalDispatchedWeight ?? 
    historyData?.aggregations?.totalDispatchedWeight ?? 
    dispatches.reduce((acc, d) => acc + Number(d.totalWeight || 0), 0)
  );

  const totalCrates = Number(
    historyData?.totalCratesCount ?? 
    historyData?.aggregations?.totalCratesCount ?? 
    dispatches.reduce((acc, d) => acc + Number(d.totalCrates || d.cratesCount || d.totalBoxCount || 0), 0)
  );

  const harvestedOrLiveBirds = totalBirdsDispatched > 0
    ? totalBirdsDispatched
    : Math.max(0, initialChicks - totalMortality);

  const liveRate = initialChicks > 0 ? ((harvestedOrLiveBirds / initialChicks) * 100).toFixed(1) : '100.0';
  const mortalityRate = historyData?.mortalityPercentage || historyData?.aggregations?.mortalityPercentage || (initialChicks > 0 ? ((totalMortality / initialChicks) * 100).toFixed(2) : '0.00');

  const feedKg = Number(historyData?.totalFeedConsumedKg || historyData?.aggregations?.totalFeedConsumedKg || dailyRecords.reduce((sum, r) => sum + Number(r.feedConsumption || 0), 0));
  const feedBags = Number(historyData?.totalFeedBags || historyData?.aggregations?.totalFeedBags || (feedKg > 0 ? (feedKg / 70).toFixed(1) : 0));

  const avgBirdWeight = historyData?.avgBirdWeight || historyData?.aggregations?.overallAvgWeight || (totalBirdsDispatched > 0 ? (totalNetWeight / totalBirdsDispatched).toFixed(3) : '0.000');
  const avgBirdWeightGrams = Math.round(Number(avgBirdWeight) * 1000);
  const finalFCR = historyData?.fcr || (totalNetWeight > 0 && feedKg > 0 ? (feedKg / totalNetWeight).toFixed(2) : '—');

  const handleDownloadPDF = async () => {
    setStatusText('preparing');
    const success = await generateBatchReportPDF(batchName, (st) => setStatusText(st));
    if (!success) {
      setStatusText('error');
      setTimeout(() => setStatusText(''), 3000);
    } else {
      setTimeout(() => setStatusText(''), 1000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Build dynamic page data with mobile safety padding to prevent bottom row clipping
  const buildPages = () => {
    const pageList = [];

    // 1. TRADER SALES PAGES (Max 5 on Page 1 alongside overview box)
    const TRADERS_P1_SIZE = 5;
    const TRADERS_CONT_SIZE = 10;
    
    let traderChunks = [];
    if (traders.length === 0) {
      traderChunks = [[]];
    } else if (traders.length <= TRADERS_P1_SIZE) {
      traderChunks = [traders];
    } else {
      traderChunks.push(traders.slice(0, TRADERS_P1_SIZE));
      const rest = traders.slice(TRADERS_P1_SIZE);
      for (let i = 0; i < rest.length; i += TRADERS_CONT_SIZE) {
        traderChunks.push(rest.slice(i, i + TRADERS_CONT_SIZE));
      }
    }

    traderChunks.forEach((chunk, index) => {
      pageList.push({
        type: 'traders',
        isFirstPageOfBatch: index === 0,
        isLastTraderChunk: index === traderChunks.length - 1,
        chunkData: chunk,
        chunkIndex: index
      });
    });

    // 2. FEED ARRIVALS PAGES (Max 10 per page)
    const FEED_SIZE = 10;
    let feedChunks = [];
    if (feedArrivals.length === 0) {
      feedChunks = [[]];
    } else {
      for (let i = 0; i < feedArrivals.length; i += FEED_SIZE) {
        feedChunks.push(feedArrivals.slice(i, i + FEED_SIZE));
      }
    }

    feedChunks.forEach((chunk, index) => {
      pageList.push({
        type: 'feed',
        isLastFeedChunk: index === feedChunks.length - 1,
        chunkData: chunk,
        chunkIndex: index,
        totalFeedChunks: feedChunks.length
      });
    });

    // 3. DAILY LOGS PAGES (Max 20 per page for safety on mobile WebView)
    const DAILY_SIZE = 20;
    let dailyChunks = [];
    if (dailyRecords.length === 0) {
      dailyChunks = [[]];
    } else {
      for (let i = 0; i < dailyRecords.length; i += DAILY_SIZE) {
        dailyChunks.push(dailyRecords.slice(i, i + DAILY_SIZE));
      }
    }

    dailyChunks.forEach((chunk, index) => {
      pageList.push({
        type: 'daily',
        isLastDailyChunk: index === dailyChunks.length - 1,
        chunkData: chunk,
        chunkIndex: index,
        totalDailyChunks: dailyChunks.length
      });
    });

    // 4. MEDICINE PAGES (Max 8 per page)
    const MEDICINE_SIZE = 8;
    let medicineChunks = [];
    if (medicines.length === 0) {
      medicineChunks = [[]];
    } else {
      for (let i = 0; i < medicines.length; i += MEDICINE_SIZE) {
        medicineChunks.push(medicines.slice(i, i + MEDICINE_SIZE));
      }
    }

    medicineChunks.forEach((chunk, index) => {
      pageList.push({
        type: 'medicines',
        isLastMedicineChunk: index === medicineChunks.length - 1,
        chunkData: chunk,
        chunkIndex: index,
        totalMedicineChunks: medicineChunks.length
      });
    });

    return pageList;
  };

  const pages = buildPages();
  const totalPages = pages.length;

  const renderDocumentContent = () => (
    <div
      id="batch-invoice-document"
      style={{ width: '800px', boxSizing: 'border-box' }}
      className="font-sans space-y-8"
    >
      {pages.map((page, pageIdx) => {
        const pageNumber = pageIdx + 1;

        return (
          <div
            key={pageIdx}
            className="batch-report-page border rounded-2xl shadow-sm font-sans print:p-0 print:border-none print:shadow-none"
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderColor: '#cbd5e1',
              width: '800px',
              boxSizing: 'border-box',
              height: '1086px',
              maxHeight: '1086px',
              overflow: 'hidden',
              padding: '28px 36px',
              display: 'flex',
              flexDirection: 'column',
              justify: 'flex-start',
              breakBefore: pageIdx > 0 ? 'page' : 'auto',
              pageBreakBefore: pageIdx > 0 ? 'always' : 'auto'
            }}
          >
            {/* MAIN CONTENT AREA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
              {/* PAGE HEADER */}
              {page.isFirstPageOfBatch ? (
                /* Full Brand Header on Page 1 */
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img
                        src={KG_LOGO_BASE64 || "/kg-logo.jpg"}
                        alt="KG Poultry Logo"
                        style={{ height: '52px', width: '52px', borderRadius: '9999px', objectFit: 'contain', border: '2px solid #0f172a', padding: '2px' }}
                      />
                      <div>
                        <h1 style={{ color: '#0f172a', fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em', textTransform: 'uppercase', margin: 0 }}>
                          KG POULTRY FARMS
                        </h1>
                        <p style={{ color: '#334155', fontSize: '12px', fontWeight: '700', margin: '2px 0 0 0' }}>
                          Authorized Farmer: {assignedFarmer}
                        </p>
                        <p style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', margin: '2px 0 0 0' }}>
                          Phone: 9080691947 • Email: kgpoultryfarms@gmail.com
                        </p>
                      </div>
                    </div>

                    <div
                      style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '14px', textAlign: 'right', flexShrink: 0 }}
                    >
                      <div style={{ color: '#475569', fontSize: '10px', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.05em' }}>
                        OFFICIAL BATCH REPORT • PAGE {pageNumber} OF {totalPages}
                      </div>
                      <div style={{ color: '#0f172a', fontSize: '18px', fontWeight: '900', letterSpacing: '-0.02em', margin: '2px 0 0 0' }}>
                        {batchName}
                      </div>
                      <div style={{ color: '#475569', fontSize: '12px', fontWeight: '700', margin: '2px 0 0 0' }}>
                        Status: <span style={{ color: '#0f172a', fontWeight: '800' }}>{b.status || 'Completed'}</span> • Date: {invDate}
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#0f172a', height: '2px', width: '100%', borderRadius: '9999px', margin: '12px 0' }}></div>

                  {/* Batch Details & Performance Metrics Summary Box (Page 1 Only) */}
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '14px 18px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        HATCHERY & BATCH DETAILS (ID: {batchIdCode})
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', fontSize: '11px' }}>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>Hatchery / Source</div>
                          <div style={{ color: '#0f172a', fontWeight: '900' }}>{chickSupplierName}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>Placement Date</div>
                          <div style={{ color: '#0f172a', fontWeight: '800' }}>{arrivalDate}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>Transport Vehicle</div>
                          <div style={{ color: '#0f172a', fontWeight: '800' }}>{vehicleNo}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>Driver Name</div>
                          <div style={{ color: '#0f172a', fontWeight: '800' }}>{driverName}</div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>Audit Status</div>
                          <div style={{ color: '#0f172a', fontWeight: '900' }}>Verified & Complete ✓</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '1px solid #cbd5e1', paddingLeft: '16px' }}>
                      <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        BATCH PERFORMANCE METRICS
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', fontSize: '11px' }}>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>Initial Chicks Placed</div>
                          <div style={{ color: '#0f172a', fontWeight: '900' }}>{initialChicks.toLocaleString()} birds</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>Total Live Birds</div>
                          <div style={{ color: '#0f172a', fontWeight: '900' }}>{harvestedOrLiveBirds.toLocaleString()} birds ({liveRate}%)</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>Total Mortality</div>
                          <div style={{ color: '#0f172a', fontWeight: '800' }}>{totalMortality} birds ({mortalityRate}%)</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>Feed Consumed</div>
                          <div style={{ color: '#0f172a', fontWeight: '800' }}>{feedBags} Bags ({feedKg.toFixed(0)} kg)</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>Total Net Weight Sold</div>
                          <div style={{ color: '#0f172a', fontWeight: '900' }}>{totalNetWeight.toFixed(1)} kg ({totalBirdsDispatched} birds)</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>Average Bird Weight</div>
                          <div style={{ color: '#0f172a', fontWeight: '900' }}>{avgBirdWeight} kg/bird ({avgBirdWeightGrams} g)</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>Final FCR (Feed Ratio)</div>
                          <div style={{ color: '#0f172a', fontWeight: '900' }}>{finalFCR}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* PAGE BODY CONTENT BY TYPE */}
              {page.type === 'traders' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: page.isFirstPageOfBatch ? '8px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 className="h-4 w-4" style={{ color: '#0f172a' }} />
                    <span style={{ color: '#0f172a', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      TRADER SALES & DISPATCHES SUMMARY TABLE {page.chunkIndex > 0 ? `(PART ${page.chunkIndex + 1})` : ''}
                    </span>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', height: 'fit-content' }}>
                    <table className="w-full text-left text-xs">
                      <thead style={{ backgroundColor: '#f8fafc', color: '#334155' }} className="font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-300">
                        <tr>
                          <th className="py-2.5 px-3">TRADER / SHOP NAME</th>
                          <th className="py-2.5 px-3 text-center">DISPATCHES</th>
                          <th className="py-2.5 px-3 text-right">BIRDS DISPATCHED</th>
                          <th className="py-2.5 px-3 text-right">TOTAL NET WEIGHT (KG)</th>
                          <th className="py-2.5 px-3 text-right">AVG WEIGHT / BIRD</th>
                          <th className="py-2.5 px-3 text-right">TOTAL CRATES</th>
                        </tr>
                      </thead>
                      <tbody style={{ color: '#1e293b' }} className="divide-y divide-slate-200 font-semibold text-[11px]">
                        {page.chunkData.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-3 px-3 text-center text-slate-400 font-medium italic">
                              No trader sales recorded for this batch.
                            </td>
                          </tr>
                        ) : (
                          page.chunkData.map((td, idx) => {
                            const birds = Number(td.totalBirds || 0);
                            const wt = Number(td.totalWeight || 0);
                            const avg = birds > 0 ? (wt / birds).toFixed(3) : '0.000';
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td style={{ color: '#0f172a' }} className="py-2.5 px-3 font-extrabold">{td.traderName}</td>
                                <td className="py-2.5 px-3 text-center font-bold">{td.dispatchCount}</td>
                                <td className="py-2.5 px-3 text-right font-extrabold">{birds.toLocaleString()} birds</td>
                                <td style={{ color: '#0f172a' }} className="py-2.5 px-3 text-right font-black">{wt.toFixed(1)} kg</td>
                                <td style={{ color: '#1e293b' }} className="py-2.5 px-3 text-right font-bold">{avg} kg</td>
                                <td style={{ color: '#334155' }} className="py-2.5 px-3 text-right">{td.totalCrates} Boxes</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {page.isLastTraderChunk && (
                        <tfoot style={{ backgroundColor: '#ffffff', color: '#0f172a' }} className="font-extrabold border-t-2 border-slate-900 text-[11px]">
                          <tr>
                            <td style={{ color: '#0f172a' }} className="py-3 px-3 font-black uppercase">GRAND TOTAL SUMMARY</td>
                            <td className="py-3 px-3 text-center font-black">{dispatches.length}</td>
                            <td style={{ color: '#0f172a' }} className="py-3 px-3 text-right font-black">{totalBirdsDispatched.toLocaleString()} birds</td>
                            <td style={{ color: '#0f172a' }} className="py-3 px-3 text-right font-black text-xs">{totalNetWeight.toFixed(1)} kg</td>
                            <td style={{ color: '#0f172a' }} className="py-3 px-3 text-right font-black">{avgBirdWeight} kg/bird</td>
                            <td style={{ color: '#0f172a' }} className="py-3 px-3 text-right font-black">{totalCrates} Boxes</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {page.type === 'feed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '8px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck className="h-4 w-4" style={{ color: '#0f172a' }} />
                      <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        FEED STOCK LOADED & ARRIVAL LOG HISTORY {page.totalFeedChunks > 1 ? `(PART ${page.chunkIndex + 1}/${page.totalFeedChunks})` : ''}
                      </span>
                    </div>
                    <span style={{ color: '#475569', fontSize: '11px', fontWeight: '700' }}>
                      Batch: {batchName} • Total Loaded: {totalFeedLoadedBags.toFixed(1)} Bags ({totalFeedLoadedKg.toFixed(1)} kg)
                    </span>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', height: 'fit-content' }}>
                    <table className="w-full text-left text-xs">
                      <thead style={{ backgroundColor: '#f8fafc', color: '#334155' }} className="font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-300">
                        <tr>
                          <th className="py-2.5 px-3">ARRIVAL DATE</th>
                          <th className="py-2.5 px-3">FEED TYPE</th>
                          <th className="py-2.5 px-3">TRANSACTION TYPE</th>
                          <th className="py-2.5 px-3 text-right">BAGS LOADED</th>
                          <th className="py-2.5 px-3 text-right">TOTAL NET WT (KG)</th>
                          <th className="py-2.5 px-3">SUPPLIER / VEHICLE</th>
                        </tr>
                      </thead>
                      <tbody style={{ color: '#1e293b' }} className="divide-y divide-slate-200 font-semibold text-[11px]">
                        {page.chunkData.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-3 px-3 text-center text-slate-400 font-medium italic">
                              No feed stock arrivals or stock loading recorded for this batch.
                            </td>
                          </tr>
                        ) : (
                          page.chunkData.map((f, idx) => {
                            const bags = f.bagsReceived !== undefined ? Number(f.bagsReceived) : (Number(f.quantityReceived || 0) / 70);
                            const kg = f.quantityReceived !== undefined ? Number(f.quantityReceived) : (bags * 70);
                            const isReturn = f.transactionType === 'Return';

                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td style={{ color: '#0f172a' }} className="py-2 px-3 font-bold">{f.date || f.arrivalDate || arrivalDate}</td>
                                <td className="py-2 px-3 font-semibold">{f.feedType || 'Starter'}</td>
                                <td className="py-2 px-3 font-bold">{isReturn ? 'Return Feed' : 'Stock Received'}</td>
                                <td style={{ color: '#0f172a' }} className="py-2 px-3 text-right font-extrabold">{isReturn ? '-' : '+'}{bags.toFixed(1)} Bags</td>
                                <td style={{ color: '#0f172a' }} className="py-2 px-3 text-right font-extrabold">{kg.toFixed(1)} kg</td>
                                <td style={{ color: '#475569' }} className="py-2 px-3 font-medium">{f.supplier || f.supplierName || f.vehicleNumber || 'TN-38-B-9988'}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {page.isLastFeedChunk && (
                        <tfoot style={{ backgroundColor: '#ffffff', color: '#0f172a' }} className="font-extrabold border-t-2 border-slate-900 text-[11px]">
                          <tr>
                            <td colSpan="3" style={{ color: '#0f172a' }} className="py-2.5 px-3 font-black uppercase">TOTAL STOCK LOADED ARRIVALS</td>
                            <td style={{ color: '#0f172a' }} className="py-2.5 px-3 text-right font-black">{totalFeedLoadedBags.toFixed(1)} Bags</td>
                            <td style={{ color: '#0f172a' }} className="py-2.5 px-3 text-right font-black">{totalFeedLoadedKg.toFixed(1)} kg</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {page.type === 'daily' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '8px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Wheat className="h-4 w-4" style={{ color: '#0f172a' }} />
                      <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        DAILY FEED CONSUMPTION & MORTALITY LOG HISTORY {page.totalDailyChunks > 1 ? `(PART ${page.chunkIndex + 1}/${page.totalDailyChunks})` : ''}
                      </span>
                    </div>
                    <span style={{ color: '#475569', fontSize: '11px', fontWeight: '700' }}>
                      Batch: {batchName} • Total Consumed: {feedBags} Bags ({feedKg.toFixed(1)} kg)
                    </span>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', height: 'fit-content' }}>
                    <table className="w-full text-left text-xs">
                      <thead style={{ backgroundColor: '#f8fafc', color: '#334155' }} className="font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-300">
                        <tr>
                          <th className="py-2 px-3">RECORD DATE</th>
                          <th className="py-2 px-3">FEED TYPE</th>
                          <th className="py-2 px-3 text-right">FEED CONSUMED</th>
                          <th className="py-2 px-3 text-right">DAILY MORTALITY</th>
                          <th className="py-2 px-3 text-right">AVG BIRD WT</th>
                          <th className="py-2 px-3 text-right">REMAINING BIRDS</th>
                        </tr>
                      </thead>
                      <tbody style={{ color: '#1e293b' }} className="divide-y divide-slate-200 font-semibold text-[11px]">
                        {page.chunkData.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-3 px-3 text-center text-slate-400 font-medium italic">
                              No daily farm logs recorded for this batch.
                            </td>
                          </tr>
                        ) : (
                          page.chunkData.map((r, idx) => {
                            const feedKgVal = Number(r.feedConsumption || 0);
                            const feedBagsVal = feedKgVal > 0 ? (feedKgVal / 70).toFixed(1) : '0.0';
                            const mortalityVal = Number(r.mortalityCount || 0);
                            const avgGrams = r.averageWeight ? (r.averageWeight > 20 ? `${r.averageWeight} g` : `${r.averageWeight} kg`) : '—';

                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td style={{ color: '#0f172a' }} className="py-1.5 px-3 font-bold">{r.recordDate}</td>
                                <td className="py-1.5 px-3 font-semibold">{r.feedType || 'Starter'}</td>
                                <td style={{ color: '#0f172a' }} className="py-1.5 px-3 text-right font-extrabold">{feedBagsVal} Bags ({feedKgVal} kg)</td>
                                <td style={{ color: '#0f172a' }} className="py-1.5 px-3 text-right font-bold">{mortalityVal} birds</td>
                                <td style={{ color: '#334155' }} className="py-1.5 px-3 text-right font-semibold">{avgGrams}</td>
                                <td style={{ color: '#0f172a' }} className="py-1.5 px-3 text-right font-bold">{r.remainingChickCount ?? '—'}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {page.isLastDailyChunk && (
                        <tfoot style={{ backgroundColor: '#ffffff', color: '#0f172a' }} className="font-extrabold border-t-2 border-slate-900 text-[11px]">
                          <tr>
                            <td colSpan="2" style={{ color: '#0f172a' }} className="py-2.5 px-3 font-black uppercase">TOTAL FEED & MORTALITY LOGS</td>
                            <td style={{ color: '#0f172a' }} className="py-2.5 px-3 text-right font-black">{feedBags} Bags ({feedKg.toFixed(1)} kg)</td>
                            <td style={{ color: '#0f172a' }} className="py-2.5 px-3 text-right font-black">{totalMortality} birds</td>
                            <td colSpan="2" style={{ color: '#64748b' }} className="py-2.5 px-3 text-right font-semibold">Mortality Rate: {mortalityRate}%</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {page.type === 'medicines' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '8px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck className="h-4 w-4" style={{ color: '#0f172a' }} />
                      <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        MEDICINE & VACCINATION LOG HISTORY {page.totalMedicineChunks > 1 ? `(PART ${page.chunkIndex + 1}/${page.totalMedicineChunks})` : ''}
                      </span>
                    </div>
                    <span style={{ color: '#475569', fontSize: '11px', fontWeight: '700' }}>
                      Batch: {batchName} • Entries: {medicines.length}
                    </span>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', height: 'fit-content' }}>
                    <table className="w-full text-left text-xs">
                      <thead style={{ backgroundColor: '#f8fafc', color: '#334155' }} className="font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-300">
                        <tr>
                          <th className="py-2.5 px-3">DATE</th>
                          <th className="py-2.5 px-3">BIRD AGE</th>
                          <th className="py-2.5 px-3">MEDICINE / VACCINE NAME</th>
                          <th className="py-2.5 px-3">DOSAGE / QUANTITY</th>
                          <th className="py-2.5 px-3">ADMINISTERED BY</th>
                          <th className="py-2.5 px-3">CLINICAL NOTES</th>
                        </tr>
                      </thead>
                      <tbody style={{ color: '#1e293b' }} className="divide-y divide-slate-200 font-semibold text-[11px]">
                        {page.chunkData.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-3 px-3 text-center text-slate-400 font-medium italic">
                              No medicine or vaccination entries recorded for this batch.
                            </td>
                          </tr>
                        ) : (
                          page.chunkData.map((m, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td style={{ color: '#0f172a' }} className="py-2.5 px-3 font-bold">{m.date || m.createdAt?.split('T')[0] || arrivalDate}</td>
                              <td className="py-2.5 px-3 font-semibold">{m.birdAge ? `Day ${m.birdAge}` : 'Day 1'}</td>
                              <td style={{ color: '#0f172a' }} className="py-2.5 px-3 font-extrabold">{m.name || m.medicineName || 'Vaccine'}</td>
                              <td className="py-2.5 px-3 font-medium">{m.dosage || m.quantity || '100 ml'}</td>
                              <td className="py-2.5 px-3 font-medium">{m.administeredBy || 'Authorized Staff'}</td>
                              <td style={{ color: '#475569' }} className="py-2.5 px-3 italic">{m.notes || m.clinicalNotes || 'Normal'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {page.isLastMedicineChunk && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '4px' }}>
                        <div
                          style={{
                            borderColor: '#0f172a',
                            backgroundColor: '#ffffff',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '104px',
                            width: '104px',
                            borderRadius: '9999px',
                            borderWidth: '3.5px',
                            borderStyle: 'dashed',
                            padding: '6px',
                            transform: 'rotate(-2deg)'
                          }}
                        >
                          <div style={{ borderColor: '#334155', position: 'absolute', inset: '3px', borderRadius: '9999px', borderWidth: '1.5px', borderStyle: 'double' }}></div>
                          <div style={{ color: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            <ShieldCheck className="h-5 w-5 text-slate-900" />
                            <span style={{ fontSize: '7.5px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1, marginTop: '2px' }}>KG POULTRY</span>
                            <span style={{ color: '#0f172a', fontSize: '7.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '1px 0' }}>VERIFIED BATCH</span>
                            <span style={{ color: '#475569', fontSize: '6.5px', fontWeight: '700', textTransform: 'uppercase' }}>OFFICIAL SEAL</span>
                          </div>
                        </div>
                        <div style={{ color: '#0f172a', fontSize: '11px', fontWeight: '900', marginTop: '4px' }}>KG Poultry Farms Official Batch Audit</div>
                        <div style={{ color: '#64748b', fontSize: '9px', fontWeight: '600' }}>Authorized Performance & Sales Certificate</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PAGE FOOTER PINNED TO BOTTOM */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '14px',
                textAlign: 'center',
                fontSize: '9px',
                fontWeight: '500',
                color: '#94a3b8',
                width: '100%'
              }}
            >
              {page.type === 'medicines' && page.isLastMedicineChunk
                ? `Page ${pageNumber} of ${totalPages} • This official batch report is computer generated and verified by KG Poultry Farms Management System.`
                : page.type === 'traders'
                ? `Page ${pageNumber} of ${totalPages} • Official Batch Summary • KG Poultry Farms Management System`
                : page.type === 'feed'
                ? `Page ${pageNumber} of ${totalPages} • Feed Stock Arrival History • KG Poultry Farms Management System`
                : `Page ${pageNumber} of ${totalPages} • Daily Farm Log History • KG Poultry Farms Management System`}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Offscreen document template positioned at -9999px for crisp canvas rendering without blank page issue */}
      <div style={{ position: 'fixed', left: '-9999px', top: '0px', width: '800px', backgroundColor: '#ffffff', pointerEvents: 'none', zIndex: -9999 }}>
        {renderDocumentContent()}
      </div>

      {isOpen && (
        <Modal isOpen={isOpen} onClose={onClose} title="Download Batch Invoice" maxWidth="max-w-4xl">
          <div className="space-y-4">
            <div style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }} className="flex items-center justify-between p-3.5 rounded-2xl border print:hidden">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" style={{ color: '#047857' }} />
                <span className="text-xs font-black" style={{ color: '#0f172a' }}>Official Batch Invoice Export</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#334155' }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border rounded-xl hover:bg-slate-50 shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={Boolean(statusText)}
                  style={{ backgroundColor: Capacitor.isNativePlatform() ? '#0f172a' : '#047857', color: '#ffffff' }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl shadow-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {Capacitor.isNativePlatform() ? (
                    <>
                      <Share2 className="h-4 w-4 text-emerald-400" />
                      <span>
                        {statusText === 'preparing'
                          ? 'Preparing PDF...'
                          : statusText === 'opening'
                          ? 'Opening Share Menu...'
                          : statusText === 'error'
                          ? 'Unable to Share PDF'
                          : 'Share PDF Invoice'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>
                        {statusText === 'preparing'
                          ? 'Preparing PDF...'
                          : statusText === 'opening'
                          ? 'Exporting PDF...'
                          : statusText === 'error'
                          ? 'Error Exporting PDF'
                          : 'Download PDF Invoice'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {renderDocumentContent()}
          </div>
        </Modal>
      )}
    </>
  );
};
