import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../../../api/auth.api';
import { useAppContextStore } from '../../../stores/app-context.store';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/feedback/Toast';
import { Lock, User, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

import { isGlobalRole, getFocusMenuForRole } from '../../../utils/roleNavigation';
import { storesApi } from '../../../api/stores.api';
import { shiftsApi } from '../../../api/shifts.api';
import { Store } from '../../../types/store';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, setActiveStore, setActiveTerminal } = useAppContextStore();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setGeneralError(null);
    try {
      const loginRes = await authApi.login(data);
      if (!loginRes.access_token) {
        throw new Error('Token akses tidak diterima dari server.');
      }

      useAppContextStore.getState().setAuth(loginRes.access_token, loginRes.user || {
        id: '',
        username: data.username,
        role: 'user',
        permissions: [],
      });

      const userProfile = await authApi.getMe();
      setAuth(loginRes.access_token, userProfile);

      toast(`Selamat datang kembali, ${userProfile.full_name || userProfile.username}!`, 'success');

      const isGlobal = isGlobalRole(userProfile.role);
      const targetMenu = getFocusMenuForRole(userProfile.role);

      // If user is not global (e.g. cashier, manager, warehouse staff) and branch is determined
      if (!isGlobal) {
        let storeToSet: Store | null = null;
        try {
          if (userProfile.store_ids && userProfile.store_ids.length === 1) {
            storeToSet = await storesApi.getStore(userProfile.store_ids[0]);
          } else {
            const availableStores = await storesApi.listStores();
            if (availableStores.length === 1) {
              storeToSet = availableStores[0];
            }
          }

          if (storeToSet) {
            const termList = await storesApi.listTerminals(storeToSet.id);
            setActiveStore(storeToSet.id, storeToSet.name);

            // Cashier specific routing
            if (userProfile.role === 'cashier') {
              try {
                const activeShift = await shiftsApi.getActiveShift();
                if (activeShift && activeShift.terminal_id) {
                  const shiftTerm = termList.find((t) => t.id === activeShift.terminal_id);
                  setActiveTerminal(activeShift.terminal_id, shiftTerm?.code || 'POS');
                  toast(`Melanjutkan sesi shift aktif kasir (${shiftTerm?.code || 'POS'})`, 'success');
                  navigate('/pos', { replace: true });
                  return;
                }
              } catch (e) {
                console.warn('Check active shift error on cashier login:', e);
              }

              // Cashier has NO active shift yet -> Show available inactive POS cashier terminals!
              toast(`Pilih meja kasir yang kosong/tersedia untuk bertugas`, 'info');
              navigate('/select-terminal', { replace: true });
              return;
            }

            const assignedTerm = termList.find((t) => t.assigned_cashier_id === userProfile.id);
            const termToUse = assignedTerm || (termList.length > 0 ? termList[0] : null);

            if (termToUse) {
              setActiveTerminal(termToUse.id, termToUse.code);
            }

            toast(`Cabang operasional: ${storeToSet.name}`, 'info');
            navigate(targetMenu, { replace: true });
            return;
          }
        } catch (e) {
          console.warn('Auto store assignment error:', e);
        }
      }

      const origin = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      if (origin && origin !== '/login' && origin !== '/select-store') {
        navigate(origin, { replace: true });
      } else {
        if (userProfile.role === 'cashier') {
          navigate('/select-terminal', { replace: true });
        } else {
          navigate(isGlobal ? '/select-store' : targetMenu, { replace: true });
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Kredensial login tidak valid. Silakan coba lagi.';
      setGeneralError(msg);
      toast(msg, 'error');
    }
  };

  const handleQuickFill = (username: string, pass = 'password123') => {
    setValue('username', username);
    setValue('password', pass);
  };

  return (
    <div className="w-full bg-white border-2 border-slate-200 rounded-3xl p-8 sm:p-10 shadow-2xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-300 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-700 shadow-sm">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Masuk Sistem POS ERP
        </h1>
        <p className="text-sm sm:text-base font-semibold text-slate-600 mt-2">
          Sistem Point of Sale & Backoffice Multi-Outlet Retail
        </p>
      </div>

      {generalError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border-2 border-rose-200 text-rose-800 text-sm font-bold text-center">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Username Akun"
          placeholder="Masukkan username Anda"
          leftIcon={<User className="w-5 h-5 text-slate-500" />}
          error={errors.username?.message}
          {...register('username')}
          autoFocus
        />

        <Input
          label="Kata Sandi (Password)"
          type={showPassword ? 'text' : 'password'}
          placeholder="Masukkan password Anda"
          leftIcon={<Lock className="w-5 h-5 text-slate-500" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-500 hover:text-slate-800 cursor-pointer p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-7 text-lg py-4 shadow-lg shadow-emerald-700/20"
        >
          Masuk ke Akun
        </Button>
      </form>

      {/* Quick Account Fill for testing */}
      <div className="mt-8 pt-6 border-t-2 border-slate-200">
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-slate-600 uppercase tracking-wider mb-4">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Akun Demo Cepat (Klik untuk Isi Langsung)</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickFill('admin')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-400 text-slate-800 text-center cursor-pointer transition-all shadow-sm"
          >
            <div className="font-extrabold text-sm sm:text-base text-emerald-700">Owner</div>
            <div className="text-xs text-slate-500 font-mono font-bold mt-0.5">admin</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('kasir1')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-sky-50 border-2 border-slate-200 hover:border-sky-400 text-slate-800 text-center cursor-pointer transition-all shadow-sm"
          >
            <div className="font-extrabold text-sm sm:text-base text-sky-700">Kasir</div>
            <div className="text-xs text-slate-500 font-mono font-bold mt-0.5">kasir1</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('manager1')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50 border-2 border-slate-200 hover:border-purple-400 text-slate-800 text-center cursor-pointer transition-all shadow-sm"
          >
            <div className="font-extrabold text-sm sm:text-base text-purple-700">Manager</div>
            <div className="text-xs text-slate-500 font-mono font-bold mt-0.5">manager1</div>
          </button>
        </div>
      </div>
    </div>
  );
};
