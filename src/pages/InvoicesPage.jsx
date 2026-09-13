import React, { useState, useEffect } from 'react';
import { dbGetInvoices, dbGetBoxSets } from '../services/dbService';
import { TraderInvoiceModal } from '../components/invoice/TraderInvoiceModal';
import { Search } from 'lucide-react';

export const InvoicesPage = () => {
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

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Invoice History...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Dispatch Invoice History</h1>
          <p className="text-sm font-medium text-slate-500">View, print, and export official verified trader sales invoices.</p>
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
            placeholder="Search invoice by INV number, customer, or vehicle number..."
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
                <th className="pb-3 px-2">Invoice #</th>
                <th className="pb-3 px-2">Date</th>
                <th className="pb-3 px-2">Customer / Trader</th>
                <th className="pb-3 px-2">Vehicle #</th>
                <th className="pb-3 px-2">Weight (kg)</th>
                <th className="pb-3 px-2">Rate / kg</th>
                <th className="pb-3 px-2">Total Amount</th>
                <th className="pb-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">No dispatch invoices found.</td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-2 font-bold text-slate-900">{inv.id}</td>
                    <td className="py-3 px-2 text-slate-600">{inv.invoiceDate}</td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-800">{inv.customerName || 'Wholesale Buyer'}</div>
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
                        View Invoice PDF & Share
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
