import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { dbGetBatches, dbGetDailyRecords, dbGetCompanyTargets, dbGetDispatches, dbGetFeedArrivals } from '../services/dbService';
import { calculateDayOfBatch } from '../utils/calculations';
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
import { BarChart3, TrendingUp, Wheat, Activity, Bird } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userProfile]);

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchRecords(selectedBatchId);
    }
  }, [selectedBatchId]);

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

      if (accessible.length > 0) {
        const activeBatches = accessible.filter(b => (b.status || '').toLowerCase() === 'active');
        const defaultBatch = activeBatches.length > 0 
          ? activeBatches[0] 
          : accessible[0];
        setSelectedBatchId(defaultBatch.id);
        await loadBatchRecords(defaultBatch.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed loading report data:', err);
      setLoading(false);
    }
  }

  async function loadBatchRecords(bId) {
    try {
      const [map, fList] = await Promise.all([
        dbGetDailyRecords(bId),
        dbGetFeedArrivals(bId)
      ]);
      setDailyRecords(Object.values(map || {}).sort((a, b) => a.recordDate.localeCompare(b.recordDate)));
      setFeedArrivals(fList || []);
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

  // Calculate Batch Stat Summary
  const isBatchDone = (selectedBatch?.status || '').toLowerCase() === 'completed';
  const totalMortality = dailyRecords.reduce((sum, r) => sum + (r.mortalityCount || 0), 0);
  const latestRecord = dailyRecords.length > 0 ? dailyRecords[dailyRecords.length - 1] : null;
  const latestLiveBirds = latestRecord?.remainingChickCount ?? selectedBatch?.initialChickCount ?? 0;
  const latestAvgWeight = latestRecord?.averageWeight || 0;

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
              {language === 'ta' ? 'வளர்ச்சி மற்றும் இறப்புப் பகுப்பாய்வு' : 'Visual growth metrics and mortality trends'}
            </p>
          </div>
        </div>

        {selectedBatch && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-extrabold text-slate-700 whitespace-nowrap">{language === 'ta' ? 'தொகுதி:' : 'Select Batch:'}</span>
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
    </div>
  );
};
