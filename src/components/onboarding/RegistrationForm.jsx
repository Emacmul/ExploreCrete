import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, Mail, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RegistrationForm({ user, onComplete }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    newsletter_opted_in: true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'Required';
    if (!form.last_name.trim()) errs.last_name = 'Required';
    if (!form.date_of_birth) errs.date_of_birth = 'Required';
    if (!form.gender) errs.gender = 'Please select one';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    // Check if an AppUser record already exists for this user
    const existing = await base44.entities.AppUser.filter({ user_id: user.id });
    const payload = {
      user_id: user.id,
      email: user.email,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      newsletter_opted_in: form.newsletter_opted_in,

      registration_complete: true,
    };

    if (existing.length > 0) {
      await base44.entities.AppUser.update(existing[0].id, payload);
    } else {
      await base44.entities.AppUser.create(payload);
    }
    setSaving(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-blue-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <MapPin className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome to Crete Walking Trails</h1>
          <p className="text-blue-300 text-sm">Create your account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 space-y-5">

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-blue-100 text-sm mb-1.5 block">First Name *</Label>
              <Input
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                placeholder="Anna"
                className="bg-white/10 border-white/20 text-white placeholder:text-blue-300/60"
              />
              {errors.first_name && <p className="text-red-400 text-xs mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <Label className="text-blue-100 text-sm mb-1.5 block">Last Name *</Label>
              <Input
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                placeholder="Papadaki"
                className="bg-white/10 border-white/20 text-white placeholder:text-blue-300/60"
              />
              {errors.last_name && <p className="text-red-400 text-xs mt-1">{errors.last_name}</p>}
            </div>
          </div>

          {/* Email (read-only, from auth) */}
          <div>
            <Label className="text-blue-100 text-sm mb-1.5 block">Email Address</Label>
            <Input
              value={user?.email || ''}
              readOnly
              className="bg-white/5 border-white/10 text-blue-200 cursor-default"
            />
          </div>

          {/* Date of birth */}
          <div>
            <Label className="text-blue-100 text-sm mb-1.5 block">Date of Birth *</Label>
            <Input
              type="date"
              value={form.date_of_birth}
              onChange={e => set('date_of_birth', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="bg-white/10 border-white/20 text-white [color-scheme:dark]"
            />
            {errors.date_of_birth && <p className="text-red-400 text-xs mt-1">{errors.date_of_birth}</p>}
          </div>

          {/* Gender */}
          <div>
            <Label className="text-blue-100 text-sm mb-2 block">Gender *</Label>
            <div className="flex gap-3">
              {[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('gender', opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    form.gender === opt.value
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-white/10 border-white/20 text-blue-200 hover:bg-white/15'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.gender && <p className="text-red-400 text-xs mt-1">{errors.gender}</p>}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 pt-1" />

          {/* Newsletter opt-in */}
          <div className="flex gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="shrink-0 mt-0.5">
              <button
                type="button"
                onClick={() => set('newsletter_opted_in', !form.newsletter_opted_in)}
                className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                  form.newsletter_opted_in
                    ? 'bg-amber-500 border-amber-500'
                    : 'bg-white/10 border-white/30'
                }`}
              >
                {form.newsletter_opted_in && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-white text-xs font-semibold">Newsletter</span>
              </div>
              <p className="text-blue-200 text-xs leading-relaxed">
                Receive emails about new walks, routes, and app updates. You can unsubscribe at any time.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold h-11 text-base gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Complete Registration'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}