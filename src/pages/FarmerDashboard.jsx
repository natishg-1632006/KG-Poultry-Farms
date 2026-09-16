import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { dbGetBatches, dbGetDailyRecords, dbGetFeedArrivals } from '../services/dbService';
import { formatFeedStock, kgToBags } from '../utils/calculations';
import { KG_PER_BAG } from '../constants/companyTargets';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { WeatherWidget } from '../components/common/WeatherWidget';
import { ClipboardList, Wheat, Syringe, Truck, Activity, ArrowRight, Layers, AlertCircle, Scale, Calendar } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const FarmerDashboard = () => {
  const { userProfile } = useAuth();
  const { t } = useLanguage();
  const [assignedBatches, setAssignedBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [records, setRecords] = useState([]);
  const [feedArrivals, setFeedArrivals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFarmerData();
  }, [userProfile]);

  async function loadFarmerData() {
    try {
      const allBatches = await dbGetBatches();
      const farmerBatches = allBatches;
      setAssignedBatches(farmerBatches);
      const activeBatchesList = farmerBatches.filter(b => (b.status || '').toLowerCase() === 'active');
      const currentActive = activeBatchesList.length > 0
        ? activeBatchesList[activeBatchesList.length - 1]
        : (farmerBatches.length > 0 ? farmerBatches[farmerBatches.length - 1] : null);
      setActiveBatch(currentActive);

      if (currentActive) {
        const [rMap, fList] = await Promise.all([
          dbGetDailyRecords(currentActive.id),
          dbGetFeedArrivals(currentActive.id)
        ]);
        setRecords(Object.values(rMap).sort((a, b) => b.recordDate.localeCompare(a.recordDate)));
        setFeedArrivals(fList || []);
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

  const totalFeedConsumedBags = records.reduce((acc, r) => {
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

  const consumedStr = Number.isInteger(totalFeedConsumedBags) ? totalFeedConsumedBags : parseFloat(totalFeedConsumedBags.toFixed(1));
  const arrivedStr = Number.isInteger(totalArrivedBagsFinal) ? totalArrivedBagsFinal : parseFloat(totalArrivedBagsFinal.toFixed(1));

  const latestRecord = records.length > 0 ? records[0] : null;
  const latestAvgWeight = latestRecord ? Number(latestRecord.averageWeight || 0) : 0;

  let flockAgeDays = 1;
  if (activeBatch?.chickArrivalDate) {
    const arrivalDate = new Date(activeBatch.chickArrivalDate);
    const today = new Date();
    const diffMs = Math.max(0, today.getTime() - arrivalDate.getTime());
    flockAgeDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-2xl font-black tracking-tight text-slate-900">{t('farmerPortal')}</h1>
        </div>
        {activeBatch && (
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-emerald-50 border border-emerald-200/80 px-2.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold text-emerald-900 shadow-xs shrink-0">
            <span>{t('batchNumber')}: {activeBatch.batchNumber} • <strong className="text-emerald-700">Day {flockAgeDays}</strong></span>
            <Badge variant={activeBatch.status}>{activeBatch.status}</Badge>
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
          {/* 4 Essential KPI Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t('chicksCount')}
              value={`${Number(remainingChicks).toLocaleString()} / ${initialChicks.toLocaleString()}`}
              subtext={t('liveInitialChicks')}
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
              title={t('latestAvgWeight')}
              value={`${latestAvgWeight} g`}
              subtext={latestRecord ? `${t('latestEntry')}: ${latestRecord.recordDate}` : t('noDailyRecordsYet')}
              icon={Scale}
              color="emerald"
            />
          </div>
        </>
      )}
    </div>
  );
};
