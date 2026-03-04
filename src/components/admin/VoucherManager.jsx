import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Ticket, Download, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';

function generateCode(walkCode) {
  // Format: WALKCODE-XXXX-XXXX  (alphanumeric, uppercase, no ambiguous chars)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const prefix = (walkCode || 'CW').toUpperCase();
  return `${prefix}-${seg()}-${seg()}`;
}

export default function VoucherManager({ walk, onBack }) {
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ['vouchers', walk.id],
    queryFn: () => base44.entities.VoucherCode.filter({ walk_id: walk.id }, '-created_date', 500),
  });

  const unusedCount = vouchers.filter(v => !v.used).length;
  const usedCount = vouchers.filter(v => v.used).length;

  const handleGenerate = async () => {
    setGenerating(true);
    // Collect all existing codes to guarantee uniqueness
    const allExisting = await base44.entities.VoucherCode.list('-created_date', 10000);
    const existingSet = new Set(allExisting.map(v => v.code));

    const batch = [];
    while (batch.length < 50) {
      const code = generateCode();
      if (!existingSet.has(code)) {
        existingSet.add(code);
        batch.push({ code, walk_id: walk.id, walk_name: walk.name, used: false });
      }
    }
    await base44.entities.VoucherCode.bulkCreate(batch);
    queryClient.invalidateQueries({ queryKey: ['vouchers', walk.id] });
    setGenerating(false);
  };

  const handleExportCSV = () => {
    const unused = vouchers.filter(v => !v.used);
    const rows = [['Code', 'Walk', 'Status'], ...unused.map(v => [v.code, v.walk_name, 'Unused'])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vouchers-${walk.code}-unused.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 mt-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-300 hover:text-white gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Ticket className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Voucher Codes — {walk.name}</h2>
            <p className="text-xs text-slate-400">{walk.code}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl p-4 text-center border border-slate-700">
          <p className="text-3xl font-bold text-white">{vouchers.length}</p>
          <p className="text-xs text-slate-400 mt-1">Total Generated</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 text-center border border-green-900">
          <p className="text-3xl font-bold text-green-400">{unusedCount}</p>
          <p className="text-xs text-slate-400 mt-1">Available</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 text-center border border-slate-700">
          <p className="text-3xl font-bold text-slate-400">{usedCount}</p>
          <p className="text-xs text-slate-400 mt-1">Redeemed</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
          {generating ? 'Generating…' : 'Generate 50 New Codes'}
        </Button>
        {unusedCount > 0 && (
          <Button variant="outline" onClick={handleExportCSV} className="border-slate-600 text-slate-300 hover:text-white gap-2">
            <Download className="w-4 h-4" /> Export Unused as CSV
          </Button>
        )}
      </div>

      {/* Code list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      ) : vouchers.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Ticket className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No codes yet</p>
          <p className="text-sm">Click "Generate 50 New Codes" to get started</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {vouchers.map(v => (
            <div key={v.id} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-amber-300 tracking-wider">{v.code}</span>
              {v.used ? (
                <div className="flex items-center gap-2 text-right">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-slate-500">{v.used_by}</p>
                    <p className="text-xs text-slate-600">{v.used_at ? new Date(v.used_at).toLocaleDateString() : ''}</p>
                  </div>
                  <Badge className="bg-slate-700 text-slate-400 shrink-0 gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Used
                  </Badge>
                </div>
              ) : (
                <Badge className="bg-green-900 text-green-300 shrink-0 gap-1">
                  <Clock className="w-3 h-3" /> Available
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}