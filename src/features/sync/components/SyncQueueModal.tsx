import React, { useEffect, useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/data-display/StatusBadge';
import { MoneyText } from '../../../components/data-display/MoneyText';
import { DateTimeText } from '../../../components/data-display/DateTimeText';
import { getAllOfflineTransactions, updateOfflineTransactionStatus } from '../../../db/indexeddb';
import { OfflineTransaction } from '../../../types/api';
import { syncApi } from '../../../api/sync.api';
import { useSyncStore } from '../../../stores/sync.store';
import { useNetworkStore } from '../../../stores/network.store';
import { useToast } from '../../../components/feedback/Toast';
import { RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({ isOpen, onClose, storeId }) => {
  const [transactions, setTransactions] = useState<OfflineTransaction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { refreshCounts } = useSyncStore();
  const { isOnline } = useNetworkStore();
  const { toast } = useToast();

  const loadData = async () => {
    try {
      const all = await getAllOfflineTransactions();
      const filtered = storeId ? all.filter((t) => t.storeId === storeId) : all;
      setTransactions(filtered);
      await refreshCounts();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, storeId]);

  const handleSyncAll = async () => {
    if (!isOnline) {
      toast('Perangkat sedang offline. Tidak dapat menyinkronkan data.', 'warning');
      return;
    }

    const pending = transactions.filter(
      (t) => t.syncStatus === 'pending' || t.syncStatus === 'failed'
    );

    if (pending.length === 0) {
      toast('Tidak ada transaksi pending untuk disinkronkan.', 'info');
      return;
    }

    setIsSyncing(true);
    try {
      await syncApi.syncBatch('terminal-local-device', pending);
      toast('Sinkronisasi batch selesai diproses!', 'success');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal sinkronisasi';
      toast(`Gagal: ${msg}`, 'error');
      await loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryItem = async (tx: OfflineTransaction) => {
    if (!isOnline) {
      toast('Perangkat sedang offline.', 'warning');
      return;
    }
    setIsSyncing(true);
    try {
      await updateOfflineTransactionStatus(tx.clientTransactionId, 'pending');
      await syncApi.syncBatch('terminal-local-device', [tx]);
      toast('Transaksi berhasil disinkronkan!', 'success');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal';
      toast(msg, 'error');
      await loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingCount = transactions.filter(
    (t) => t.syncStatus === 'pending' || t.syncStatus === 'failed'
  ).length;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Antrean Transaksi Offline (IndexedDB)"
      description="Daftar transaksi tunai yang disimpan secara lokal dan menunggu sinkronisasi ke server pusat."
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400">
            Total {transactions.length} transaksi lokal ({pendingCount} pending)
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Tutup
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
              isLoading={isSyncing}
              disabled={pendingCount === 0 || !isOnline}
              onClick={handleSyncAll}
            >
              Sinkronkan Sekarang
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Tidak ada transaksi di antrean lokal.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 max-h-[60vh] overflow-y-auto pr-1">
            {transactions.map((tx) => (
              <div key={tx.clientTransactionId} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-200">
                      {tx.receiptNumber || tx.clientTransactionId.substring(0, 12)}
                    </span>
                    <StatusBadge status={tx.syncStatus} type="sync" size="sm" />
                  </div>
                  <div className="text-slate-400 text-[11px] flex items-center gap-3">
                    <DateTimeText value={tx.createdAt} />
                    <span>• {tx.items.length} item</span>
                    <span>• Kasir: {tx.cashierName || tx.cashierId.substring(0, 8)}</span>
                  </div>
                  {tx.lastErrorMessage && (
                    <div className="text-[11px] text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded flex items-center gap-1.5 w-fit">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{tx.lastErrorMessage}</span>
                    </div>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <MoneyText amount={tx.expectedTotalMinor} size="sm" />
                  <div>
                    {tx.syncStatus === 'failed' || tx.syncStatus === 'pending' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetryItem(tx)}
                        disabled={isSyncing || !isOnline}
                        className="text-[11px] py-1 px-2.5 h-auto"
                      >
                        Coba Lagi
                      </Button>
                    ) : tx.syncStatus === 'synced' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Sukses
                      </span>
                    ) : tx.syncStatus === 'conflict' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                        <ShieldAlert className="w-3 h-3" /> Konflik
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
};
