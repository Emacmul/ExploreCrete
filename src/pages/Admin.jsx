import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, ShieldCheck, ArrowLeft, Download, LayoutDashboard, List } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import WalkEditor from '../components/admin/WalkEditor';
import WalkAdminList from '../components/admin/WalkAdminList';
import VoucherManager from '../components/admin/VoucherManager';
import WalksDashboard from '../components/admin/WalksDashboard';
import { getRouteTypeForCategory } from '@/lib/tourCategories';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingWalk, setEditingWalk] = useState(null); // null = list view, {} = new, {...} = edit
  const [voucherWalk, setVoucherWalk] = useState(null); // walk to manage vouchers for
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'walks'
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { base44.auth.redirectToLogin(window.location.href); return; }
      const userData = await base44.auth.me();
      if (userData.role !== 'admin') {
        window.location.href = createPageUrl('Home');
        return;
      }
      setUser(userData);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const { data: walks = [], isLoading: walksLoading } = useQuery({
    queryKey: ['walks'],
    queryFn: () => base44.entities.Walk.list('-created_date'),
    enabled: !!user,
  });

  const handleSave = async (walkData) => {
    if (walkData.id) {
      await base44.entities.Walk.update(walkData.id, walkData);
    } else {
      await base44.entities.Walk.create(walkData);
    }
    queryClient.invalidateQueries({ queryKey: ['walks'] });
    setEditingWalk(null);
  };

  const handleDelete = async (walkId) => {
    await base44.entities.Walk.delete(walkId);
    queryClient.invalidateQueries({ queryKey: ['walks'] });
  };

  const handleExportUsers = async () => {
    const appUsers = await base44.entities.AppUser.list('-created_date', 1000);
    const headers = ['First Name', 'Last Name', 'Email', 'Date of Birth', 'Gender', 'Newsletter Opt-in', 'Registered On'];
    const rows = appUsers.map(u => [
      u.first_name,
      u.last_name,
      u.email,
      u.date_of_birth || '',
      u.gender || '',
      u.newsletter_opted_in ? 'Yes' : 'No',
      u.created_date ? new Date(u.created_date).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `walking-app-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">Admin Panel</h1>
              <p className="text-xs text-slate-400">Crete Walking Trails — Walk Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 mr-2">
              <button
                onClick={() => { setView('dashboard'); setEditingWalk(null); setVoucherWalk(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'dashboard' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </button>
              <button
                onClick={() => { setView('walks'); setEditingWalk(null); setVoucherWalk(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'walks' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <List className="w-3.5 h-3.5" /> Manage Walks
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleExportUsers} className="text-green-300 hover:text-white gap-2 border border-green-700/50 hover:bg-green-800/30">
              <Download className="w-4 h-4" /> Export Users CSV
            </Button>
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white gap-2">
                <ArrowLeft className="w-4 h-4" /> Front End
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => base44.auth.logout()} className="text-slate-300 hover:text-white gap-2">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {view === 'dashboard' && !editingWalk && !voucherWalk ? (
          <WalksDashboard walks={walks} />
        ) : editingWalk !== null ? (
          <WalkEditor
            walk={editingWalk}
            onSave={handleSave}
            onCancel={() => setEditingWalk(null)}
          />
        ) : voucherWalk !== null ? (
          <VoucherManager
            walk={voucherWalk}
            onBack={() => setVoucherWalk(null)}
          />
        ) : (
          <WalkAdminList
            walks={walks}
            isLoading={walksLoading}
            onNew={(categoryCode) => setEditingWalk({ tour_category: categoryCode, route_type: getRouteTypeForCategory(categoryCode) })}
            onEdit={(walk) => setEditingWalk(walk)}
            onDelete={handleDelete}
            onVouchers={(walk) => setVoucherWalk(walk)}
          />
        )}
      </main>
    </div>
  );
}