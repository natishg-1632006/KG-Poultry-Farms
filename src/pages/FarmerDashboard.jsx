import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { dbGetBatches, dbGetDailyRecords, dbGetFeedArrivals, dbGetDispatches, dbSubscribeToBatches } from '../services/dbService';
import { formatFeedStock, kgToBags, calculateActiveBatchFCR } from '../utils/calculations';
import { KG_PER_BAG } from '../constants/companyTargets';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { WeatherWidget } from '../components/common/WeatherWidget';
import { ClipboardList, Wheat, Syringe, Truck, Activity, ArrowRight, Layers, AlertCircle, Scale, Calendar } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const FarmerDashboard = () => {
  const { userProfile } = useAuth();
  const { language, t } = useLanguage();
  const [assignedBatches, setAssignedBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [records, setRecords] = useState([]);
  const [feedArrivals, setFeedArrivals] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFarmerData();
    const unsubscribe = dbSubscribeToBatches(() => {
      loadFarmerData();
    });
    return () => unsubscribe();
  }, [userProfile]);

  async function loadFarmerData(targetBatchId = null) {
    try {
      const allBatches = await dbGetBatches();
      const farmerBatches = allBatches;
      setAssignedBatches(farmerBatches);

      let selected = null;
      if (targetBatchId) {
        selected = farmerBatches.find(b => b.id === targetBatchId);
      }
      if (!selected) {
        selected = farmerBatches.find(b => (b.status || '').toLowerCase() === 'active') || (farmerBatches.length > 0 ? farmerBatches[0] : null);
      }
      setActiveBatch(selected);

      if (selected) {
        const [rMap, fList, allDisp] = await Promise.all([
          dbGetDailyRecords(selected.id),
          dbGetFeedArrivals(selected.id),
          dbGetDispatches()
        ]);
        setRecords(Object.values(rMap).sort((a, b) => b.recordDate.localeCompare(a.recordDate)));
        setFeedArrivals(fList || []);
        setDispatches((allDisp || []).filter(d => d.batchId === selected.id));
      }
    } catch (err) {
      console.error('Failed loading farmer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading Farmer Portal..." />;
  }

  const initialChicks = activeBatch ? Number(activeBatch.initialChickCount || 0) : 0;
  const totalMortality = records.reduce((acc, r) => acc + Number(r.mortalityCount || 0), 0);
  const remainingChicks = activeBatch && activeBatch.remainingChickCount !== undefined
    ? Number(activeBatch.remainingChickCount)
    : Math.max(0, initialChicks - totalMortality);

  let totalDispatchedBirds = 0;
  let totalDispatchedWeight = 0;

  for (const d of dispatches) {
    const setsRaw = d.boxSets || [];
    const sets = Array.isArray(setsRaw) ? setsRaw : Object.values(setsRaw);
    const loadedSets = sets.filter(s => Number(s.loadedWeight) > 0 || Number(s.totalChickenWeight) > 0);
    const setBirds = loadedSets.reduce((sum, s) => sum + Number(s.chickenCount || 0), 0);
    const setWeight = loadedSets.reduce((sum, s) => sum + Number(s.totalChickenWeight || 0), 0);

    const birds = setBirds > 0 ? setBirds : Number(d.birdsCount || d.totalBirds || d.totalChickens || 0);
    const weight = setWeight > 0 ? setWeight : Number(d.totalWeight || d.netWeight || 0);

    totalDispatchedBirds += birds;
    totalDispatchedWeight += weight;
  }

  const rawConsumedBags = records.reduce((acc, r) => {
    const bags = r.feedConsumptionBags || kgToBags(r.feedConsumption || 0, KG_PER_BAG);
    return acc + Number(bags || 0);
  }, 0);

  const totalFeedArrivedBags = feedArrivals.reduce((acc, f) => {
    const isReturn = f.transactionType === 'Return';
    const totalKg = Number(f.quantityReceivedKg ?? f.quantityReceived ?? ((Number(f.bagsReceived || 0) * KG_PER_BAG) + Number(f.additionalKg || 0)));
    const bags = totalKg / KG_PER_BAG;
    if (isReturn) {
      return acc - bags;
    } else {
      return acc + bags;
    }
  }, 0);

  const totalArrivedBagsFinal = Math.max(0, totalFeedArrivedBags);
  const hasReturns = feedArrivals.some(f => f.transactionType === 'Return');
  const isBatchDone = (activeBatch?.status || '').toLowerCase() === 'completed';

  const survivingBirds = initialChicks > 0 ? Math.max(0, initialChicks - totalMortality) : remainingChicks;
  const finalDispatchedBirds = isBatchDone
    ? (totalDispatchedBirds > 0 ? Math.max(totalDispatchedBirds, survivingBirds) : survivingBirds)
    : totalDispatchedBirds;

  const totalFeedConsumedBags = (hasReturns || isBatchDone) && totalArrivedBagsFinal > 0
    ? Math.min(rawConsumedBags, totalArrivedBagsFinal)
    : rawConsumedBags;

  const totalFeedConsumedKg = totalFeedConsumedBags * KG_PER_BAG;

  const consumedStr = Number.isInteger(totalFeedConsumedBags) ? totalFeedConsumedBags : parseFloat(totalFeedConsumedBags.toFixed(1));
  const arrivedStr = Number.isInteger(totalArrivedBagsFinal) ? totalArrivedBagsFinal : parseFloat(totalArrivedBagsFinal.toFixed(1));

  const latestRecord = records.length > 0 ? records[0] : null;
  const latestAvgWeight = latestRecord ? Number(latestRecord.averageWeight || 0) : 0;

  // Active/Completed FCR calculation using feed consumed, avg weight, remaining chicks, and total dispatched weight
  const activeFCR = calculateActiveBatchFCR(
    totalFeedConsumedKg,
    latestAvgWeight,
    remainingChicks,
    totalDispatchedWeight,
    isBatchDone
  );

  let flockAgeDays = 1;
  if (activeBatch?.chickArrivalDate) {
    const arrivalDate = new Date(activeBatch.chickArrivalDate);
    const today = new Date();
    const diffMs = Math.max(0, today.getTime() - arrivalDate.getTime());
    flockAgeDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }

  const displayChicksVal = isBatchDone
    ? `${totalDispatchedBirds.toLocaleString()} / ${initialChicks.toLocaleString()}`
    : `${Number(remainingChicks).toLocaleString()} / ${initialChicks.toLocaleString()}`;

  const displayChicksSubtext = isBatchDone
    ? (language === 'ta' ? 'விநியோகிக்கப்பட்டவை / ஆரம்ப குஞ்சுகள்' : 'Dispatched / Initial Chicks')
    : t('liveInitialChicks');

  const dispatchedAvgWeightGrams = totalDispatchedBirds > 0
    ? Math.round((totalDispatchedWeight / totalDispatchedBirds) * 1000)
    : 0;

  const displayAvgWeight = (isBatchDone || totalDispatchedBirds > 0) && dispatchedAvgWeightGrams > 0
    ? `${dispatchedAvgWeightGrams} g`
    : (latestAvgWeight ? `${latestAvgWeight} g` : '0 g');

  const displayAvgWeightSubtext = (isBatchDone || totalDispatchedBirds > 0) && dispatchedAvgWeightGrams > 0
    ? (language === 'ta' ? 'அனுப்பப்பட்ட சராசரி எடை (எடை / கோழிகள்)' : 'Dispatched Avg (Total Wt / Dispatched Birds)')
    : (latestRecord ? `${t('latestEntry')}: ${latestRecord.recordDate}` : t('noDailyRecordsYet'));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-2xl font-black tracking-tight text-slate-900">{t('farmerPortal')}</h1>
        </div>
        {assignedBatches.length > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-emerald-50 border border-emerald-200/80 p-1.5 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-bold text-emerald-900 shadow-xs shrink-0">
            <label className="text-[11px] font-black uppercase text-emerald-800 tracking-wider hidden sm:inline">{t('batchNumber')}:</label>
            <select
              value={activeBatch?.id || ''}
              onChange={(e) => loadFarmerData(e.target.value)}
              className="rounded-lg border border-emerald-300 bg-white py-1 px-2 text-xs font-black text-emerald-950 focus:border-emerald-600 focus:outline-hidden cursor-pointer shadow-2xs"
            >
              {assignedBatches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} {b.batchName ? '• ' + b.batchName : ''} ({b.status})
                </option>
              ))}
            </select>
            {activeBatch && (
              <span className="font-extrabold text-emerald-700 shrink-0">
                Day {flockAgeDays}
              </span>
            )}
            {activeBatch && (
              <Badge variant={activeBatch.status}>{activeBatch.status}</Badge>
            )}
          </div>
        )}
      </div>

      {/* Live Village Weather & Poultry Advisories */}
      <WeatherWidget />

      {!activeBatch ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-900">
          <p className="font-bold text-base">{t('noActiveBatch')}</p>
          <p className="text-xs mt-1">{t('contactAdminBatch')}</p>
        </div>
      ) : (
        <>
          {/* 5 Essential KPI Cards Grid including FCR */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <StatCard
              title={t('chicksCount')}
              value={displayChicksVal}
              subtext={displayChicksSubtext}
              icon={Activity}
              color="emerald"
            />
            <StatCard
              title={t('totalFeedConsumed')}
              value={`${consumedStr} / ${arrivedStr} Bags`}
              subtext={t('consumedTotalArrivedBags')}
              icon={Wheat}
              color="emerald"
            />
            <StatCard
              title={t('totalMortality')}
              value={totalMortality.toLocaleString()}
              subtext={t('cumulativeMortality')}
              icon={AlertCircle}
              color="amber"
            />
            <StatCard
              title={isBatchDone || totalDispatchedBirds > 0 ? (language === 'ta' ? 'அனுப்பப்பட்ட சராசரி எடை' : 'Dispatched Avg Weight') : t('latestAvgWeight')}
              value={displayAvgWeight}
              subtext={displayAvgWeightSubtext}
              icon={Scale}
              color="emerald"
            />
            <StatCard
              title={language === 'ta' ? 'FCR விகிதம்' : 'FCR'}
              value={activeFCR ? activeFCR : '—'}
              subtext={activeFCR ? (language === 'ta' ? 'தீவன மாற்று விகிதம்' : 'Feed Conversion Ratio') : (language === 'ta' ? 'FCR தரவு இல்லை' : 'No FCR data')}
              icon={Activity}
              color="emerald"
            />
          </div>
        </>
      )}
    </div>
  );
};
