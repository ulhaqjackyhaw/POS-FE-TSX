import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContextStore } from '../../stores/app-context.store';
import { isGlobalRole } from '../../utils/roleNavigation';
import { storesApi } from '../../api/stores.api';
import { shiftsApi } from '../../api/shifts.api';
import { Store } from '../../types/store';

export const RequireStore: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeStoreId, user, setActiveStore, setActiveTerminal, setActiveWarehouse } =
    useAppContextStore();
  const location = useLocation();

  const [resolving, setResolving] = useState<boolean>(
    !activeStoreId && !!user && !isGlobalRole(user.role)
  );

  useEffect(() => {
    if (activeStoreId || !user || isGlobalRole(user.role)) {
      setResolving(false);
      return;
    }

    let isMounted = true;
    async function autoResolve() {
      try {
        let storeToSet: Store | null = null;
        if (user?.store_ids && user.store_ids.length === 1) {
          storeToSet = await storesApi.getStore(user.store_ids[0]);
        } else {
          const stores = await storesApi.listStores();
          if (stores.length === 1) storeToSet = stores[0];
        }

        if (storeToSet && isMounted) {
          const termList = await storesApi.listTerminals(storeToSet.id);
          setActiveStore(storeToSet.id, storeToSet.name);
          const assignedTerm = user ? termList.find((t) => t.assigned_cashier_id === user.id) : null;
          const termToUse = assignedTerm || (termList.length > 0 ? termList[0] : null);

          if (user?.role === 'cashier') {
            // For cashier, only auto-set terminal if user already has an active shift
            try {
              const activeShift = await shiftsApi.getActiveShift();
              if (activeShift?.terminal_id) {
                const shiftTerm = termList.find((t) => t.id === activeShift.terminal_id);
                setActiveTerminal(activeShift.terminal_id, shiftTerm?.code || 'POS');
              }
            } catch {
              // ignore
            }
          } else if (termToUse) {
            setActiveTerminal(termToUse.id, termToUse.code);
          }
        }
      } catch (e) {
        console.warn('Auto resolve branch failed in RequireStore:', e);
      } finally {
        if (isMounted) setResolving(false);
      }
    }

    autoResolve();
    return () => {
      isMounted = false;
    };
  }, [activeStoreId, user, setActiveStore, setActiveTerminal, setActiveWarehouse]);

  if (resolving) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh] p-8 text-center text-slate-500">
        <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
        <span className="text-sm font-semibold">Menghubungkan cabang operasional...</span>
      </div>
    );
  }

  if (!activeStoreId) {
    return <Navigate to="/select-store" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
