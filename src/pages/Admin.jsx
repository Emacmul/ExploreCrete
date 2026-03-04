import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Plus, ShieldCheck, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import WalkEditor from '../components/admin/WalkEditor';
import WalkAdminList from '../components/admin/WalkAdminList';
import VoucherManager from '../components/admin/VoucherManager';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingWalk, setEditingWalk] = useState(null); // null = list view, {} = new, {...} = edit
  const [voucherWalk, setVoucherWalk] = useState(null); // walk to manage vouchers for
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
        {editingWalk !== null ? (
          <WalkEditor
            walk={editingWalk}
            onSave={handleSave}
            onCancel={() => setEditingWalk(null)}
          />
        ) : (
          <WalkAdminList
            walks={walks}
            isLoading={walksLoading}
            onNew={() => setEditingWalk({})}
            onEdit={(walk) => setEditingWalk(walk)}
            onDelete={handleDelete}
          />
        )}
      </main>
    </div>
  );
}