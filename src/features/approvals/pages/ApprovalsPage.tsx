import React, { useState, useEffect } from 'react';
import { approvalsApi } from '../../../api/approvals.api';
import { ApprovalRequest } from '../../../types/api';
import { StatusBadge } from '../../../components/data-display/StatusBadge';
import { DateTimeText } from '../../../components/data-display/DateTimeText';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Dialog } from '../../../components/ui/Dialog';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../components/feedback/Toast';
import { usePermission } from '../../../hooks/usePermission';
import { CheckCircle, XCircle, ShieldCheck } from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { check, isOwnerOrAdmin } = usePermission();
  const canReview = isOwnerOrAdmin || check('approval.review') || check('approval:review');
  const { toast } = useToast();

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadApprovals = async () => {
    setIsLoading(true);
    try {
      const data = await approvalsApi.listApprovals({
        status: statusFilter || undefined,
      });
      setApprovals(data || []);
    } catch {
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [statusFilter]);

  const handleOpenReview = (req: ApprovalRequest, decision: 'approve' | 'reject') => {
    setSelectedReq(req);
    setReviewDecision(decision);
    setReviewNote('');
    setFormError(null);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await approvalsApi.reviewApproval(selectedReq.id, {
        decision: reviewDecision,
        note: reviewNote.trim() || undefined,
        rejection_reason: reviewDecision === 'reject' ? reviewNote.trim() : undefined,
      });

      toast(
        `Permintaan approval berhasil ${reviewDecision === 'approve' ? 'disetujui' : 'ditolak'}!`,
        'success'
      );
      setSelectedReq(null);
      await loadApprovals();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses review approval';
      setFormError(msg);
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Persetujuan Tindakan Kritis (Approvals)
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Review dan audit otorisasi supervisor untuk void transaksi, refund dana, dan penyesuaian stok.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 bg-slate-200 p-1.5 rounded-2xl text-sm font-bold">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-xl cursor-pointer transition-all ${
              statusFilter === '' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-4 py-2 rounded-xl cursor-pointer transition-all ${
              statusFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Menunggu Review
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-4 py-2 rounded-xl cursor-pointer transition-all ${
              statusFilter === 'APPROVED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Disetujui
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-4 py-2 rounded-xl cursor-pointer transition-all ${
              statusFilter === 'REJECTED' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ditolak
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingState message="Memuat daftar permintaan approval..." rows={5} />
      ) : approvals.length === 0 ? (
        <EmptyState
          title="Tidak Ada Permintaan Approval"
          description="Semua tindakan operasional berjalan normal dan tidak ada request persetujuan yang menunggu."
          icon={<ShieldCheck className="w-8 h-8 text-emerald-600" />}
        />
      ) : (
        <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-xs sm:text-sm">
                  <th className="py-4 px-5">Waktu Request</th>
                  <th className="py-4 px-5">Jenis Tindakan</th>
                  <th className="py-4 px-5">Alasan Pemohon</th>
                  <th className="py-4 px-5">Pemohon</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  {canReview && <th className="py-4 px-5 text-center">Aksi Review</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {approvals.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5">
                      <DateTimeText value={req.created_at} className="text-slate-800 text-sm font-semibold" />
                    </td>
                    <td className="py-4 px-5 font-mono font-bold text-slate-900">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-900 text-sm font-bold">
                        {req.action_type}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-800 font-medium text-sm sm:text-base max-w-sm">{req.reason}</td>
                    <td className="py-4 px-5 text-slate-700 font-semibold text-sm sm:text-base">
                      {req.requester_name || req.requested_by.substring(0, 8)}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <StatusBadge status={req.status} type="approval" size="md" />
                    </td>
                    {canReview && (
                      <td className="py-4 px-5 text-center">
                        {req.status === 'PENDING' || req.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<CheckCircle className="w-4 h-4" />}
                              onClick={() => handleOpenReview(req, 'approve')}
                              className="font-bold"
                            >
                              Setujui
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              leftIcon={<XCircle className="w-4 h-4" />}
                              onClick={() => handleOpenReview(req, 'reject')}
                              className="font-bold"
                            >
                              Tolak
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-bold text-sm">Selesai</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Dialog */}
      {selectedReq && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedReq(null)}
          title={
            reviewDecision === 'approve'
              ? 'Konfirmasi Persetujuan (Approve)'
              : 'Konfirmasi Penolakan (Reject)'
          }
          description={`Tinjau permintaan ${selectedReq.action_type} oleh ${selectedReq.requester_name || 'Staff'}`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setSelectedReq(null)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                variant={reviewDecision === 'approve' ? 'primary' : 'danger'}
                size="lg"
                isLoading={isSubmitting}
                onClick={handleSubmitReview}
                className="font-bold"
              >
                {reviewDecision === 'approve' ? 'Ya, Setujui Tindakan' : 'Tolak Permintaan'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {formError && (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-base font-bold text-rose-800">
                {formError}
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-1.5">
              <div className="text-xs font-bold text-slate-500 uppercase">Alasan Pemohon:</div>
              <div className="text-slate-900 font-bold text-base">{selectedReq.reason}</div>
            </div>

            <Input
              label="Catatan Reviewer / Supervisor (Opsional)"
              placeholder="Contoh: Disetujui sesuai verifikasi fisik barang"
              size="lg"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              autoFocus
            />
          </form>
        </Dialog>
      )}
    </div>
  );
};
