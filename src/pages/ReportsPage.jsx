import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { dbGetBatches, dbGetDailyRecords, dbGetCompanyTargets, dbGetDispatches, dbGetFeedArrivals } from '../services/dbService';
import { calculateDayOfBatch, calculateActiveBatchFCR } from '../utils/calculations';
import {
  ResponsiveContainer,
  AreaChart,
  BarChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line
} from 'recharts';
import { BarChart3, TrendingUp, Wheat, Activity, Bird, Scale, Layers, Award } from 'lucide-react';
import CustomSelect from '../components/common/CustomSelect';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CustomTooltip = ({ active, payload, label, language }) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0]?.payload;
    return (
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md text-white text-xs space-y-1.5 min-w-[180px] z-50">
        <div className="font-black text-emerald-400 border-b border-slate-700/80 pb-1.5 flex items-center justify-between gap-2">
          <span>{label}</span>
          {dataItem?.date && (
            <span className="text-[10px] text-slate-400 font-semibold">{dataItem.date}</span>
          )}
        </div>
        <div className="space-y-1.5 pt-0.5">
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
                <span>{entry.name}:</span>
              </span>
              <span className="text-white font-extrabold">
                {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                {entry.name.toLowerCase().includes('weight') || entry.name.includes('எடை') ? ' கி' : entry.name.toLowerCase().includes('feed (g') || entry.name.includes('தீவனம் (கி') ? ' கி' : entry.name.toLowerCase().includes('kg') || entry.name.includes('கிலோ') ? ' கிலோ' : language === 'ta' ? '' : ' birds'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const ReportsPage = () => {
  const { userProfile } = useAuth();
  const { language } = useLanguage();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [dailyRecords, setDailyRecords] = useState([]);
  const [targets, setTargets] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [feedArrivals, setFeedArrivals] = useState([]);
  const [allDailyRecordsMap, setAllDailyRecordsMap] = useState({});
  const [allFeedArrivalsMap, setAllFeedArrivalsMap] = useState({});
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'comparison'
  const [compareMetric, setCompareMetric] = useState('fcr'); // 'mortality' | 'birds' | 'feed' | 'avgWeight' | 'totalWeight' | 'fcr'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userProfile]);

  useEffect(() => {
    if (selectedBatchId) {
      if (allDailyRecordsMap[selectedBatchId]) {
        setDailyRecords(allDailyRecordsMap[selectedBatchId] || []);
        setFeedArrivals(allFeedArrivalsMap[selectedBatchId] || []);
      } else {
        loadBatchRecords(selectedBatchId);
      }
    }
  }, [selectedBatchId, allDailyRecordsMap, allFeedArrivalsMap]);

  async function loadData() {
    try {
      setLoading(true);
      const [bList, tObj, dList] = await Promise.all([
        dbGetBatches(),
        dbGetCompanyTargets(),
        dbGetDispatches()
      ]);

      const accessible = bList;
      setBatches(accessible);
      setTargets(tObj);
      setDispatches(dList);

      // Preload all daily records and feed arrivals for batch comparison
      const dailyMap = {};
      const feedMap = {};
      await Promise.all(
        accessible.map(async (b) => {
          const [m, f] = await Promise.all([
            dbGetDailyRecords(b.id),
            dbGetFeedArrivals(b.id)
          ]);
          dailyMap[b.id] = Object.values(m || {}).sort((x, y) => x.recordDate.localeCompare(y.recordDate));
          feedMap[b.id] = f || [];
        })
      );
      setAllDailyRecordsMap(dailyMap);
      setAllFeedArrivalsMap(feedMap);

      if (accessible.length > 0) {
        const activeBatches = accessible.filter(b => (b.status || '').toLowerCase() === 'active');
        const defaultBatch = activeBatches.length > 0 
          ? activeBatches[0] 
          : accessible[0];
        setSelectedBatchId(defaultBatch.id);
        setDailyRecords(dailyMap[defaultBatch.id] || []);
        setFeedArrivals(feedMap[defaultBatch.id] || []);
      }
    } catch (err) {
      console.error('Failed loading report data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBatchRecords(bId) {
    try {
      const [map, fList] = await Promise.all([
        dbGetDailyRecords(bId),
        dbGetFeedArrivals(bId)
      ]);
      const sortedRecs = Object.values(map || {}).sort((a, b) => a.recordDate.localeCompare(b.recordDate));
      setDailyRecords(sortedRecs);
      setFeedArrivals(fList || []);
      setAllDailyRecordsMap(prev => ({ ...prev, [bId]: sortedRecs }));
      setAllFeedArrivalsMap(prev => ({ ...prev, [bId]: fList || [] }));
    } catch (err) {
      console.error('Failed loading daily records for reports:', err);
    } finally {
      setLoading(false);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  if (loading) return <LoadingSpinner message={language === 'ta' ? 'அறிக்கைகள் & பகுப்பாய்வு ஏற்றப்படுகிறது...' : 'Loading Analytics & Reports...'} />;

  // Prepare chart dataset for selected batch
  const chartData = dailyRecords.map((r) => {
    const dayIdx = selectedBatch ? calculateDayOfBatch(selectedBatch.chickArrivalDate, r.recordDate) : 1;
    const targetWeight = targets?.averageWeight?.[dayIdx] || 0;
    const targetFeed = targets?.feedConsumption?.[dayIdx] || 0;
    const actualFeedGramPerBird = r.remainingChickCount > 0 ? Math.round(((r.feedConsumption || 0) * 1000) / r.remainingChickCount) : 0;

    return {
      date: r.recordDate,
      day: language === 'ta' ? `நாள் ${dayIdx}` : `Day ${dayIdx}`,
      mortality: r.mortalityCount || 0,
      remaining: r.remainingChickCount || 0,
      actualWeight: r.averageWeight || 0,
      targetWeight,
      actualFeedGramPerBird,
      targetFeed,
      feedConsumptionKg: r.feedConsumption || 0,
      feedType: r.feedType
    };
  });

  // Calculate Batch Stat Summary for Single Batch View
  const isBatchDone = (selectedBatch?.status || '').toLowerCase() === 'completed';
  const totalMortality = dailyRecords.reduce((sum, r) => sum + (r.mortalityCount || 0), 0);
  const latestRecord = dailyRecords.length > 0 ? dailyRecords[dailyRecords.length - 1] : null;
  const latestLiveBirds = latestRecord?.remainingChickCount ?? selectedBatch?.initialChickCount ?? 0;

  // Dispatches calculations for selected batch
  const batchDispatches = dispatches.filter(d => d.batchId === selectedBatchId);
  const totalDispatchedBirds = batchDispatches.reduce((acc, d) => {
    const setsRaw = d.boxSets || [];
    const sets = Array.isArray(setsRaw) ? setsRaw : Object.values(setsRaw);
    const loadedSets = sets.filter(s => Number(s.loadedWeight) > 0 || Number(s.totalChickenWeight) > 0);
    const setBirds = loadedSets.reduce((sum, s) => sum + Number(s.chickenCount || 0), 0);
    return acc + (setBirds > 0 ? setBirds : Number(d.birdsCount || d.totalBirds || 0));
  }, 0);

  const totalDispatchedWeight = batchDispatches.reduce((acc, d) => {
    const setsRaw = d.boxSets || [];
    const sets = Array.isArray(setsRaw) ? setsRaw : Object.values(setsRaw);
    const loadedSets = sets.filter(s => Number(s.loadedWeight) > 0 || Number(s.totalChickenWeight) > 0);
    const setWeight = loadedSets.reduce((sum, s) => sum + Number(s.totalChickenWeight || 0), 0);
    return acc + (setWeight > 0 ? setWeight : Number(d.totalWeight || d.netWeight || 0));
  }, 0);

  // Capped net feed consumed bags (Farmer Dashboard logic)
  const totalFeedArrivedBags = feedArrivals.reduce((acc, f) => {
    const isReturn = f.transactionType === 'Return';
    const totalKg = Number(f.quantityReceivedKg ?? f.quantityReceived ?? ((Number(f.bagsReceived || 0) * 70) + Number(f.additionalKg || 0)));
    const bags = totalKg / 70;
    return isReturn ? acc - bags : acc + bags;
  }, 0);
  const netArrivedBags = Math.max(0, totalFeedArrivedBags);
  const hasReturns = feedArrivals.some(f => f.transactionType === 'Return');

  const rawConsumedBags = dailyRecords.reduce((sum, r) => {
    const bags = r.feedConsumptionBags || (r.feedConsumption ? r.feedConsumption / 70 : 0);
    return sum + Number(bags || 0);
  }, 0);

  const totalFeedBagsVal = (hasReturns || isBatchDone) && netArrivedBags > 0
    ? Math.min(rawConsumedBags, netArrivedBags)
    : rawConsumedBags;
  const totalFeedBags = totalFeedBagsVal.toFixed(1);
  const totalFeedKg = Math.round(totalFeedBagsVal * 70);

  const dispatchedAvgWeightGrams = totalDispatchedBirds > 0
    ? Math.round((totalDispatchedWeight / totalDispatchedBirds) * 1000)
    : (latestRecord ? Number(latestRecord.averageWeight || 0) : 0);

  const displayAvgWeightVal = (isBatchDone || totalDispatchedBirds > 0) && dispatchedAvgWeightGrams > 0
    ? dispatchedAvgWeightGrams
    : (latestRecord?.averageWeight || 0);

  const displayLiveBirdsVal = isBatchDone
    ? (totalDispatchedBirds > 0 ? totalDispatchedBirds : latestLiveBirds)
    : latestLiveBirds;

  const displayLiveBirdsLabel = isBatchDone
    ? (language === 'ta' ? 'விற்பனை கோழிகள்' : 'Dispatched Birds')
    : (language === 'ta' ? 'உயிருள்ளவை' : 'Live Flock');

  const displayAvgWeightLabel = isBatchDone || totalDispatchedBirds > 0
    ? (language === 'ta' ? 'அனுப்பப்பட்ட சராசரி எடை' : 'Dispatched Avg Wt')
    : (language === 'ta' ? 'சராசரி எடை' : 'Latest Avg Wt');

  // Compute Multi-Batch Summaries for Comparison View
  const batchSummaries = batches.map(b => {
    const bDispatches = dispatches.filter(d => d.batchId === b.id);
    const bDispatchedBirds = bDispatches.reduce((acc, d) => {
      const setsRaw = d.boxSets || [];
      const sets = Array.isArray(setsRaw) ? setsRaw : Object.values(setsRaw);
      const loadedSets = sets.filter(s => Number(s.loadedWeight) > 0 || Number(s.totalChickenWeight) > 0);
      const setBirds = loadedSets.reduce((sum, s) => sum + Number(s.chickenCount || 0), 0);
      return acc + (setBirds > 0 ? setBirds : Number(d.birdsCount || d.totalBirds || 0));
    }, 0);

    const bDispatchedWeight = bDispatches.reduce((acc, d) => {
      const setsRaw = d.boxSets || [];
      const sets = Array.isArray(setsRaw) ? setsRaw : Object.values(setsRaw);
      const loadedSets = sets.filter(s => Number(s.loadedWeight) > 0 || Number(s.totalChickenWeight) > 0);
      const setWeight = loadedSets.reduce((sum, s) => sum + Number(s.totalChickenWeight || 0), 0);
      return acc + (setWeight > 0 ? setWeight : Number(d.totalWeight || d.netWeight || 0));
    }, 0);

    const bDailyRecs = allDailyRecordsMap[b.id] || [];
    const bFeedArr = allFeedArrivalsMap[b.id] || [];

    const bMortality = bDailyRecs.reduce((sum, r) => sum + (r.mortalityCount || 0), 0);
    const initialChicks = Number(b.initialChickCount || 0);
    const mortRate = initialChicks > 0 ? parseFloat(((bMortality / initialChicks) * 100).toFixed(2)) : 0;

    const bLatestRec = bDailyRecs.length > 0 ? bDailyRecs[bDailyRecs.length - 1] : null;
    const liveBirds = bLatestRec?.remainingChickCount ?? initialChicks;

    const bArrivedBags = bFeedArr.reduce((acc, f) => {
      const isReturn = f.transactionType === 'Return';
      const totalKg = Number(f.quantityReceivedKg ?? f.quantityReceived ?? ((Number(f.bagsReceived || 0) * 70) + Number(f.additionalKg || 0)));
      const bags = totalKg / 70;
      return isReturn ? acc - bags : acc + bags;
    }, 0);
    const bNetArrivedBags = Math.max(0, bArrivedBags);
    const bHasReturns = bFeedArr.some(f => f.transactionType === 'Return');

    const bRawConsumedBags = bDailyRecs.reduce((sum, r) => {
      const bags = r.feedConsumptionBags || (r.feedConsumption ? r.feedConsumption / 70 : 0);
      return sum + Number(bags || 0);
    }, 0);

    const bDone = (b.status || '').toLowerCase() === 'completed';
    const bConsumedBagsVal = (bHasReturns || bDone) && bNetArrivedBags > 0
      ? Math.min(bRawConsumedBags, bNetArrivedBags)
      : bRawConsumedBags;

    const bFeedBags = parseFloat(bConsumedBagsVal.toFixed(1));
    const bFeedKg = Math.round(bConsumedBagsVal * 70);

    const bDispatchedAvgGrams = bDispatchedBirds > 0
      ? Math.round((bDispatchedWeight / bDispatchedBirds) * 1000)
      : (bLatestRec ? Number(bLatestRec.averageWeight || 0) : 0);

    const bAvgWeightGrams = (bDone || bDispatchedBirds > 0) && bDispatchedAvgGrams > 0
      ? bDispatchedAvgGrams
      : (bLatestRec?.averageWeight || 0);

    const fcrVal = calculateActiveBatchFCR(
      bFeedKg,
      bAvgWeightGrams,
      liveBirds,
      bDispatchedWeight,
      bDone
    );
    const fcr = fcrVal ? parseFloat(fcrVal.toFixed(2)) : null;

    return {
      id: b.id,
      batchNumber: b.batchNumber,
      batchName: b.batchName || b.batchNumber,
      status: b.status || 'Active',
      initialChicks,
      totalDispatchedBirds: bDispatchedBirds,
      remainingLiveBirds: liveBirds,
      totalMortality: bMortality,
      mortalityRate: mortRate,
      totalFeedBags: bFeedBags,
      totalFeedKg: bFeedKg,
      avgWeightGrams: bAvgWeightGrams,
      totalDispatchedWeight: parseFloat(bDispatchedWeight.toFixed(2)),
      fcr: fcr || 0
    };
  });

  // Calculate Combined Totals for Comparison Table Footer
  const summaryTotals = {
    initialChicks: batchSummaries.reduce((sum, b) => sum + b.initialChicks, 0),
    dispatchedBirds: batchSummaries.reduce((sum, b) => sum + b.totalDispatchedBirds, 0),
    liveBirds: batchSummaries.reduce((sum, b) => sum + b.remainingLiveBirds, 0),
    mortality: batchSummaries.reduce((sum, b) => sum + b.totalMortality, 0),
    feedBags: parseFloat(batchSummaries.reduce((sum, b) => sum + b.totalFeedBags, 0).toFixed(1)),
    feedKg: batchSummaries.reduce((sum, b) => sum + b.totalFeedKg, 0),
    dispatchedWeight: parseFloat(batchSummaries.reduce((sum, b) => sum + b.totalDispatchedWeight, 0).toFixed(2)),
  };

  const overallFCRVal = summaryTotals.dispatchedWeight > 0
    ? parseFloat((summaryTotals.feedKg / summaryTotals.dispatchedWeight).toFixed(2))
    : null;

  // Comparison Chart Configuration Map
  const metricConfigs = {
    fcr: {
      key: 'fcr',
      name: language === 'ta' ? 'FCR விகிதம்' : 'FCR Ratio',
      color: '#10b981',
      unit: '',
      title: language === 'ta' ? 'தொகுதி வாரியாக FCR ஒப்பீடு' : 'Batch FCR Ratio Comparison',
      subtext: language === 'ta' ? 'குறைந்த FCR மேலானது (தீவன மாற்று விகிதம்)' : 'Lower FCR indicates higher feed conversion efficiency'
    },
    mortality: {
      key: 'totalMortality',
      name: language === 'ta' ? 'மொத்த இறப்பு (எண்ணிக்கை)' : 'Total Mortality (birds)',
      color: '#f43f5e',
      unit: language === 'ta' ? ' கோழிகள்' : ' birds',
      title: language === 'ta' ? 'தொகுதி வாரியாக இறப்பு ஒப்பீடு' : 'Batch Total Mortality Comparison',
      subtext: language === 'ta' ? 'ஒவ்வொரு தொகுதியிலும் மொத்த இறந்த கோழிகளின் எண்ணிக்கை' : 'Total bird mortality count per batch'
    },
    birds: {
      key: 'totalDispatchedBirds',
      name: language === 'ta' ? 'அனுப்பப்பட்ட கோழிகள்' : 'Dispatched Birds',
      color: '#3b82f6',
      unit: language === 'ta' ? ' கோழிகள்' : ' birds',
      title: language === 'ta' ? 'தொகுதி வாரியாக விநியோக கோழிகள் ஒப்பீடு' : 'Batch Dispatched Birds Comparison',
      subtext: language === 'ta' ? 'விற்பனை செய்யப்பட்ட கோழிகளின் எண்ணிக்கை' : 'Total dispatched bird count per batch'
    },
    feed: {
      key: 'totalFeedBags',
      name: language === 'ta' ? 'மொத்த தீவனம் (பைகள்)' : 'Feed Consumed (Bags)',
      color: '#f59e0b',
      unit: language === 'ta' ? ' பைகள்' : ' Bags',
      title: language === 'ta' ? 'தொகுதி வாரியாக தீவன நுகர்வு ஒப்பீடு' : 'Batch Feed Consumption Comparison',
      subtext: language === 'ta' ? 'பயன்படுத்தப்பட்ட மொத்த தீவன பைகள்' : 'Total feed bags consumed per batch'
    },
    avgWeight: {
      key: 'avgWeightGrams',
      name: language === 'ta' ? 'சராசரி எடை (கிராம்)' : 'Avg Bird Weight (g)',
      color: '#8b5cf6',
      unit: language === 'ta' ? ' கி' : ' g',
      title: language === 'ta' ? 'தொகுதி வாரியாக சராசரி எடை ஒப்பீடு' : 'Batch Average Weight Comparison',
      subtext: language === 'ta' ? 'அனுப்பப்பட்ட / தற்போதைய சராசரி எடை' : 'Final dispatched or latest bird weight in grams'
    },
    totalWeight: {
      key: 'totalDispatchedWeight',
      name: language === 'ta' ? 'மொத்த விநியோக எடை (கிலோ)' : 'Total Weight (kg)',
      color: '#0d9488',
      unit: language === 'ta' ? ' கிலோ' : ' kg',
      title: language === 'ta' ? 'தொகுதி வாரியாக மொத்த எடை ஒப்பீடு' : 'Batch Total Weight Produced Comparison',
      subtext: language === 'ta' ? 'விற்பனை செய்யப்பட்ட மொத்த எடை கிலோவில்' : 'Total dispatched poultry weight in kilograms'
    },
  };

  const activeMetricConfig = metricConfigs[compareMetric] || metricConfigs.fcr;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800 shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{language === 'ta' ? 'அறிக்கைகள் & பகுப்பாய்வு' : 'Reports & Analytics'}</h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {language === 'ta' ? 'வளர்ச்சி, இறப்பு மற்றும் தொகுதி ஒப்பீட்டு பகுப்பாய்வு' : 'Visual growth metrics, mortality trends & batch comparison'}
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Batch Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle Buttons */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all ${
                viewMode === 'single'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>{language === 'ta' ? 'ஒற்றைத் தொகுதி' : 'Single Batch'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('comparison')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all ${
                viewMode === 'comparison'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{language === 'ta' ? 'தொகுதி ஒப்பீடு' : 'Batch Comparison'}</span>
            </button>
          </div>

          {viewMode === 'single' && selectedBatch && (
            <div className="flex items-center gap-2 shrink-0">
              <CustomSelect
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                options={batches.map((b) => ({
                  value: b.id,
                  label: `${b.batchNumber} - ${b.batchName}`,
                }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* MODE 1: SINGLE BATCH ANALYTICS */}
      {viewMode === 'single' && (
        <>
          {chartData.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400 font-medium text-xs">
              {language === 'ta' ? 'பகுப்பாய்வு வரைபடங்களைக் காட்ட இந்தத் தொகுதிக்கு பதிவுகள் எதுவும் இல்லை.' : 'No daily record history available for this batch to render analytics graphs.'}
            </div>
          ) : (
            <>
              {/* Top KPI Stat Summary Cards Row */}
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                {/* Live Birds Left / Dispatched Birds */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">{displayLiveBirdsLabel}</span>
                    <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 border border-emerald-100">
                      <Bird className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">{displayLiveBirdsVal.toLocaleString()}</span>
                    {language !== 'ta' && <span className="text-xs font-bold text-slate-500 ml-1">birds</span>}
                  </div>
                </div>

                {/* Total Mortality */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">{language === 'ta' ? 'மொத்த இறப்பு' : 'Total Mortality'}</span>
                    <div className="rounded-xl bg-rose-50 p-2 text-rose-600 border border-rose-100">
                      <Activity className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-rose-700 tracking-tight">{totalMortality.toLocaleString()}</span>
                    {language !== 'ta' && <span className="text-xs font-bold text-slate-500 ml-1">birds</span>}
                  </div>
                </div>

                {/* Latest Avg Bird Weight / Dispatched Avg Weight */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">{displayAvgWeightLabel}</span>
                    <div className="rounded-xl bg-purple-50 p-2 text-purple-600 border border-purple-100">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-purple-800 tracking-tight">{displayAvgWeightVal}</span>
                    <span className="text-xs font-bold text-slate-500 ml-1">{language === 'ta' ? 'கி' : 'g'}</span>
                  </div>
                </div>

                {/* Total Feed Consumed */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">{language === 'ta' ? 'மொத்த தீவனம்' : 'Total Feed'}</span>
                    <div className="rounded-xl bg-amber-50 p-2 text-amber-600 border border-amber-100">
                      <Wheat className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">{totalFeedBags}</span>
                    <span className="text-xs font-bold text-slate-500 ml-1">{language === 'ta' ? 'பைகள்' : 'bags'}</span>
                  </div>
                </div>
              </div>

              {/* Modern Graphs Grid */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Chart 1: Daily Mortality Count Graph */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {language === 'ta' ? `தினசரி இறப்பு (${selectedBatch?.batchNumber})` : `Daily Mortality (${selectedBatch?.batchNumber})`}
                        </h2>
                        <p className="text-[11px] font-semibold text-slate-400">{language === 'ta' ? 'தினசரி இறப்புப் பதிவு' : 'Daily recorded bird mortality'}</p>
                      </div>
                    </div>
                    <span className="rounded-xl bg-rose-50 border border-rose-100 px-2.5 py-1 text-xs font-black text-rose-700">
                      {language === 'ta' ? 'மொத்தம்:' : 'Total:'} {totalMortality}
                    </span>
                  </div>

                  <div className="h-72 w-full pt-2 outline-none focus:outline-none select-none [&_*]:outline-none">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} style={{ outline: 'none' }}>
                        <defs>
                          <linearGradient id="mortalityGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#be123c" stopOpacity={0.65} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.7} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip language={language} />} />
                        <Bar dataKey="mortality" fill="url(#mortalityGrad)" name={language === 'ta' ? 'தினசரி இறப்பு' : 'Daily Mortality'} radius={[6, 6, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Average Weight Growth vs Company Target */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {language === 'ta' ? 'எடை வளர்ச்சி vs இலக்கு' : 'Weight Growth vs Target'}
                        </h2>
                        <p className="text-[11px] font-semibold text-slate-400">{language === 'ta' ? 'எடை வளர்ச்சி ஒப்பீடு' : 'Actual weight in grams vs standard targets'}</p>
                      </div>
                    </div>
                    <span className="rounded-xl bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                      {displayAvgWeightVal} {language === 'ta' ? 'கி' : 'g'}
                    </span>
                  </div>

                  <div className="h-72 w-full pt-2 outline-none focus:outline-none select-none [&_*]:outline-none">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} style={{ outline: 'none' }}>
                        <defs>
                          <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.7} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip language={language} />} />
                        <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                        <Area type="monotone" dataKey="actualWeight" stroke="#059669" strokeWidth={3} fill="url(#weightGrad)" name={language === 'ta' ? 'உண்மையான எடை (கி)' : 'Actual Weight (g)'} dot={false} activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }} />
                        <Line type="monotone" dataKey="targetWeight" stroke="#a855f7" strokeDasharray="4 4" strokeWidth={2.5} name={language === 'ta' ? 'நிறுவன இலக்கு (கி)' : 'Company Target (g)'} dot={false} activeDot={{ r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 3: Feed Consumption vs Target per Bird */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-xl bg-amber-100 p-2 text-amber-800">
                        <Wheat className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {language === 'ta' ? 'தீவனப் பயன்பாடு vs இலக்கு' : 'Feed Intake vs Target'}
                        </h2>
                        <p className="text-[11px] font-semibold text-slate-400">{language === 'ta' ? 'ஒரு கோழிக்கு தீவன ஒப்பீடு' : 'Gram intake per bird vs expected targets'}</p>
                      </div>
                    </div>
                    <span className="rounded-xl bg-amber-50 border border-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                      {language === 'ta' ? 'கி/எண்ணிக்கை' : 'g/bird ratio'}
                    </span>
                  </div>

                  <div className="h-72 w-full pt-2 outline-none focus:outline-none select-none [&_*]:outline-none">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} style={{ outline: 'none' }}>
                        <defs>
                          <linearGradient id="feedGramGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.7} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip language={language} />} />
                        <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                        <Area type="monotone" dataKey="actualFeedGramPerBird" stroke="#d97706" strokeWidth={3} fill="url(#feedGramGrad)" name={language === 'ta' ? 'உண்மையான தீவனம் (கி/எண்ணிக்கை)' : 'Actual Feed (g/bird)'} dot={false} activeDot={{ r: 6, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }} />
                        <Line type="monotone" dataKey="targetFeed" stroke="#10b981" strokeDasharray="4 4" strokeWidth={2.5} name={language === 'ta' ? 'நிறுவன இலக்கு (கி)' : 'Company Target (g)'} dot={false} activeDot={{ r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 4: Daily Total Feed Consumed (kg) */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-xl bg-indigo-100 p-2 text-indigo-800">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {language === 'ta' ? 'மொத்த தீவனம் (கிலோ)' : 'Total Feed (kg)'}
                        </h2>
                        <p className="text-[11px] font-semibold text-slate-400">{language === 'ta' ? 'தினசரி தீவன அளவு' : 'Total daily farm feed usage in kilograms'}</p>
                      </div>
                    </div>
                    <span className="rounded-xl bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-black text-indigo-800">
                      {totalFeedKg.toLocaleString()} {language === 'ta' ? 'கிலோ' : 'kg total'}
                    </span>
                  </div>

                  <div className="h-72 w-full pt-2 outline-none focus:outline-none select-none [&_*]:outline-none">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} style={{ outline: 'none' }}>
                        <defs>
                          <linearGradient id="feedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#4338ca" stopOpacity={0.65} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.7} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip language={language} />} />
                        <Bar dataKey="feedConsumptionKg" fill="url(#feedGrad)" name={language === 'ta' ? 'தீவனப் பயன்பாடு (கிலோ)' : 'Feed Consumed (kg)'} radius={[6, 6, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* MODE 2: BATCH COMPARISON REPORT */}
      {viewMode === 'comparison' && (
        <div className="space-y-6">
          {/* Comparison Metric Selection Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                {language === 'ta' ? 'ஒப்பிடும் அளவீட்டைத் தேர்ந்தெடுக்கவும்:' : 'Select Metric to Compare:'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'fcr', label: language === 'ta' ? 'FCR விகிதம்' : 'FCR Ratio', icon: Activity },
                { id: 'mortality', label: language === 'ta' ? 'மொத்த இறப்பு' : 'Total Mortality', icon: Activity },
                { id: 'birds', label: language === 'ta' ? 'விநியோகக் கோழிகள்' : 'Dispatched Birds', icon: Bird },
                { id: 'feed', label: language === 'ta' ? 'தீவனப் பயன்பாடு' : 'Feed Consumed', icon: Wheat },
                { id: 'avgWeight', label: language === 'ta' ? 'சராசரி எடை (கி)' : 'Avg Weight (g)', icon: TrendingUp },
                { id: 'totalWeight', label: language === 'ta' ? 'மொத்த எடை (கிலோ)' : 'Total Weight (kg)', icon: Scale },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCompareMetric(m.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all border ${
                    compareMetric === m.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <m.icon className="h-3.5 w-3.5" />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Batch Metric Comparison Bar Chart */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">{activeMetricConfig.title}</h2>
                <p className="text-xs font-semibold text-slate-400">{activeMetricConfig.subtext}</p>
              </div>
              <span className="rounded-xl px-3 py-1 text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-100 shrink-0 self-start sm:self-auto">
                {batchSummaries.length} {language === 'ta' ? 'தொகுதிகள் ஒப்பிடப்படுகின்றன' : 'Batches Compared'}
              </span>
            </div>

            <div className="h-72 w-full pt-2 outline-none focus:outline-none select-none [&_*]:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={batchSummaries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} style={{ outline: 'none' }}>
                  <defs>
                    <linearGradient id="compareGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={activeMetricConfig.color} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={activeMetricConfig.color} stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.7} />
                  <XAxis dataKey="batchNumber" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip language={language} />} />
                  <Bar
                    dataKey={activeMetricConfig.key}
                    fill="url(#compareGrad)"
                    name={activeMetricConfig.name}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Full Multi-Batch Performance Comparison Matrix Table */}
          <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-indigo-100 p-2 text-indigo-800">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    {language === 'ta' ? 'முழுமையான தொகுதி ஒப்பீட்டு அட்டவணை' : 'Comprehensive Batch Performance Matrix'}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {language === 'ta' ? 'அனைத்து தொகுதிகளின் விரிவான ஒப்பீட்டு விவரங்கள்' : 'Side-by-side performance indicators across all batches'}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-[11px] font-black uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">{language === 'ta' ? 'தொகுதி #' : 'Batch #'}</th>
                    <th className="py-3 px-4">{language === 'ta' ? 'ஆரம்ப குஞ்சுகள்' : 'Initial Chicks'}</th>
                    <th className="py-3 px-4">{language === 'ta' ? 'விநியோகம் / உயிருள்ளவை' : 'Dispatched / Live'}</th>
                    <th className="py-3 px-4">{language === 'ta' ? 'மொத்த இறப்பு' : 'Total Mortality'}</th>
                    <th className="py-3 px-4">{language === 'ta' ? 'தீவனப் பயன்பாடு' : 'Feed Consumed'}</th>
                    <th className="py-3 px-4">{language === 'ta' ? 'சராசரி எடை' : 'Avg Weight'}</th>
                    <th className="py-3 px-4">{language === 'ta' ? 'மொத்த எடை' : 'Total Weight'}</th>
                    <th className="py-3 px-4">{language === 'ta' ? 'FCR விகிதம்' : 'FCR Ratio'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {batchSummaries.map((bs) => {
                    const isDone = (bs.status || '').toLowerCase() === 'completed';
                    return (
                      <tr key={bs.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{bs.batchNumber}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                              isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {bs.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700 whitespace-nowrap">
                          {bs.initialChicks.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                          {bs.totalDispatchedBirds > 0 ? (
                            <span className="text-emerald-800 font-black">{bs.totalDispatchedBirds.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-700">{bs.remainingLiveBirds.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-rose-700 font-extrabold">{bs.totalMortality}</span>
                          <span className="text-[11px] text-slate-400 font-semibold ml-1">({bs.mortalityRate}%)</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-800 whitespace-nowrap">
                          {bs.totalFeedBags} Bags <span className="text-slate-400 font-normal">({bs.totalFeedKg.toLocaleString()} kg)</span>
                        </td>
                        <td className="py-3.5 px-4 font-black text-purple-800 whitespace-nowrap">
                          {bs.avgWeightGrams} g
                        </td>
                        <td className="py-3.5 px-4 font-black text-teal-800 whitespace-nowrap">
                          {bs.totalDispatchedWeight > 0 ? `${bs.totalDispatchedWeight.toLocaleString()} kg` : '—'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {bs.fcr ? (
                            <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800 border border-emerald-200">
                              {bs.fcr}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Summary Table Footer */}
                <tfoot className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-800">
                  <tr>
                    <td className="py-3.5 px-4">{language === 'ta' ? 'மொத்தம் / சராசரி' : 'Total / Summary'}</td>
                    <td className="py-3.5 px-4">{summaryTotals.initialChicks.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-emerald-400">{summaryTotals.dispatchedBirds > 0 ? summaryTotals.dispatchedBirds.toLocaleString() : summaryTotals.liveBirds.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-rose-300">{summaryTotals.mortality}</td>
                    <td className="py-3.5 px-4 text-amber-300">{summaryTotals.feedBags} Bags ({summaryTotals.feedKg.toLocaleString()} kg)</td>
                    <td className="py-3.5 px-4 text-purple-300">—</td>
                    <td className="py-3.5 px-4 text-teal-300">{summaryTotals.dispatchedWeight.toLocaleString()} kg</td>
                    <td className="py-3.5 px-4 text-emerald-300">{overallFCRVal ? overallFCRVal : '—'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
