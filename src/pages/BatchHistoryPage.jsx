import React, { useState, useEffect } from 'react';
import {
  History,
  Layers,
  Bird,
  ShieldCheck,
  AlertTriangle,
  Wheat,
  Scale,
  TrendingUp,
  Truck,
  Syringe,
  Printer,
  Calendar,
  User,
  Store,
  FileText,
  Building2,
  PackageCheck,
  ChevronRight,
  ArrowLeft,
  ArrowUpDown,
  Edit,
  Trash2,
  X,
  Download,
  Eye
} from 'lucide-react';
import { dbGetBatches, dbGetBatchHistoryData } from '../services/dbService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useLanguage } from '../context/LanguageContext';
import { Modal } from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { TraderInvoiceModal } from '../components/invoice/TraderInvoiceModal';
import { BatchReportModal, generateBatchReportPDF } from '../components/invoice/BatchReportModal';
import { FEED_CONSUMPTION_TARGETS, AVERAGE_WEIGHT_TARGETS } from '../constants/companyTargets';
import { scrollToTop } from '../utils/scroll';

const ITEMS_PER_PAGE = 10;

const scrollToDataTop = () => {
  const elem = document.getElementById('history-data-section') || document.getElementById('trader-detail-section');
  if (elem) {
    elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    scrollToTop();
  }
};

const PaginationControls = ({ currentPage, totalItems, itemsPerPage = ITEMS_PER_PAGE, onPageChange }) => {
  const { language } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  if (totalItems <= itemsPerPage) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(totalItems, currentPage * itemsPerPage);

  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage, '...', totalPages];
  };

  const pages = getPageNumbers();

  const handlePageClick = (pg) => {
    if (pg === currentPage || pg < 1 || pg > totalPages) return;
    onPageChange(pg);
    scrollToDataTop();
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 border-t border-slate-100 print:hidden text-xs w-full min-w-0 max-w-full overflow-hidden">
      {/* Entry Count Summary */}
      <div className="text-slate-500 font-semibold text-center sm:text-left min-w-0 w-full sm:w-auto">
        {language === 'ta' ? (
          <span>
            காட்டப்படுகிறது <strong className="text-slate-900 font-black">{startItem}-{endItem}</strong> (மொத்தம் <strong className="text-slate-900 font-black">{totalItems}</strong> பதிவுகள்)
          </span>
        ) : (
          <span>
            Showing <strong className="text-slate-900 font-black">{startItem}-{endItem}</strong> of <strong className="text-slate-900 font-black">{totalItems}</strong> entries
          </span>
        )}
      </div>

      {/* Pagination Page Buttons */}
      <div className="flex items-center justify-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto max-w-full pb-0.5 min-w-0 shrink-0">
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] sm:text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
        >
          {language === 'ta' ? 'முந்தையது' : 'Previous'}
        </button>

        {pages.map((pg, i) =>
          pg === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-slate-400 font-bold select-none shrink-0 text-xs">
              ...
            </span>
          ) : (
            <button
              key={pg}
              type="button"
              onClick={() => handlePageClick(pg)}
              className={`h-7 sm:h-8 min-w-[28px] sm:min-w-[32px] px-1.5 sm:px-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                currentPage === pg
                  ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-700/30'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {pg}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] sm:text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
        >
          {language === 'ta' ? 'அடுத்தது' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export const BatchHistoryPage = () => {
  const { t, language } = useLanguage();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('traders'); // 'traders', 'feed', 'medicines', 'daily'

  // Pagination states
  const [currentPageTraders, setCurrentPageTraders] = useState(1);
  const [currentPageFeed, setCurrentPageFeed] = useState(1);
  const [currentPageMedicines, setCurrentPageMedicines] = useState(1);
  const [currentPageDaily, setCurrentPageDaily] = useState(1);
  const [traderSetPages, setTraderSetPages] = useState({});
  
  // Full-page Trader Detail View state (null = main batch history list view, object = trader detail view)
  const [selectedTraderDetail, setSelectedTraderDetail] = useState(null);
  const [traderSetFilters, setTraderSetFilters] = useState({});
  const [traderSetSorts, setTraderSetSorts] = useState({});
  const [viewingDailyRecord, setViewingDailyRecord] = useState(null);

  // Download Invoice Modal state
  const [invoiceDispatch, setInvoiceDispatch] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [autoDownloadInvoice, setAutoDownloadInvoice] = useState(false);
  const [ratePerKg, setRatePerKg] = useState(135);

  // Direct Batch Report Download state
  const [downloadingBatchPDF, setDownloadingBatchPDF] = useState(false);

  const handleOpenInvoice = (disp, shouldAutoDownload = true) => {
    if (!disp) return;
    setInvoiceDispatch(disp);
    setAutoDownloadInvoice(shouldAutoDownload);
    setShowInvoiceModal(true);
  };

  const handleDirectBatchPDFDownload = async () => {
    if (!historyData) return;
    setDownloadingBatchPDF(true);
    const batchName = historyData?.batch?.batchName || historyData?.batch?.batchNumber || 'KgPoultryBatch-2';
    await generateBatchReportPDF(batchName);
    setDownloadingBatchPDF(false);
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const allBatches = await dbGetBatches();
      const sorted = [...allBatches].sort((a, b) => {
        const statusA = (a.status || '').toLowerCase();
        const statusB = (b.status || '').toLowerCase();
        if (statusA === 'active' && statusB !== 'active') return -1;
        if (statusA !== 'active' && statusB === 'active') return 1;

        const dateA = new Date(a.chickArrivalDate || a.startDate || a.createdAt || 0).getTime();
        const dateB = new Date(b.chickArrivalDate || b.startDate || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setBatches(sorted);
      // Keep selectedBatchId empty initially to show all batch cards grid
      setSelectedBatchId('');
      setHistoryData(null);
    } catch (err) {
      console.error('Failed to load batch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryForBatch = async (bId) => {
    if (!bId) {
      setHistoryData(null);
      return;
    }
    setLoading(true);
    try {
      const data = await dbGetBatchHistoryData(bId);
      setHistoryData(data);
      setSelectedTraderDetail(null); // Reset detail view when batch changes
    } catch (err) {
      console.error('Failed to load history data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPageTraders(1);
    setCurrentPageFeed(1);
    setCurrentPageMedicines(1);
    setCurrentPageDaily(1);
  }, [activeTab]);

  useEffect(() => {
    if (selectedTraderDetail || selectedBatchId) {
      scrollToTop();
    }
  }, [selectedTraderDetail, selectedBatchId]);

  const handleBatchChange = async (newBatchId) => {
    setSelectedBatchId(newBatchId);
    setSelectedTraderDetail(null);
    setCurrentPageTraders(1);
    setCurrentPageFeed(1);
    setCurrentPageMedicines(1);
    setCurrentPageDaily(1);
    scrollToTop();
    await loadHistoryForBatch(newBatchId);
  };

  const handleOpenTraderDetail = (trader) => {
    setSelectedTraderDetail(trader);
    scrollToTop();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !historyData) {
    return <LoadingSpinner fullScreen label="Loading Batch History..." />;
  }

  const batchOptions = batches.map(b => ({
    value: b.id,
    label: `${b.batchName || b.batchNumber} (${b.status || 'Active'})`
  }));

  const b = historyData?.batch || {};

  // Dispatches for selected trader in full-page detail view
  const traderDispatches = selectedTraderDetail
    ? (historyData?.dispatches || []).filter(
        d => (d.vehicleName || d.customerName || d.traderName || 'General Trader') === selectedTraderDetail.traderName
      )
    : [];

  // ==========================================
  // IN-PAGE TRADER DISPATCH & BOX SETS DETAIL VIEW
  // ==========================================
  if (selectedTraderDetail) {
    return (
      <div className="space-y-6 pb-12 print:space-y-4 print:pb-0 w-full max-w-full min-w-0 overflow-x-hidden">
        {/* Back Button & Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 print:hidden w-full min-w-0">
          <button
            onClick={() => setSelectedTraderDetail(null)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3.5 py-2.5 text-xs font-extrabold text-slate-800 transition-all active:scale-95 cursor-pointer shadow-2xs w-fit max-w-full whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>{language === 'ta' ? 'திரும்பு' : 'Back to Batch History'}</span>
          </button>

          {/* Equal Width Side-by-Side Action Buttons */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all active:scale-95 cursor-pointer w-full whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5 shrink-0" />
              <span>{language === 'ta' ? 'அச்சிடு' : 'Print Details'}</span>
            </button>

            <button
              onClick={() => handleOpenInvoice(traderDispatches[0] || historyData?.dispatches?.[0], false)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all active:scale-95 cursor-pointer w-full whitespace-nowrap"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>{language === 'ta' ? 'ரசீது' : 'Invoice'}</span>
            </button>
          </div>
        </div>

        {/* Dispatches List */}
        <div id="trader-detail-section" className="scroll-mt-20 space-y-6 w-full min-w-0">
          {traderDispatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
              {language === 'ta' ? 'இந்த வியாபாரிக்கு விவரமான அனுப்புதல் பதிவுகள் எதுவும் இல்லை.' : 'No detailed dispatches found for this trader in this batch.'}
            </div>
          ) : (
            traderDispatches.map((disp, dIdx) => {
              const sets = disp.boxSets || [];
              const loadedSets = sets.filter(s => Number(s.loadedWeight) > 0 || Number(s.totalChickenWeight) > 0);
              const totalTargetBoxes = disp.totalBoxCount || (sets.length > 0 ? sets.reduce((a, s) => a + (Number(s.boxesInSet) || 1), 0) : 30);
              const totalLoadedBoxes = loadedSets.reduce((a, s) => a + (Number(s.boxesInSet) || 1), 0);

              const totalNet = loadedSets.length > 0
                ? sets.reduce((acc, s) => acc + (Number(s.totalChickenWeight) || 0), 0)
                : (disp.totalWeight || 0);
              
              const totalChicks = loadedSets.length > 0
                ? sets.reduce((acc, s) => acc + (Number(s.chickenCount) || 0), 0)
                : (disp.birdsCount || disp.totalBirds || 0);

              const avgWt = totalChicks > 0 ? (totalNet / totalChicks).toFixed(3) : (disp.averageWeight || 0);

              const dispKey = disp.id || `disp_${dIdx}`;
              const dispFilter = traderSetFilters[dispKey] || 'all';
              const dispSort = traderSetSorts[dispKey] || 'pending_first';

              const setDispFilter = (val) => setTraderSetFilters(prev => ({ ...prev, [dispKey]: val }));
              const setDispSort = (val) => setTraderSetSorts(prev => ({ ...prev, [dispKey]: val }));

              return (
                <div key={dIdx} className="space-y-4 w-full min-w-0">
                  {/* Top Sub-Header Meta */}
                  <div className="px-1 text-xs font-bold text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1 w-full min-w-0">
                    <span>{language === 'ta' ? 'வாகன எண்:' : 'Vehicle #:'} <strong className="text-slate-900 font-black">{disp.vehicleNumber || disp.vehicleName || 'N/A'}</strong></span>
                    <span>•</span>
                    <span>{language === 'ta' ? 'ஓட்டுநர்:' : 'Driver:'} <strong className="text-slate-900 font-black">{disp.driverName || 'N/A'}</strong> {disp.driverMobileNumber ? `(${disp.driverMobileNumber})` : ''}</span>
                    <span>•</span>
                    <span>{language === 'ta' ? 'தேதி:' : 'Date:'} <strong className="text-slate-900 font-black">{disp.dispatchDate}</strong></span>
                  </div>

                  {/* Top 4 Summary Stat Cards Row */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-4 w-full min-w-0">
                    {/* Total Net Weight */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs min-w-0 overflow-hidden">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block whitespace-nowrap truncate">{language === 'ta' ? 'மொத்த நிகர எடை' : 'TOTAL NET WEIGHT'}</span>
                      <div className="mt-1 flex items-baseline gap-1 whitespace-nowrap min-w-0">
                        <span className="text-lg sm:text-2xl font-black text-slate-900 truncate">{totalNet.toFixed(1)}</span>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 shrink-0">kg</span>
                      </div>
                    </div>

                    {/* Birds Dispatched */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs min-w-0 overflow-hidden">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block whitespace-nowrap truncate">{language === 'ta' ? 'அனுப்பிய கோழிகள்' : 'BIRDS DISPATCHED'}</span>
                      <div className="mt-1 flex items-baseline gap-1 whitespace-nowrap min-w-0">
                        <span className="text-lg sm:text-2xl font-black text-emerald-800 truncate">{totalChicks}</span>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 shrink-0">{language === 'ta' ? '' : 'birds'}</span>
                      </div>
                    </div>

                    {/* Average Bird Weight */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs min-w-0 overflow-hidden">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block whitespace-nowrap truncate">{language === 'ta' ? 'சராசரி எடை' : 'AVERAGE BIRD WEIGHT'}</span>
                      <div className="mt-1 flex items-baseline gap-1 whitespace-nowrap min-w-0">
                        <span className="text-lg sm:text-2xl font-black text-emerald-700 truncate">{avgWt}</span>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 shrink-0">{language === 'ta' ? 'கி.கி/கோழி' : 'kg/bird'}</span>
                      </div>
                    </div>

                    {/* Weighed Boxes */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs min-w-0 overflow-hidden">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block whitespace-nowrap truncate">{language === 'ta' ? 'எடை பெட்டிகள்' : 'WEIGHED BOXES'}</span>
                      <div className="mt-1 flex items-baseline gap-1 whitespace-nowrap min-w-0">
                        <span className="text-base sm:text-xl font-black text-slate-900 truncate">{totalLoadedBoxes} <span className="text-slate-400 font-normal">/ {totalTargetBoxes}</span></span>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 shrink-0">{language === 'ta' ? 'பெட்டிகள்' : 'boxes'}</span>
                      </div>
                      <p className="text-[10px] font-extrabold text-emerald-600 mt-0.5 whitespace-nowrap truncate">{totalLoadedBoxes} {language === 'ta' ? 'நிறைந்தது' : 'loaded'}</p>
                    </div>
                  </div>

                  {/* Box Sets History Container */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm space-y-4 w-full min-w-0 max-w-full overflow-hidden">
                    {/* Header with Title, Subtitle, Filter Pills & Sort Dropdown */}
                    <div className="space-y-3 border-b border-slate-100 pb-3 w-full min-w-0">
                      {/* Top Row: Title & Subtitle on Left, Sort Dropdown on Right */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full min-w-0">
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 whitespace-nowrap min-w-0 truncate">
                            <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
                            <span className="truncate min-w-0">{language === 'ta' ? 'பெட்டித் தொகுதிகள் வரலாறு' : 'Box Sets History'}</span>
                          </h3>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="w-full sm:w-auto shrink-0 min-w-0">
                          <CustomSelect
                            value={dispSort}
                            onChange={(e) => setDispSort(e.target.value)}
                            icon={ArrowUpDown}
                            options={[
                              { value: 'pending_first', label: language === 'ta' ? 'வரிசை: நிலுவை முதலில்' : 'Sort: Pending First' },
                              { value: 'last_updated', label: language === 'ta' ? 'வரிசை: கடைசியாக புதுப்பிக்கப்பட்டது' : 'Sort: Last Updated' },
                              { value: 'box_asc', label: language === 'ta' ? 'வரிசை: செட் # (1 → N)' : 'Sort: Set # (1 → N)' },
                              { value: 'box_desc', label: language === 'ta' ? 'வரிசை: செட் # (N → 1)' : 'Sort: Set # (N → 1)' },
                              { value: 'boxes_count', label: language === 'ta' ? 'வரிசை: பெட்டி (அதிகம் → குறைவு)' : 'Sort: Box Count (High → Low)' },
                              { value: 'weight_desc', label: language === 'ta' ? 'வரிசை: நிகர எடை (அதிகம் → குறைவு)' : 'Sort: Net Wt (High → Low)' },
                            ]}
                          />
                        </div>
                      </div>

                      {/* Bottom Row: Full Width Segmented Filter Tabs Bar */}
                      <div className="grid grid-cols-3 gap-1 bg-slate-100/80 p-1 rounded-2xl w-full min-w-0">
                        <button
                          onClick={() => setDispFilter('all')}
                          className={`py-1.5 px-1 sm:px-3 text-xs font-extrabold rounded-xl transition-all text-center whitespace-nowrap min-w-0 truncate ${
                            dispFilter === 'all'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {language === 'ta' ? 'அனைத்தும்' : 'All'} ({sets.length})
                        </button>
                        <button
                          onClick={() => setDispFilter('pending')}
                          className={`py-1.5 px-1 sm:px-3 text-xs font-extrabold rounded-xl transition-all text-center whitespace-nowrap min-w-0 truncate ${
                            dispFilter === 'pending'
                              ? 'bg-white text-amber-800 shadow-2xs'
                              : 'text-amber-800 hover:text-amber-900'
                          }`}
                        >
                          {language === 'ta' ? 'நிலுவை' : 'Pending'} ({sets.filter(s => !s.loadedWeight || Number(s.loadedWeight) <= 0).length})
                        </button>
                        <button
                          onClick={() => setDispFilter('loaded')}
                          className={`py-1.5 px-1 sm:px-3 text-xs font-extrabold rounded-xl transition-all text-center whitespace-nowrap min-w-0 truncate ${
                            dispFilter === 'loaded'
                              ? 'bg-white text-emerald-800 shadow-2xs'
                              : 'text-emerald-800 hover:text-emerald-900'
                          }`}
                        >
                          {language === 'ta' ? 'நிறைந்தது' : 'Loaded'} ({loadedSets.length})
                        </button>
                      </div>
                    </div>

                    {(() => {
                      // Apply filtering
                      let displayedSets = [...sets];
                      if (dispFilter === 'pending') {
                        displayedSets = displayedSets.filter(s => !s.loadedWeight || Number(s.loadedWeight) <= 0);
                      } else if (dispFilter === 'loaded') {
                        displayedSets = displayedSets.filter(s => Number(s.loadedWeight) > 0);
                      }

                      // Apply sorting
                      displayedSets.sort((a, b) => {
                        const aLoaded = Number(a.loadedWeight) > 0;
                        const bLoaded = Number(b.loadedWeight) > 0;
                        const aNum = Number(a.boxSetNumber) || 0;
                        const bNum = Number(b.boxSetNumber) || 0;

                        if (dispSort === 'pending_first') {
                          if (!aLoaded && bLoaded) return -1;
                          if (aLoaded && !bLoaded) return 1;
                          return aNum - bNum;
                        }
                        if (dispSort === 'box_asc') return aNum - bNum;
                        if (dispSort === 'box_desc') return bNum - aNum;
                        if (dispSort === 'boxes_count') return (Number(b.boxesInSet) || 0) - (Number(a.boxesInSet) || 0);
                        if (dispSort === 'weight_desc') return (Number(b.totalChickenWeight) || 0) - (Number(a.totalChickenWeight) || 0);
                        return 0;
                      });

                      const currentSetPage = traderSetPages[dispKey] || 1;
                      const paginatedSets = displayedSets.slice(
                        (currentSetPage - 1) * ITEMS_PER_PAGE,
                        currentSetPage * ITEMS_PER_PAGE
                      );

                      if (displayedSets.length === 0) {
                        return (
                          <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500 font-medium">
                            {dispFilter === 'pending'
                              ? (language === 'ta' ? 'நிலுவை செட் எதுவும் இல்லை! அனைத்து பெட்டிகளுக்கும் எடை பதிவாகியுள்ளது.' : 'No pending sets! All recorded box sets have loaded weight entered.')
                              : dispFilter === 'loaded'
                              ? (language === 'ta' ? 'இன்னும் எடைகள் எதுவும் பதிவு செய்யப்படவில்லை.' : 'No loaded sets recorded yet.')
                              : (language === 'ta' 
                                  ? `இலக்கு பெட்டிகள்: ${totalTargetBoxes} பெட்டிகள் | நிகர எடை: ${totalNet.toFixed(1)} கி.கி | மொத்த கோழிகள்: ${totalChicks} கோழிகள்`
                                  : `Target Crates: ${totalTargetBoxes} boxes | Net Weight: ${totalNet.toFixed(1)} kg | Total Birds: ${totalChicks} birds`
                                )}
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* DESKTOP VIEW: Full Box Sets Table */}
                          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'செட் #' : 'SET #'}</th>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'நிலை' : 'STATUS'}</th>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'பெட்டிகள்' : 'BOXES IN SET'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'வெற்று எடை' : 'EMPTY BOX WT'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'நிறைந்த எடை' : 'LOADED WT'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'கோழிகள்' : 'BIRDS COUNT'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'மொத்த எடை' : 'TOTAL NET WT'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'சராசரி எடை' : 'AVG WEIGHT'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {paginatedSets.map((s, sIdx) => {
                                  const boxes = Number(s.boxesInSet) || 5;
                                  const tare = Number(s.emptyBoxWeight) || 0;
                                  const gross = Number(s.loadedWeight) || 0;
                                  const net = Number(s.totalChickenWeight) || (gross > 0 ? gross - tare : 0);
                                  const birds = Number(s.chickenCount) || 0;
                                  const setAvg = Number(s.averageChickenWeight) || (birds > 0 && net > 0 ? (net / birds).toFixed(3) : 0);
                                  const isLoaded = gross > 0;

                                  return (
                                    <tr key={sIdx} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="px-4 py-3 font-extrabold text-slate-900 whitespace-nowrap">{language === 'ta' ? 'செட்' : 'Box Set'} #{s.boxSetNumber || (sIdx + 1)}</td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap ${
                                          isLoaded ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                        }`}>
                                          {isLoaded ? (language === 'ta' ? 'நிறைந்தது ✓' : 'Loaded ✓') : (language === 'ta' ? 'எடை நிலுவை' : 'Pending Load Wt')}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{boxes} {language === 'ta' ? 'பெட்டிகள்' : 'Boxes'}</td>
                                      <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{tare > 0 ? `${tare} kg` : '—'}</td>
                                      <td className="px-4 py-3 text-right font-extrabold text-slate-900 whitespace-nowrap">{gross > 0 ? `${gross} kg` : (language === 'ta' ? 'நிலுவை' : 'Pending')}</td>
                                      <td className="px-4 py-3 text-right font-extrabold text-emerald-700 whitespace-nowrap">{birds}</td>
                                      <td className="px-4 py-3 text-right font-extrabold text-emerald-800 whitespace-nowrap">{net > 0 ? `${net.toFixed(1)} kg` : '—'}</td>
                                      <td className="px-4 py-3 text-right font-extrabold text-slate-900 whitespace-nowrap">{setAvg > 0 ? `${setAvg} kg` : '—'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* MOBILE VIEW: Exact Box Set Cards matching screenshot media_1789393362668.png */}
                          <div className="block md:hidden space-y-3">
                            {paginatedSets.map((s, sIdx) => {
                              const boxes = Number(s.boxesInSet) || 5;
                              const tare = Number(s.emptyBoxWeight) || 0;
                              const gross = Number(s.loadedWeight) || 0;
                              const net = Number(s.totalChickenWeight) || (gross > 0 ? gross - tare : 0);
                              const birds = Number(s.chickenCount) || 0;
                              const setAvg = Number(s.averageChickenWeight) || (birds > 0 && net > 0 ? (net / birds).toFixed(3) : 0);
                              const isPending = !gross || gross <= 0;

                              return (
                                <div key={sIdx} className="rounded-2xl border border-slate-200/90 bg-white p-3.5 space-y-3 shadow-2xs hover:shadow-xs transition-all w-full min-w-0">
                                  {/* Set Number & Status Badge Header */}
                                  <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-2.5 flex-wrap">
                                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                      <span className="text-xs sm:text-sm font-black text-slate-900 whitespace-nowrap">
                                        {language === 'ta' ? 'செட்' : 'Box Set'} #{s.boxSetNumber || (sIdx + 1)}
                                      </span>
                                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                        {boxes} {language === 'ta' ? 'பெட்டிகள்' : 'Boxes'}
                                      </span>
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap ${
                                        isPending ? 'bg-amber-50 text-amber-800 border-amber-200/80' : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                      }`}>
                                        {isPending ? (language === 'ta' ? 'எடை நிலுவை' : 'Pending Load Wt') : (language === 'ta' ? 'நிறைந்தது ✓' : 'Loaded ✓')}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Tare / Loaded Wt Box & Net Chicken Wt Box */}
                                  <div className="grid grid-cols-2 gap-2 text-xs w-full">
                                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/90 min-w-0">
                                      <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider mb-0.5 whitespace-nowrap truncate">{language === 'ta' ? 'வெற்று / நிறை' : 'Tare / Loaded Wt'}</span>
                                      <span className="font-extrabold text-slate-900 text-xs block whitespace-nowrap truncate">
                                        {tare > 0 ? `${tare} kg` : '—'} / {isPending ? <em className="text-amber-600 font-normal italic">{language === 'ta' ? 'நிலுவை' : 'Pending'}</em> : `${gross} kg`}
                                      </span>
                                    </div>

                                    <div className={`p-2.5 rounded-xl border min-w-0 ${isPending ? 'bg-amber-50/80 border-amber-200/60' : 'bg-emerald-50/80 border-emerald-200/60'}`}>
                                      <span className={`text-[9px] font-extrabold block uppercase tracking-wider mb-0.5 whitespace-nowrap truncate ${isPending ? 'text-amber-700' : 'text-emerald-700'}`}>
                                        {language === 'ta' ? 'நிகர எடை' : 'Net Chicken Wt'}
                                      </span>
                                      <span className={`font-black block whitespace-nowrap truncate ${isPending ? 'text-amber-900 text-xs' : 'text-emerald-900 text-xs sm:text-sm'}`}>
                                        {isPending ? (language === 'ta' ? 'கீழே அழுத்தவும்' : 'Click button below') : `${net.toFixed(1)} kg`}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Enter Loaded Weight Button or Footer Line */}
                                  {isPending ? (
                                    <button
                                      type="button"
                                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-2.5 text-xs font-bold text-white shadow-2xs hover:from-amber-700 hover:to-orange-700 transition-all active:scale-98 cursor-pointer whitespace-nowrap"
                                    >
                                      <Scale className="h-3.5 w-3.5 shrink-0" />
                                      <span>{language === 'ta' ? '+ நிறைந்த எடை பதிவு' : '+ Enter Loaded Weight'}</span>
                                    </button>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 text-slate-600 font-bold w-full">
                                      <div className="whitespace-nowrap min-w-0 truncate">
                                        <span>{language === 'ta' ? 'கோழிகள்:' : 'Birds:'} </span>
                                        <strong className="text-emerald-800 font-black">{birds}</strong>
                                      </div>
                                      <div className="text-right whitespace-nowrap min-w-0 truncate">
                                        <span>{language === 'ta' ? 'சராசரி:' : 'Avg:'} </span>
                                        <strong className="text-purple-700 font-black">{setAvg > 0 ? `${setAvg} kg/${language === 'ta' ? 'கோழி' : 'bird'}` : '—'}</strong>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <PaginationControls
                            currentPage={currentSetPage}
                            totalItems={displayedSets.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={(pg) => setTraderSetPages(prev => ({ ...prev, [dispKey]: pg }))}
                          />
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Trader Dispatch Download Invoice Modal */}
        {invoiceDispatch && (
          <TraderInvoiceModal
            isOpen={showInvoiceModal}
            onClose={() => setShowInvoiceModal(false)}
            dispatch={invoiceDispatch}
            boxSets={invoiceDispatch.boxSets || []}
            ratePerKg={ratePerKg}
            onRateChange={setRatePerKg}
            autoDownload={autoDownloadInvoice}
          />
        )}

        {historyData && (
          <BatchReportModal
            isOpen={false}
            historyData={historyData}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // MAIN BATCH HISTORY DASHBOARD VIEW
  // ==========================================
  return (
    <div className="space-y-6 pb-12 print:space-y-4 print:pb-0 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 shrink-0">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              Batch History {selectedBatchId && b?.batchName ? `(${b.batchName || b.batchNumber})` : ''}
            </h1>
          </div>
        </div>

        {selectedBatchId && (
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center shrink-0">
            <button
              onClick={() => handleBatchChange('')}
              className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2.5 px-3 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
              <span>Back to Batches</span>
            </button>

            <button
              onClick={handleDirectBatchPDFDownload}
              disabled={downloadingBatchPDF || !historyData}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 px-3.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloadingBatchPDF ? 'Downloading...' : 'Download Report'}</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner label="Refreshing batch details..." />
      ) : !historyData || !selectedBatchId ? (
        /* ==========================================
           ALL BATCH CARDS GRID VIEW
           ========================================== */
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">{t('allBatches')} ({batches.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...batches].sort((a, b) => {
              const statusA = (a.status || '').toLowerCase();
              const statusB = (b.status || '').toLowerCase();
              if (statusA === 'active' && statusB !== 'active') return -1;
              if (statusA !== 'active' && statusB === 'active') return 1;

              const dateA = new Date(a.chickArrivalDate || a.startDate || a.createdAt || 0).getTime();
              const dateB = new Date(b.chickArrivalDate || b.startDate || b.createdAt || 0).getTime();
              return dateB - dateA;
            }).map((batchItem) => {
              const bName = batchItem.batchName || batchItem.batchNumber || 'KgPoultryBatch';
              const bId = batchItem.id;
              const bStatus = batchItem.status || 'Active';

              return (
                <div
                  key={bId}
                  onClick={() => handleBatchChange(bId)}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  {/* Card Top Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {bName}
                        </h3>
                        <p className="text-xs font-semibold text-slate-400">
                          ID: <span className="font-extrabold text-slate-700">{batchItem.batchNumber || bId}</span>
                        </p>
                      </div>
                    </div>

                    <span className={`rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                      bStatus.toLowerCase() === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {bStatus.toLowerCase() === 'active' ? (language === 'ta' ? 'செயலில்' : 'ACTIVE') : (language === 'ta' ? 'முடிந்தது' : 'COMPLETED')}
                    </span>
                  </div>

                  {/* Card Meta details */}
                  <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm border-y border-slate-100 py-3 my-1 font-medium text-slate-600">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">{t('farmerLabel')}</span>
                      <strong className="text-slate-900 font-bold text-xs sm:text-sm block truncate">Ponni Authorized Farmer</strong>
                    </div>
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">{t('placementDate')}</span>
                      <strong className="text-slate-900 font-bold text-xs sm:text-sm block">{batchItem.startDate || batchItem.placementDate || batchItem.chickPlacementDate || batchItem.arrivalDate || '13/09/2026'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">{t('chickSupplier')}</span>
                      <strong className="text-slate-800 font-semibold text-xs sm:text-sm block truncate">{batchItem.chickSupplier || 'Ponni Hatcheries'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">{t('initialChicks')}</span>
                      <strong className="text-emerald-800 font-black text-xs sm:text-sm block">{(batchItem.initialChicks || batchItem.initialChickCount || 5000).toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-700 group-hover:text-emerald-700 transition-colors">
                      {t('viewBatchHistoryInvoice')}
                    </span>
                    <div className="rounded-xl bg-slate-100 group-hover:bg-emerald-700 group-hover:text-white p-2 text-slate-600 transition-all">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Printable Report Header */}
          <div className="hidden print:block border-b border-slate-300 pb-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-slate-900">KG POULTRY FARMS - BATCH HISTORY REPORT</h1>
                <p className="text-xs text-slate-600">Batch: {b.batchName || b.batchNumber} | Generated: {new Date().toLocaleDateString()}</p>
              </div>
              <img src="/kg-logo.jpg" alt="Logo" className="h-10 w-10 rounded-md object-contain" />
            </div>
          </div>

          {/* Batch Metadata Header Banner (MODERN COMPACT FARM CARD) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all border-l-4 border-l-emerald-600 print:border-slate-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    {(b.status || 'Active').toLowerCase() === 'active' ? (language === 'ta' ? 'செயலில்' : 'ACTIVE') : (language === 'ta' ? 'முடிந்தது' : 'COMPLETED')}
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    ID: {b.batchNumber || b.id}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{b.batchName || b.batchNumber}</h2>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                    <span>{language === 'ta' ? 'விவசாயி:' : 'Assigned Farmer:'}</span>
                    <strong className="text-slate-900 font-black bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {b.assignedFarmerName || 'Ponni Authorized Farmer'}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Hatchery & Supplier Info Box */}
              <div className="rounded-xl bg-slate-50/90 border border-slate-200/80 p-4 text-xs sm:text-sm space-y-2.5 min-w-[280px]">
                <div className="flex items-center justify-between font-black text-emerald-900 border-b border-slate-200/70 pb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="rounded-lg bg-emerald-100 p-1 text-emerald-800 shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="truncate whitespace-nowrap">{language === 'ta' ? 'குஞ்சு ஆதாரம் & பண்ணை' : 'Chick Source & Hatchery'}</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-black text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">{language === 'ta' ? 'உறுதியானது' : 'Verified'}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <span className="font-bold text-slate-500 whitespace-nowrap">{language === 'ta' ? 'ஆதாரம் / பண்ணை:' : 'Hatchery / Source:'}</span>
                  <span className="font-black text-slate-900 text-right truncate">{b.hatchery || b.supplierName || 'KG Hatcheries'}</span>
                  <span className="font-bold text-slate-500 whitespace-nowrap">{language === 'ta' ? 'வந்த தேதி:' : 'Arrival Date:'}</span>
                  <span className="font-black text-slate-900 text-right whitespace-nowrap">{b.chickArrivalDate || 'N/A'}</span>
                  <span className="font-bold text-slate-500 whitespace-nowrap">{language === 'ta' ? 'வாகன எண்:' : 'Transport Vehicle:'}</span>
                  <span className="font-black text-slate-900 text-right whitespace-nowrap">{b.vehicleNumber || 'N/A'}</span>
                  <span className="font-bold text-slate-500 whitespace-nowrap">{language === 'ta' ? 'ஓட்டுநர் பெயர்:' : 'Driver Name:'}</span>
                  <span className="font-black text-slate-900 text-right whitespace-nowrap">{b.driverName || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Color-Coded Summary Stat Cards Grid */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-3">
            {/* Initial Chicks */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs transition-all hover:border-emerald-300 hover:shadow-xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">{language === 'ta' ? 'மொத்த குஞ்சுகள்' : 'Total Chicks'}</span>
                <div className="rounded-xl bg-emerald-50 p-1.5 text-emerald-600 border border-emerald-100 shrink-0">
                  <Bird className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">{historyData.initialChickCount.toLocaleString()}</div>
                <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-slate-500 whitespace-nowrap truncate">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>{language === 'ta' ? 'ஆரம்ப குஞ்சுகள்' : 'Initial Placement'}</span>
                </div>
              </div>
            </div>

            {/* Final Live Birds */}
            {(() => {
              const isCompletedBatch = (b.status || '').toLowerCase() === 'completed' || (historyData.remainingChickCount === 0 && historyData.totalDispatchedBirds > 0);
              const finalBirdsCount = isCompletedBatch ? historyData.totalDispatchedBirds : historyData.remainingChickCount;
              return (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs transition-all hover:border-blue-300 hover:shadow-xs min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">{language === 'ta' ? 'மீதமுள்ளவை' : 'Final Birds'}</span>
                    <div className="rounded-xl bg-blue-50 p-1.5 text-blue-600 border border-blue-100 shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">{finalBirdsCount.toLocaleString()}</div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-xs font-extrabold text-blue-700">
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 border border-blue-100 whitespace-nowrap">
                        {(100 - parseFloat(historyData.mortalityPercentage)).toFixed(1)}% {language === 'ta' ? 'உயிருள்ளவை' : 'Live Rate'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Total Mortality */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs transition-all hover:border-rose-300 hover:shadow-xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">{language === 'ta' ? 'மொத்த இறப்பு' : 'Total Mortality'}</span>
                <div className="rounded-xl bg-rose-50 p-1.5 text-rose-600 border border-rose-100 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight whitespace-nowrap">{historyData.totalMortality.toLocaleString()}</div>
                <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-xs font-extrabold text-rose-600">
                  <span className="rounded bg-rose-50 px-1.5 py-0.5 border border-rose-100 whitespace-nowrap">
                    {historyData.mortalityPercentage}% {language === 'ta' ? 'இறப்பு விகிதம்' : 'Mortality Rate'}
                  </span>
                </div>
              </div>
            </div>

            {/* Feed Consumed */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs transition-all hover:border-amber-300 hover:shadow-xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">{language === 'ta' ? 'தீவனப் பயன்பாடு' : 'Feed Consumed'}</span>
                <div className="rounded-xl bg-amber-50 p-1.5 text-amber-600 border border-amber-100 shrink-0">
                  <Wheat className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
                  {historyData.totalFeedBags} <span className="text-xs font-bold text-slate-500">{t('bags')}</span>
                </div>
                <div className="mt-1 text-[10px] sm:text-xs font-bold text-amber-700 whitespace-nowrap truncate">
                  {historyData.totalFeedConsumedKg.toLocaleString()} kg {language === 'ta' ? 'மொத்த தீவனம்' : 'total feed'}
                </div>
              </div>
            </div>

            {/* Final Dispatched Weight */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs transition-all hover:border-purple-300 hover:shadow-xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">{language === 'ta' ? 'நிகர எடை' : 'Final Weight'}</span>
                <div className="rounded-xl bg-purple-50 p-1.5 text-purple-600 border border-purple-100 shrink-0">
                  <Scale className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
                  {historyData.totalDispatchedWeight.toLocaleString()} <span className="text-xs font-bold text-slate-500">kg</span>
                </div>
                <div className="mt-1 text-[10px] sm:text-xs font-bold text-purple-700 whitespace-nowrap truncate">
                  {historyData.totalDispatchedBirds.toLocaleString()} {language === 'ta' ? 'கோழிகள் அனுப்பப்பட்டது' : 'birds dispatched'}
                </div>
              </div>
            </div>

            {/* Avg Bird Weight */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs transition-all hover:border-emerald-300 hover:shadow-xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">{language === 'ta' ? 'சராசரி எடை' : 'Avg Bird Wt'}</span>
                <div className="rounded-xl bg-emerald-50 p-1.5 text-emerald-700 border border-emerald-100 shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight whitespace-nowrap">
                  {historyData.avgBirdWeight} <span className="text-xs font-bold text-slate-500">kg</span>
                </div>
                <div className="mt-1 text-[10px] sm:text-xs font-extrabold text-emerald-700 whitespace-nowrap truncate">
                  {historyData.avgBirdWeight > 0 ? `${(historyData.avgBirdWeight * 1000).toFixed(0)} g / ${language === 'ta' ? 'கோழி' : 'bird'}` : (language === 'ta' ? 'எடை பதிவு இல்லை' : 'No weight data')}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Pill Tabs Container */}
          <div id="history-data-section" className="scroll-mt-20 rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden print:border-none print:shadow-none">
            <div className="p-2 bg-slate-100/70 border-b border-slate-200/80 print:hidden">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('traders')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    activeTab === 'traders'
                      ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-700/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <Store className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{language === 'ta' ? 'கடை / வியாபாரி விற்பனை வரலாறு' : 'Total Birds & Weight Per Shop / Trader'}</span>
                  <span className="sm:hidden">{language === 'ta' ? 'கடைகள் / வியாபாரிகள்' : 'Shops / Traders'}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                    activeTab === 'traders' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {historyData.traderBreakdown.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('feed')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    activeTab === 'feed'
                      ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-700/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <Truck className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{language === 'ta' ? 'தீவன வரவு வரலாறு' : 'Feed Stock Loaded History'}</span>
                  <span className="sm:hidden">{language === 'ta' ? 'தீவனம்' : 'Feed Stock'}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                    activeTab === 'feed' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {historyData.feedArrivals.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('medicines')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    activeTab === 'medicines'
                      ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-700/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <Syringe className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{language === 'ta' ? 'மருந்து & தடுப்பூசி வரலாறு' : 'Medicine & Vaccination Log'}</span>
                  <span className="sm:hidden">{language === 'ta' ? 'மருந்துகள்' : 'Medicines'}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                    activeTab === 'medicines' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {historyData.medicineRecords.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('daily')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    activeTab === 'daily'
                      ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-700/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{language === 'ta' ? 'தினசரி வளர்ச்சி & இறப்புப் பதிவு' : 'Daily Growth & Mortality Log'}</span>
                  <span className="sm:hidden">{language === 'ta' ? 'தினசரிப் பதிவு' : 'Daily Logs'}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                    activeTab === 'daily' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {historyData.dailyRecords.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Sliced Data Arrays for Pagination */}
            {(() => {
              const paginatedTraders = (historyData.traderBreakdown || []).slice(
                (currentPageTraders - 1) * ITEMS_PER_PAGE,
                currentPageTraders * ITEMS_PER_PAGE
              );
              const paginatedFeed = (historyData.feedArrivals || []).slice(
                (currentPageFeed - 1) * ITEMS_PER_PAGE,
                currentPageFeed * ITEMS_PER_PAGE
              );
              const paginatedMedicines = (historyData.medicineRecords || []).slice(
                (currentPageMedicines - 1) * ITEMS_PER_PAGE,
                currentPageMedicines * ITEMS_PER_PAGE
              );
              const paginatedDaily = (historyData.dailyRecords || []).slice(
                (currentPageDaily - 1) * ITEMS_PER_PAGE,
                currentPageDaily * ITEMS_PER_PAGE
              );

              return (
                <>
                  {/* Tab 1: Traders & Shop Dispatch Breakdown */}
                  {(activeTab === 'traders' || true) && (
                    <div className={activeTab === 'traders' ? 'p-4 sm:p-6 space-y-4' : 'hidden print:block p-4 sm:p-6 space-y-4'}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                        <div className="flex items-center gap-2">
                          <Store className="h-5 w-5 text-emerald-700 shrink-0" />
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 whitespace-nowrap">{language === 'ta' ? 'கடை / வியாபாரி விற்பனை வரலாறு' : 'Per Shop / Trader Dispatch History'}</h3>
                        </div>
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 whitespace-nowrap">
                          {language === 'ta' ? 'விவரங்களை பார்க்க வியாபாரியை தொடவும்' : 'Click any trader to view detailed box set records'}
                        </span>
                      </div>

                      {historyData.traderBreakdown.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                          {language === 'ta' ? 'இந்த தொகுதிக்கு விற்பனை பதிவுகள் எதுவும் இல்லை.' : 'No dispatches recorded for this batch yet.'}
                        </div>
                      ) : (
                        <>
                          {/* DESKTOP VIEW TABLE */}
                          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'வியாபாரி / கடை பெயர்' : 'Trader / Shop Name'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'அனுப்புதல்கள்' : 'Dispatches'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'மொத்த கோழிகள்' : 'Total Birds Given'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'மொத்த எடை (கி.கி)' : 'Total Weight (Kg)'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'சராசரி எடை' : 'Avg Weight / Bird'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'பெட்டிகள்' : 'Total Crates'}</th>
                                  <th className="px-4 py-3 text-center print:hidden whitespace-nowrap">{language === 'ta' ? 'செயல்' : 'Action'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {paginatedTraders.map((t, idx) => (
                                  <tr
                                    key={idx}
                                    onClick={() => handleOpenTraderDetail(t)}
                                    className="hover:bg-emerald-50/70 cursor-pointer transition-colors group"
                                    title={language === 'ta' ? 'முழுமையான பெட்டிகள் விவரங்களை பார்க்க கிளிக் செய்க' : 'Click to view complete box & set breakdown'}
                                  >
                                    <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                                      <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                                        {t.traderName.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="group-hover:text-emerald-800 font-black truncate">{t.traderName}</span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-semibold text-slate-600 whitespace-nowrap">{t.dispatchCount}</td>
                                    <td className="px-4 py-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">{t.totalBirds.toLocaleString()}{language === 'ta' ? '' : ' birds'}</td>
                                    <td className="px-4 py-3.5 text-right font-black text-emerald-800 whitespace-nowrap">{t.totalWeight.toLocaleString()} kg</td>
                                    <td className="px-4 py-3.5 text-right font-extrabold text-purple-700 whitespace-nowrap">{t.avgWeight} kg</td>
                                    <td className="px-4 py-3.5 text-right font-semibold text-slate-600 whitespace-nowrap">{t.totalCrates}</td>
                                    <td className="px-4 py-3.5 text-center print:hidden whitespace-nowrap">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const traderDisp = (historyData.dispatches || []).find(
                                              d => (d.vehicleName || d.customerName || d.traderName || 'General Trader') === t.traderName
                                            );
                                            if (traderDisp) handleOpenInvoice(traderDisp);
                                          }}
                                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 hover:bg-emerald-600 hover:text-white px-2.5 py-1 text-[11px] font-extrabold text-emerald-900 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                                          title="Download Invoice PDF"
                                        >
                                          <FileText className="h-3.5 w-3.5 shrink-0" />
                                          <span>{language === 'ta' ? 'ரசீது' : 'Invoice'}</span>
                                        </button>

                                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors whitespace-nowrap">
                                          <span>{language === 'ta' ? 'பெட்டிகள் பார்' : 'View Sets'}</span>
                                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                <tr>
                                  <td className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'மொத்த சுருக்கம்' : 'Total / Grand Summary'}</td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">{historyData.dispatches.length}</td>
                                  <td className="px-4 py-3 text-right text-emerald-900 whitespace-nowrap">{historyData.totalDispatchedBirds.toLocaleString()}{language === 'ta' ? '' : ' birds'}</td>
                                  <td className="px-4 py-3 text-right text-emerald-900 whitespace-nowrap">{historyData.totalDispatchedWeight.toLocaleString()} kg</td>
                                  <td className="px-4 py-3 text-right text-purple-900 whitespace-nowrap">
                                    {historyData.totalDispatchedBirds > 0
                                      ? `${(historyData.totalDispatchedWeight / historyData.totalDispatchedBirds).toFixed(3)} kg`
                                      : `${historyData.avgBirdWeight} kg`}
                                  </td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">{historyData.totalCratesCount}</td>
                                  <td className="px-4 py-3 text-center print:hidden whitespace-nowrap">—</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* MOBILE VIEW CARDS DESIGN */}
                          <div className="block md:hidden space-y-3">
                            {paginatedTraders.map((t, idx) => (
                              <div
                                key={idx}
                                onClick={() => handleOpenTraderDetail(t)}
                                className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs hover:border-emerald-400 active:scale-98 transition-all cursor-pointer"
                              >
                                {/* Top Action Bar with Invoice & View Sets Buttons */}
                                <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-2.5">
                                  <span className="rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 whitespace-nowrap min-w-0 truncate shrink">
                                    {t.dispatchCount} {language === 'ta' ? 'அனுப்புதல்' : 'Dispatch'}{t.dispatchCount > 1 && language !== 'ta' ? 'es' : ''} • {t.totalCrates} {language === 'ta' ? 'பெட்டிகள்' : 'boxes'}
                                  </span>

                                  <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const traderDisp = (historyData.dispatches || []).find(
                                          d => (d.vehicleName || d.customerName || d.traderName || 'General Trader') === t.traderName
                                        );
                                        if (traderDisp) handleOpenInvoice(traderDisp);
                                      }}
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 px-2 py-1 text-[10px] sm:text-[11px] font-extrabold text-emerald-900 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                                    >
                                      <FileText className="h-3 w-3 shrink-0 text-emerald-700" />
                                      <span className="whitespace-nowrap">{language === 'ta' ? 'ரசீது' : 'Invoice'}</span>
                                    </button>
                                    <span className="inline-flex items-center gap-0.5 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] sm:text-[11px] font-extrabold text-emerald-700 whitespace-nowrap shrink-0">
                                      <span className="whitespace-nowrap">{language === 'ta' ? 'செட் பார்' : 'View Sets'}</span>
                                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                    </span>
                                  </div>
                                </div>

                                {/* Trader Name Below Buttons */}
                                <div className="flex items-center gap-2.5 py-0.5">
                                  <div className="h-8.5 w-8.5 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                                    {t.traderName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-black text-slate-900 text-sm leading-snug break-words" title={t.traderName}>
                                      {t.traderName}
                                    </h4>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 min-w-0">
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block whitespace-nowrap truncate">{language === 'ta' ? 'மொத்த கோழிகள்' : 'TOTAL BIRDS GIVEN'}</span>
                                    <span className="font-black text-slate-900 text-xs mt-0.5 block whitespace-nowrap truncate">{t.totalBirds.toLocaleString()}{language === 'ta' ? '' : ' birds'}</span>
                                  </div>

                                  <div className="rounded-xl bg-emerald-50/80 p-2.5 border border-emerald-100 min-w-0">
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 block whitespace-nowrap truncate">{language === 'ta' ? 'மொத்த எடை' : 'TOTAL WEIGHT'}</span>
                                    <span className="font-black text-emerald-800 text-xs mt-0.5 block whitespace-nowrap truncate">{t.totalWeight.toLocaleString()} kg</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] sm:text-xs font-bold text-slate-600">
                                  <div className="truncate whitespace-nowrap min-w-0">
                                    <span>{language === 'ta' ? 'சராசரி:' : 'Avg Wt:'} </span>
                                    <strong className="text-purple-700 font-black">{t.avgWeight} kg/{language === 'ta' ? 'கோழி' : 'bird'}</strong>
                                  </div>
                                  <div className="text-right truncate whitespace-nowrap min-w-0">
                                    <span>{language === 'ta' ? 'பெட்டிகள்:' : 'Crates:'} </span>
                                    <strong className="text-slate-900 font-black">{t.totalCrates} {language === 'ta' ? 'பெட்டிகள்' : 'boxes'}</strong>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <PaginationControls
                            currentPage={currentPageTraders}
                            totalItems={historyData.traderBreakdown.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPageTraders}
                          />
                        </>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Feed Stock Loaded & Arrival History */}
                  {activeTab === 'feed' && (
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="h-5 w-5 text-emerald-700 shrink-0" />
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 whitespace-nowrap">{language === 'ta' ? 'தீவன வரவு & பதிவு வரலாறு' : 'Feed Stock Loaded & Arrival History'}</h3>
                        </div>
                      </div>

                      {historyData.feedArrivals.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                          {language === 'ta' ? 'இந்த தொகுதிக்கு தீவன வரவு பதிவுகள் எதுவும் இல்லை.' : 'No feed stock loaded or arrival entries logged for this batch.'}
                        </div>
                      ) : (
                        <>
                          {/* DESKTOP VIEW TABLE */}
                          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'தீவன வகை' : 'Feed Type'}</th>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'பரிவர்த்தனை' : 'Transaction'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'பைகள்' : 'Bags'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'கூடுதல் கி.கி' : 'Extra Kg'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'மொத்த எடை' : 'Total Net Wt'}</th>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'வாகனம் / ஓட்டுநர்' : 'Vehicle / Driver'}</th>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'குறிப்புகள்' : 'Remarks / Notes'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {paginatedFeed.map((f, idx) => {
                                  const dateStr = f.date || f.createdAt?.split('T')[0] || 'N/A';
                                  const rawFeedType = f.feedType || 'Feed';
                                  const feedTypeStr = language === 'ta'
                                    ? (rawFeedType.toLowerCase().includes('pre') ? 'ப்ரீ-ஸ்டார்ட்டர்' : rawFeedType.toLowerCase().includes('start') ? 'ஸ்டார்ட்டர்' : rawFeedType.toLowerCase().includes('finish') ? 'பினிஷர்' : rawFeedType)
                                    : rawFeedType;
                                  const isReturn = (f.transactionType || '').toLowerCase() === 'return';
                                  const bags = Number(f.bagsReceived || f.quantityBags || 0);
                                  const extraKg = Number(f.additionalKg || 0);
                                  const totalKg = Number(f.quantityReceivedKg || f.quantityReceived || (bags * 70 + extraKg));
                                  const vehicleStr = f.vehicleNumber || f.driverName ? `${f.vehicleNumber || ''} ${f.driverName ? `(${f.driverName})` : ''}`.trim() : '—';
                                  const notesStr = f.notes || f.remarks || '—';

                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{dateStr}</td>
                                      <td className="px-4 py-3 font-black text-emerald-900 whitespace-nowrap">{feedTypeStr}</td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap ${
                                          isReturn ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                          {isReturn ? (language === 'ta' ? 'திருப்புதல் (-)' : 'Return (-)') : (language === 'ta' ? 'வரவு (+)' : 'Received (+)')}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-right font-extrabold text-slate-900 whitespace-nowrap">{bags} {language === 'ta' ? 'பைகள்' : 'bags'}</td>
                                      <td className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">{extraKg > 0 ? `${extraKg} kg` : '—'}</td>
                                      <td className="px-4 py-3 text-right font-black text-emerald-800 whitespace-nowrap">{totalKg.toLocaleString()} kg</td>
                                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{vehicleStr}</td>
                                      <td className="px-4 py-3 text-slate-500 italic whitespace-nowrap">{notesStr}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* MOBILE VIEW CARDS DESIGN */}
                          <div className="block md:hidden space-y-3">
                            {paginatedFeed.map((f, idx) => {
                              const dateStr = f.date || f.createdAt?.split('T')[0] || 'N/A';
                              const rawFeedType = f.feedType || 'Feed';
                              const feedTypeStr = language === 'ta'
                                ? (rawFeedType.toLowerCase().includes('pre') ? 'ப்ரீ-ஸ்டார்ட்டர்' : rawFeedType.toLowerCase().includes('start') ? 'ஸ்டார்ட்டர்' : rawFeedType.toLowerCase().includes('finish') ? 'பினிஷர்' : rawFeedType)
                                : rawFeedType;
                              const isReturn = (f.transactionType || '').toLowerCase() === 'return';
                              const bags = Number(f.bagsReceived || f.quantityBags || 0);
                              const extraKg = Number(f.additionalKg || 0);
                              const totalKg = Number(f.quantityReceivedKg || f.quantityReceived || (bags * 70 + extraKg));
                              const vehicleStr = f.vehicleNumber || f.driverName ? `${f.vehicleNumber || ''} ${f.driverName ? `(${f.driverName})` : ''}`.trim() : '—';
                              const notesStr = f.notes || f.remarks || '—';

                              return (
                                <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Truck className="h-4 w-4 text-emerald-600 shrink-0" />
                                      <span className="font-extrabold text-xs text-slate-900 whitespace-nowrap">{dateStr}</span>
                                    </div>
                                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap ${
                                      isReturn ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {isReturn ? (language === 'ta' ? 'திருப்புதல் (-)' : 'Return (-)') : (language === 'ta' ? 'வரவு (+)' : 'Received (+)')}
                                    </span>
                                  </div>

                                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1.5">
                                    <div className="flex items-center justify-between whitespace-nowrap">
                                      <span className="text-xs font-black text-emerald-900">{feedTypeStr}</span>
                                      <span className="text-xs font-black text-slate-900">{bags} {language === 'ta' ? 'பைகள்' : 'bags'} ({totalKg} kg)</span>
                                    </div>
                                    {extraKg > 0 && (
                                      <div className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">{language === 'ta' ? `${extraKg} கி.கி தனித் தீவனம் உட்பட` : `Includes ${extraKg} kg loose feed`}</div>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 whitespace-nowrap">
                                    <span>{language === 'ta' ? 'வாகனம்/ஓட்டுநர்:' : 'Vehicle/Driver:'} <strong className="text-slate-800 font-bold">{vehicleStr}</strong></span>
                                    {notesStr !== '—' && <span className="italic text-slate-400">{notesStr}</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <PaginationControls
                            currentPage={currentPageFeed}
                            totalItems={historyData.feedArrivals.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPageFeed}
                          />
                        </>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Medicine & Vaccination Log */}
                  {activeTab === 'medicines' && (
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Syringe className="h-5 w-5 text-emerald-700 shrink-0" />
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 whitespace-nowrap">{language === 'ta' ? 'மருந்து & தடுப்பூசி வரலாறு' : 'Medicine & Vaccine Log History'}</h3>
                        </div>
                      </div>

                      {historyData.medicineRecords.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                          {language === 'ta' ? 'இந்த தொகுதிக்கு மருந்து அல்லது தடுப்பூசி பதிவுகள் எதுவும் இல்லை.' : 'No medicine or vaccination entries logged for this batch.'}
                        </div>
                      ) : (
                        <>
                          {/* DESKTOP VIEW TABLE */}
                          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'கோழி வயது' : 'Bird Age'}</th>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'மருந்து / தடுப்பூசி பெயர்' : 'Medicine / Vaccine Name'}</th>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'அளவு / டோஸ்' : 'Dosage / Quantity'}</th>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'அளித்தவர்' : 'Administered By'}</th>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'மருத்துவக் குறிப்புகள்' : 'Clinical Notes'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {paginatedMedicines.map((m, idx) => {
                                  const dateStr = m.date || m.createdAt?.split('T')[0] || 'N/A';
                                  
                                  let birdAgeStr = '—';
                                  if (m.birdAge) {
                                    birdAgeStr = language === 'ta' ? `நாள் ${m.birdAge}` : `Day ${m.birdAge}`;
                                  } else if (b.chickArrivalDate && dateStr !== 'N/A') {
                                    const d1 = new Date(b.chickArrivalDate);
                                    const d2 = new Date(dateStr);
                                    const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
                                    if (!isNaN(diffDays) && diffDays >= 0) {
                                      birdAgeStr = language === 'ta' ? `நாள் ${diffDays}` : `Day ${diffDays}`;
                                    }
                                  }

                                  let medNameStr = '—';
                                  if (Array.isArray(m.vaccines) && m.vaccines.length > 0) {
                                    medNameStr = m.vaccines.map(v => v.name).filter(Boolean).join(', ');
                                  }
                                  if (!medNameStr || medNameStr === '—') {
                                    medNameStr = m.medicineName || m.vaccineName || m.name || m.reason || (language === 'ta' ? 'மருத்துவப் பதிவு' : 'Medication Log');
                                  }

                                  let dosageStr = '—';
                                  if (Array.isArray(m.vaccines) && m.vaccines.length > 0) {
                                    const dList = m.vaccines
                                      .map(v => `${v.quantity || ''} ${v.unit || ''}`.trim())
                                      .filter(Boolean);
                                    if (dList.length > 0) dosageStr = dList.join(', ');
                                  }
                                  if (dosageStr === '—' && (m.quantity || m.dosage)) {
                                    dosageStr = `${m.quantity || m.dosage || ''} ${m.unit || ''}`.trim();
                                  }

                                  let adminStr = '—';
                                  if (Array.isArray(m.vaccinatorNames) && m.vaccinatorNames.length > 0) {
                                    adminStr = m.vaccinatorNames.filter(Boolean).join(', ');
                                  }
                                  if (adminStr === '—' && (m.administeredBy || m.vaccinatorName)) {
                                    adminStr = m.administeredBy || m.vaccinatorName;
                                  }

                                  const notesStr = m.reason || m.notes || m.remarks || '—';

                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{dateStr}</td>
                                      <td className="px-4 py-3 font-extrabold text-slate-600 whitespace-nowrap">{birdAgeStr}</td>
                                      <td className="px-4 py-3 font-black text-emerald-900 whitespace-nowrap">{medNameStr}</td>
                                      <td className="px-4 py-3 font-extrabold text-slate-800 whitespace-nowrap">{dosageStr}</td>
                                      <td className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">{adminStr}</td>
                                      <td className="px-4 py-3 text-slate-500 italic whitespace-nowrap">{notesStr}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* MOBILE VIEW CARDS DESIGN */}
                          <div className="block md:hidden space-y-3">
                            {paginatedMedicines.map((m, idx) => {
                              const dateStr = m.date || m.createdAt?.split('T')[0] || 'N/A';
                              
                              let birdAgeStr = '—';
                              if (m.birdAge) {
                                birdAgeStr = language === 'ta' ? `நாள் ${m.birdAge}` : `Day ${m.birdAge}`;
                              } else if (b.chickArrivalDate && dateStr !== 'N/A') {
                                const d1 = new Date(b.chickArrivalDate);
                                const d2 = new Date(dateStr);
                                const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
                                if (!isNaN(diffDays) && diffDays >= 0) {
                                  birdAgeStr = language === 'ta' ? `நாள் ${diffDays}` : `Day ${diffDays}`;
                                }
                              }

                              let medNameStr = '—';
                              if (Array.isArray(m.vaccines) && m.vaccines.length > 0) {
                                medNameStr = m.vaccines.map(v => v.name).filter(Boolean).join(', ');
                              }
                              if (!medNameStr || medNameStr === '—') {
                                medNameStr = m.medicineName || m.vaccineName || m.name || m.reason || (language === 'ta' ? 'மருத்துவப் பதிவு' : 'Medication Log');
                              }

                              let dosageStr = '—';
                              if (Array.isArray(m.vaccines) && m.vaccines.length > 0) {
                                const dList = m.vaccines
                                  .map(v => `${v.quantity || ''} ${v.unit || ''}`.trim())
                                  .filter(Boolean);
                                if (dList.length > 0) dosageStr = dList.join(', ');
                              }
                              if (dosageStr === '—' && (m.quantity || m.dosage)) {
                                dosageStr = `${m.quantity || m.dosage || ''} ${m.unit || ''}`.trim();
                              }

                              let adminStr = '—';
                              if (Array.isArray(m.vaccinatorNames) && m.vaccinatorNames.length > 0) {
                                adminStr = m.vaccinatorNames.filter(Boolean).join(', ');
                              }
                              if (adminStr === '—' && (m.administeredBy || m.vaccinatorName)) {
                                adminStr = m.administeredBy || m.vaccinatorName;
                              }

                              const notesStr = m.reason || m.notes || m.remarks || '—';

                              return (
                                <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Syringe className="h-4 w-4 text-emerald-600 shrink-0" />
                                      <span className="font-extrabold text-xs text-slate-900 whitespace-nowrap">{dateStr}</span>
                                    </div>
                                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 whitespace-nowrap">
                                      {birdAgeStr}
                                    </span>
                                  </div>

                                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1">
                                    <div className="text-xs font-black text-emerald-900 break-words">{medNameStr}</div>
                                    <div className="text-xs font-semibold text-slate-700 whitespace-nowrap">{language === 'ta' ? 'அளவு:' : 'Dosage:'} <span className="text-slate-900 font-black">{dosageStr}</span></div>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 whitespace-nowrap">
                                    <span>{language === 'ta' ? 'அளித்தவர்:' : 'Admin By:'} <strong className="text-slate-800 font-extrabold">{adminStr}</strong></span>
                                    {notesStr !== '—' && <span className="italic text-slate-400">{notesStr}</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <PaginationControls
                            currentPage={currentPageMedicines}
                            totalItems={historyData.medicineRecords.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPageMedicines}
                          />
                        </>
                      )}
                    </div>
                  )}

                  {/* Tab 4: Daily Growth & Mortality Log */}
                  {activeTab === 'daily' && (
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-emerald-700 shrink-0" />
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 whitespace-nowrap">{language === 'ta' ? 'தினசரி பண்ணைப் பதிவு வரலாறு' : 'Daily Farm Log History'}</h3>
                        </div>
                      </div>

                      {historyData.dailyRecords.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                          {language === 'ta' ? 'இந்த தொகுதிக்கு தினசரி பதிவுகள் எதுவும் இல்லை.' : 'No daily records logged for this batch yet.'}
                        </div>
                      ) : (
                        <>
                          {/* DESKTOP VIEW TABLE */}
                          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'இறப்பு எண்ணிக்கை' : 'Mortality Count'}</th>
                                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ta' ? 'தீவன வகை' : 'Feed Type'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'தீவனம் (கி.கி)' : 'Feed Consumed (Kg)'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'சராசரி எடை (கிராம்)' : 'Average Wt (Grams)'}</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">{language === 'ta' ? 'மீதமுள்ள கோழிகள்' : 'Live Birds Left'}</th>
                                  <th className="px-4 py-3 text-center whitespace-nowrap">{language === 'ta' ? 'செயல்' : 'Action'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {paginatedDaily.map((r, idx) => {
                                  const rawFeedType = r.feedType || 'Pre-Starter';
                                  const feedTypeStr = language === 'ta'
                                    ? (rawFeedType.toLowerCase().includes('pre') ? 'ப்ரீ-ஸ்டார்ட்டர்' : rawFeedType.toLowerCase().includes('start') ? 'ஸ்டார்ட்டர்' : rawFeedType.toLowerCase().includes('finish') ? 'பினிஷர்' : rawFeedType)
                                    : rawFeedType;

                                  return (
                                    <tr
                                      key={idx}
                                      onClick={() => setViewingDailyRecord(r)}
                                      className="hover:bg-emerald-50/70 cursor-pointer transition-colors"
                                      title={language === 'ta' ? 'முழுமையான பதிவைப் பார்க்க கிளிக் செய்க' : 'Click to view full record breakdown'}
                                    >
                                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{r.recordDate}</td>
                                      <td className="px-4 py-3 text-right font-black text-rose-600 whitespace-nowrap">{r.mortalityCount || 0}</td>
                                      <td className="px-4 py-3 font-extrabold text-slate-700 whitespace-nowrap">{feedTypeStr}</td>
                                      <td className="px-4 py-3 text-right font-black text-amber-700 whitespace-nowrap">{r.feedConsumption || 0} kg</td>
                                      <td className="px-4 py-3 text-right font-black text-purple-700 whitespace-nowrap">{r.averageWeight || 0} g</td>
                                      <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">{r.remainingChickCount ?? '—'}</td>
                                      <td className="px-4 py-3 text-center whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap">
                                          <Eye className="h-3.5 w-3.5 shrink-0" />
                                          <span>{language === 'ta' ? 'பார்' : 'View'}</span>
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* MOBILE VIEW CARDS DESIGN MATCHING USER SCREENSHOT */}
                          <div className="block md:hidden space-y-3.5">
                            {paginatedDaily.map((r, idx) => {
                              const totalKg = Number(r.feedConsumption || 0);
                              const chickCount = r.remainingChickCount ?? '—';

                              return (
                                <div
                                  key={idx}
                                  onClick={() => setViewingDailyRecord(r)}
                                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer space-y-3.5"
                                >
                                  {/* Card Header Row */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                                      <span className="text-sm font-black text-slate-900 whitespace-nowrap">{r.recordDate}</span>
                                    </div>
                                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 whitespace-nowrap">
                                      {language === 'ta' ? 'மீதி:' : 'Live:'} {typeof chickCount === 'number' ? chickCount.toLocaleString() : chickCount}
                                    </span>
                                  </div>

                                  {/* 3 Color-Coded Stat Blocks */}
                                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    {/* Mortality */}
                                    <div className="rounded-xl bg-rose-50/80 p-2 border border-rose-100/90 min-w-0">
                                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight text-rose-500 block mb-0.5 whitespace-nowrap">
                                        {language === 'ta' ? 'இறப்பு' : 'MORTALITY'}
                                      </span>
                                      <span className="text-base font-black text-rose-700 block whitespace-nowrap">
                                        {r.mortalityCount || 0}
                                      </span>
                                    </div>

                                    {/* Feed (Kg) */}
                                    <div className="rounded-xl bg-amber-50/80 p-2 border border-amber-100/90 min-w-0">
                                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight text-amber-600 block mb-0.5 whitespace-nowrap">
                                        {language === 'ta' ? 'தீவனம் (கி.கி)' : 'FEED (KG)'}
                                      </span>
                                      <span className="text-base font-black text-amber-800 block whitespace-nowrap">
                                        {totalKg} kg
                                      </span>
                                    </div>

                                    {/* Avg Weight */}
                                    <div className="rounded-xl bg-purple-50/80 p-2 border border-purple-100/90 min-w-0">
                                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight text-purple-600 block mb-0.5 whitespace-nowrap">
                                        {language === 'ta' ? 'சராசரி எடை' : 'AVG WEIGHT'}
                                      </span>
                                      <span className="text-base font-black text-purple-800 block whitespace-nowrap">
                                        {r.averageWeight || 0} g
                                      </span>
                                    </div>
                                  </div>

                                  {/* Card Footer Actions */}
                                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                                    <span className="font-black text-emerald-700 flex items-center gap-1.5 hover:text-emerald-800 whitespace-nowrap">
                                      <Eye className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                      <span>{language === 'ta' ? 'விவரங்கள் பார்க்க' : 'View Details'}</span>
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <PaginationControls
                            currentPage={currentPageDaily}
                            totalItems={historyData.dailyRecords.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPageDaily}
                          />
                        </>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* Trader Dispatch Download Invoice Modal */}
      {invoiceDispatch && (
        <TraderInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          dispatch={invoiceDispatch}
          boxSets={invoiceDispatch.boxSets || []}
          ratePerKg={ratePerKg}
          onRateChange={setRatePerKg}
          autoDownload={autoDownloadInvoice}
        />
      )}

      {/* Daily Record Detail Popup Modal */}
      <Modal
        isOpen={!!viewingDailyRecord}
        onClose={() => setViewingDailyRecord(null)}
        title={language === 'ta' ? `தினசரி பண்ணைப் பதிவு (${viewingDailyRecord?.recordDate})` : `Daily Farm Record (${viewingDailyRecord?.recordDate})`}
      >
        {viewingDailyRecord && (() => {
          let viewingAgeDay = 1;
          if (b.chickArrivalDate && viewingDailyRecord.recordDate) {
            const d1 = new Date(b.chickArrivalDate);
            const d2 = new Date(viewingDailyRecord.recordDate);
            const diffMs = Math.max(0, d2.getTime() - d1.getTime());
            viewingAgeDay = Math.min(45, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
          }
          const targetWeight = AVERAGE_WEIGHT_TARGETS[viewingAgeDay] || 58;
          const weightDiff = Number(viewingDailyRecord.averageWeight || 0) - targetWeight;
          const feedKg = Number(viewingDailyRecord.feedConsumption || 0);
          const feedBags = (feedKg / 70).toFixed(1);

          return (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block whitespace-nowrap">{language === 'ta' ? 'தொகுதி' : 'Batch'}</span>
                  <span className="text-sm font-black text-slate-900">{b.batchName || b.batchNumber || 'Batch'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block whitespace-nowrap">{language === 'ta' ? 'கோழி வயது' : 'Flock Age'}</span>
                  <span className="inline-block rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-black text-white shadow-2xs whitespace-nowrap">{language === 'ta' ? 'நாள்' : 'Day'} {viewingAgeDay}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-rose-50/80 p-2.5 border border-rose-100/80 text-center min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-rose-500 block mb-0.5 whitespace-nowrap">{language === 'ta' ? 'இறப்பு' : 'Mortality'}</span>
                  <span className="text-base sm:text-lg font-black text-rose-700 block whitespace-nowrap">{viewingDailyRecord.mortalityCount || 0}</span>
                  <span className="text-[10px] font-extrabold text-rose-600 block mt-0.5 whitespace-nowrap">{language === 'ta' ? 'மீதி:' : 'Live:'} {viewingDailyRecord.remainingChickCount ?? '—'}</span>
                </div>

                <div className="rounded-xl bg-amber-50/80 p-2.5 border border-amber-100/80 text-center min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-600 block mb-0.5 whitespace-nowrap">{language === 'ta' ? 'தீவனம்' : 'Feed Consumed'}</span>
                  <span className="text-sm sm:text-base font-black text-amber-800 block whitespace-nowrap">{feedKg} kg</span>
                  <span className="text-[10px] font-extrabold text-amber-700 block mt-0.5 whitespace-nowrap">({feedBags} {language === 'ta' ? 'பைகள்' : 'Bags'})</span>
                </div>

                <div className="rounded-xl bg-purple-50/80 p-2.5 border border-purple-100/80 text-center min-w-0 flex flex-col justify-center">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-purple-600 block mb-0.5 whitespace-nowrap">{language === 'ta' ? 'சராசரி எடை' : 'Avg Weight'}</span>
                  <span className="text-sm sm:text-base font-black text-purple-800 block whitespace-nowrap">{viewingDailyRecord.averageWeight || 0} g</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setViewingDailyRecord(null)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  {language === 'ta' ? 'மூடு' : 'Close'}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Complete Batch Report / Invoice Document (mounted off-screen for silent PDF download) */}
      {historyData && (
        <BatchReportModal
          isOpen={false}
          historyData={historyData}
        />
      )}
    </div>
  );
};
