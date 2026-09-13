import React, { useState, useEffect } from 'react';
import { dbGetInvoices } from '../services/dbService';
import { Modal } from '../components/common/Modal';
import { Printer, Download, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

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

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const el = document.getElementById('printable-invoice');
    if (!el) return;
    try {
      const canvas = await html2canvas(el);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${selectedInvoice.id}.pdf`);
    } catch (err) {
      alert('PDF generation failed.');
    }
  };

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
          <p className="text-sm font-medium text-slate-500">View and print invoices linked to broiler chicken sales dispatches.</p>
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
                    <td className="py-3 px-2 font-black text-indigo-700">₹ {(inv.totalAmount || (inv.totalWeightKg * 135)).toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                      >
                        View & Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail & Print Modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Invoice ${selectedInvoice?.id}`}
        maxWidth="max-w-2xl"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div id="printable-invoice" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">KG POULTRY FARMS</h2>
                  <p className="text-xs text-slate-500 font-medium">Broiler Meat Sales Invoice</p>
                  <p className="text-xs text-slate-400">Phone: +91 98765 43210</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-600">{selectedInvoice.id}</div>
                  <div className="text-xs text-slate-500 font-bold">Date: {selectedInvoice.invoiceDate}</div>
                </div>
              </div>

              {/* Customer & Vehicle Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Billed To:</span>
                  <div className="font-bold text-slate-900 mt-1">{selectedInvoice.customerName}</div>
                  <div className="text-slate-600">Phone: {selectedInvoice.customerPhone}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Dispatch Details:</span>
                  <div className="font-bold text-slate-900 mt-1">Vehicle: {selectedInvoice.vehicleNumber}</div>
                  <div className="text-slate-600">Driver: {selectedInvoice.driverName}</div>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3">Birds Count</th>
                    <th className="p-3">Net Weight (kg)</th>
                    <th className="p-3">Rate / kg</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="p-3 font-bold text-slate-900">Broiler Live Chicken Dispatch</td>
                    <td className="p-3 text-slate-700">{selectedInvoice.totalChickens}</td>
                    <td className="p-3 font-bold text-emerald-700">{selectedInvoice.totalWeightKg} kg</td>
                    <td className="p-3 text-slate-700">₹ {selectedInvoice.ratePerKg || 135}</td>
                    <td className="p-3 text-right font-black text-slate-900">₹ {(selectedInvoice.totalAmount || (selectedInvoice.totalWeightKg * 135)).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {/* Summary */}
              <div className="flex justify-between items-center border-t border-slate-200 pt-4">
                <div className="text-xs text-slate-500">
                  <p className="font-bold">Terms & Conditions:</p>
                  <p>Payment due upon receipt. Goods once sold will not be returned.</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500">Grand Total:</span>
                  <div className="text-2xl font-black text-emerald-600">
                    ₹ {(selectedInvoice.totalAmount || (selectedInvoice.totalWeightKg * 135)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" /> Print Invoice
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
              >
                <Download className="h-4 w-4" /> Export PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
