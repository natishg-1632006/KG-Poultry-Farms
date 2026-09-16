import React, { useState, useEffect } from 'react';
import { dbGetInvoices, dbGetBoxSets } from '../services/dbService';
import { useLanguage } from '../context/LanguageContext';
import { TraderInvoiceModal } from '../components/invoice/TraderInvoiceModal';
import { Search } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const InvoicesPage = () => {
  const { language } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedBoxSets, setSelectedBoxSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    if (selectedInvoice && selectedInvoice.dispatchId) {
      dbGetBoxSets(selectedInvoice.dispatchId)
        .then((sets) => setSelectedBoxSets(sets || []))
        .catch(() => setSelectedBoxSets([]));
    } else {
      setSelectedBoxSets([]);
    }
  }, [selectedInvoice]);

  async function loadInvoices() {
    try {
      const list = await dbGetInvoices();
      setInvoices(list);
    } catch (err) {
      console.error('Failed loading invoices:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredInvoices = invoices.filter(inv =>
    inv.id.toLowerCase().includes(search.toLowerCase()) ||
    (inv.customerName && inv.customerName.toLowerCase().includes(search.toLowerCase())) ||
    (inv.vehicleNumber && inv.vehicleNumber.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <LoadingSpinner message={language === 'ta' ? 'ரசீது வரலாறு ஏற்றப்படுகிறது...' : 'Loading Invoice History...'} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <h1 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 truncate">
            {language === 'ta' ? 'அனுப்பல் ரசீது வரலாறு' : 'Dispatch Invoice History'}
          </h1>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'ta' ? 'ரசீது எண், வாடிக்கையாளர் அல்லது வாகன எண் மூலம் தேடுக...' : 'Search invoice by INV number, customer, or vehicle number...'}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                <th className="pb-3 px-2">{language === 'ta' ? 'ரசீது எண்' : 'Invoice #'}</th>
                <th className="pb-3 px-2">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                <th className="pb-3 px-2">{language === 'ta' ? 'வாடிக்கையாளர்' : 'Customer / Trader'}</th>
                <th className="pb-3 px-2">{language === 'ta' ? 'வாகன எண்' : 'Vehicle #'}</th>
                <th className="pb-3 px-2">{language === 'ta' ? 'எடை (கிலோ)' : 'Weight (kg)'}</th>
                <th className="pb-3 px-2">{language === 'ta' ? 'விலை / கிலோ' : 'Rate / kg'}</th>
                <th className="pb-3 px-2">{language === 'ta' ? 'மொத்த தொகை' : 'Total Amount'}</th>
                <th className="pb-3 px-2 text-right">{language === 'ta' ? 'செயல்கள்' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    {language === 'ta' ? 'ரசீதுகள் எதுவும் கிடைக்கவில்லை.' : 'No dispatch invoices found.'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-2 font-bold text-slate-900">{inv.id}</td>
                    <td className="py-3 px-2 text-slate-600">{inv.invoiceDate}</td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-800">{inv.customerName || (language === 'ta' ? 'மொத்த வியாபாரி' : 'Wholesale Buyer')}</div>
                      <div className="text-[10px] text-slate-400">{inv.customerPhone}</div>
                    </td>
                    <td className="py-3 px-2 text-slate-600">{inv.vehicleNumber}</td>
                    <td className="py-3 px-2 font-bold text-emerald-600">{inv.totalWeightKg} kg</td>
                    <td className="py-3 px-2 text-slate-700 font-medium">₹ {inv.ratePerKg || 135}</td>
                    <td className="py-3 px-2 font-black text-emerald-700">₹ {(inv.totalAmount || (inv.totalWeightKg * 135)).toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        {language === 'ta' ? 'ரசீது பார்க்க & பகிர' : 'View Invoice PDF & Share'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trader Invoice Modal */}
      <TraderInvoiceModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoiceData={selectedInvoice}
        boxSets={selectedBoxSets}
      />
    </div>
  );
};
