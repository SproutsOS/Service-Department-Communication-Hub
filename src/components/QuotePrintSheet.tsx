import React from 'react';
import { StandaloneQuote } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { Printer, X, ShieldCheck, Phone, Mail, Car, User, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface QuotePrintSheetProps {
  quote: StandaloneQuote;
  onClose: () => void;
  onRollToRO?: () => void;
}

export const QuotePrintSheet: React.FC<QuotePrintSheetProps> = ({
  quote,
  onClose,
  onRollToRO
}) => {
  const { shopName, currentUser } = useApp();

  const handlePrint = () => {
    window.print();
  };

  const dealershipTitle = shopName || 'Premier Automotive Service Center';

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 my-auto print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Print Controls (Hidden on Print) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-600 text-white shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Customer Repair Estimate & Quote Sheet</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  {quote.quoteNumber || `#${quote.id}`}
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Official itemized price estimate ready for customer presentation, authorization, or printout.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRollToRO && quote.status !== 'ROLLED_TO_RO' && (
              <button
                type="button"
                onClick={onRollToRO}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Roll to Repair Order</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Estimate</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Content */}
        <div id="quote-printable-area" className="p-6 sm:p-8 space-y-6 text-slate-900 bg-white overflow-y-auto max-h-[85vh] print:max-h-none print:overflow-visible print:p-0">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b-2 border-slate-900 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                  {dealershipTitle}
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Authorized Certified Automotive Service & Parts Department
              </p>
              <div className="text-[11px] text-slate-600 mt-2 space-y-0.5">
                <p>100 Dealership Way, Service Drive Entrance</p>
                <p>Service Direct: (555) 321-7890 • Parts Counter: (555) 321-7892</p>
              </div>
            </div>

            <div className="sm:text-right bg-slate-50 p-3.5 rounded-xl border border-slate-200 min-w-[200px] print:bg-white print:border-slate-300">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                Repair Price Estimate
              </span>
              <div className="text-xl font-black text-blue-900 font-mono mt-0.5">
                {quote.quoteNumber || `#${quote.id}`}
              </div>
              <div className="text-xs text-slate-600 mt-1 font-medium">
                <div>Date Quoted: <strong>{new Date(quote.createdAt).toLocaleDateString()}</strong></div>
                <div className="text-amber-800 font-bold mt-0.5">
                  Valid Through: {new Date(quote.expirationDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs print:bg-white print:border-slate-300">
            {/* Customer Box */}
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Customer Information
              </span>
              <div className="text-sm font-black text-slate-900">{quote.customerName}</div>
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{quote.customerPhone}</span>
              </div>
              {quote.customerEmail && (
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{quote.customerEmail}</span>
                </div>
              )}
            </div>

            {/* Vehicle Box */}
            <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4 print:border-slate-300">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Vehicle Specifications
              </span>
              <div className="text-sm font-black text-slate-900">
                {quote.vehicle.year} {quote.vehicle.make} {quote.vehicle.model}
              </div>
              <div className="text-slate-700 font-mono font-medium">
                VIN: <strong className="text-slate-900">{quote.vehicle.vin || 'ON FILE'}</strong>
              </div>
              <div className="flex items-center gap-3 text-slate-600 font-medium">
                {quote.vehicle.mileage && (
                  <span>Mileage: <strong>{Number(quote.vehicle.mileage).toLocaleString()} mi</strong></span>
                )}
                <span>Advisor: <strong>{quote.advisorName}</strong></span>
              </div>
            </div>
          </div>

          {/* Itemized Job Lines Table */}
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-200">
              Itemized Service & Repair Operations ({quote.lines.length} Line{quote.lines.length === 1 ? '' : 's'})
            </h2>

            {quote.lines.map((line, idx) => {
              const linePartsTotal = line.parts.reduce((sum, p) => sum + p.subtotal, 0);
              const lineGrandTotal = line.laborSubtotal + linePartsTotal;

              return (
                <div 
                  key={line.id || idx} 
                  className="rounded-xl border border-slate-300 overflow-hidden bg-white shadow-2xs print:shadow-none"
                >
                  {/* Line Header */}
                  <div className="px-4 py-2.5 bg-slate-100 flex items-center justify-between gap-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-black">
                        Line {line.lineNum || idx + 1}
                      </span>
                      <span className="font-extrabold text-xs text-slate-900">
                        {line.concern}
                      </span>
                    </div>

                    <div className="text-xs font-black text-slate-900 font-mono">
                      Line Total: {formatCurrency(lineGrandTotal)}
                    </div>
                  </div>

                  <div className="p-3 text-xs space-y-2">
                    {/* Cause & Correction notes if any */}
                    {line.correction && (
                      <div className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-200">
                        <strong>Recommended Scope:</strong> {line.correction}
                      </div>
                    )}

                    {/* Labor Row */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Professional Diagnostic & Installation Labor</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({line.laborHours} hrs @ ${line.laborRate.toFixed(2)}/hr)
                        </span>
                      </div>
                      <div className="font-mono font-bold text-slate-900">
                        {formatCurrency(line.laborSubtotal)}
                      </div>
                    </div>

                    {/* Parts Breakdown Table if parts exist */}
                    {line.parts && line.parts.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Required OEM & Approved Parts:
                        </span>
                        <div className="bg-slate-50/70 rounded-lg border border-slate-200 overflow-hidden">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                              <tr>
                                <th className="py-1 px-2.5">Part #</th>
                                <th className="py-1 px-2.5">Description</th>
                                <th className="py-1 px-2 text-center">Qty</th>
                                <th className="py-1 px-2 text-right">Price</th>
                                <th className="py-1 px-2.5 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {line.parts.map((part, pIdx) => (
                                <tr key={part.id || pIdx} className="hover:bg-slate-100/50">
                                  <td className="py-1 px-2.5 font-mono text-[10px] font-bold text-slate-700">
                                    {part.partNumber || 'OEM-SPEC'}
                                  </td>
                                  <td className="py-1 px-2.5 font-medium text-slate-800">
                                    {part.description}
                                  </td>
                                  <td className="py-1 px-2 text-center font-bold text-slate-700">
                                    {part.quantity}
                                  </td>
                                  <td className="py-1 px-2 text-right font-mono text-slate-700">
                                    {formatCurrency(part.price)}
                                  </td>
                                  <td className="py-1 px-2.5 text-right font-mono font-bold text-slate-900">
                                    {formatCurrency(part.subtotal)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes and Financial Totals Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Left Box: Customer Notes & Warranty */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 print:bg-white print:border-slate-300">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Warranty & Quality Guarantee
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                All repairs include our <strong>24-Month / 24,000-Mile Nationwide Parts & Labor Limited Warranty</strong>. Certified technicians utilize factory-approved diagnostic tools and genuine OEM replacement components.
              </p>
              {quote.customerNotes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Special Instructions / Notes:</span>
                  <p className="text-[11px] text-slate-700 italic mt-0.5">{quote.customerNotes}</p>
                </div>
              )}
            </div>

            {/* Right Box: Grand Totals Summary */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 text-xs shadow-md print:bg-slate-100 print:text-slate-900 print:border print:border-slate-300">
              <div className="flex justify-between text-slate-300 print:text-slate-700">
                <span>Total Labor:</span>
                <span className="font-mono font-bold text-white print:text-slate-900">{formatCurrency(quote.totalLaborCost)}</span>
              </div>

              <div className="flex justify-between text-slate-300 print:text-slate-700">
                <span>Total Parts & Materials:</span>
                <span className="font-mono font-bold text-white print:text-slate-900">{formatCurrency(quote.totalPartsCost)}</span>
              </div>

              {quote.shopSuppliesFee > 0 && (
                <div className="flex justify-between text-slate-300 print:text-slate-700">
                  <span>Shop Supplies & Environmental Fee:</span>
                  <span className="font-mono font-bold text-white print:text-slate-900">{formatCurrency(quote.shopSuppliesFee)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-300 print:text-slate-700">
                <span>Estimated Sales Tax ({((quote.taxRate || 0.07) * 100).toFixed(1)}%):</span>
                <span className="font-mono font-bold text-white print:text-slate-900">
                  {quote.isTaxExempt ? 'EXEMPT' : formatCurrency(quote.taxAmount)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-700 print:border-slate-300 flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block text-blue-300 print:text-blue-900">
                    Total Estimated Investment
                  </span>
                  <span className="text-[10px] text-slate-400 print:text-slate-600">Parts, Labor & Fees Included</span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400 print:text-emerald-800">
                  {formatCurrency(quote.grandTotal)}
                </div>
              </div>
            </div>
          </div>

          {/* Legal Disclaimer & Customer Authorization Signature Block */}
          <div className="pt-4 border-t-2 border-slate-200 text-xs space-y-4">
            <p className="text-[10px] text-slate-500 leading-tight">
              <strong>Estimate Terms & Conditions:</strong> This price estimate is valid for thirty (30) days from the quote date. Teardown or diagnostic disassembly may reveal unforeseen internal component damage or wear exceeding this estimate. No additional work or parts will be charged without prior verbal or written authorization from the customer.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="border-t border-slate-900 pt-1">
                <span className="text-[11px] font-bold text-slate-800 block">Customer Authorization Signature</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">I authorize the repair work and parts listed above.</span>
              </div>

              <div className="border-t border-slate-900 pt-1">
                <span className="text-[11px] font-bold text-slate-800 block">Date Authorized / Time</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Approval Reference: Verbal [ ] • Signed [ ] • SMS [ ]</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
