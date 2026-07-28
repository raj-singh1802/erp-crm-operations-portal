import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import type { Challan } from '../../types';

export default function ChallanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    api.get(`/challans/${id}`).then((res) => {
      setChallan(res.data);
      setLoading(false);
    }).catch(() => { navigate('/challans'); setLoading(false) });
  }, [id]);

  const handleConfirm = async () => {
    if (!confirm('Confirm this challan? Stock will be deducted.')) return;
    setActionLoading(true);
    try {
      const res = await api.patch(`/challans/${id}/confirm`);
      setChallan(res.data);
      addToast('Challan confirmed', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Confirmation failed', 'error');
    } finally { setActionLoading(false) }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this challan?')) return;
    setActionLoading(true);
    try {
      const res = await api.patch(`/challans/${id}/cancel`);
      setChallan(res.data);
      addToast('Challan cancelled', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Cancellation failed', 'error');
    } finally { setActionLoading(false) }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!challan) return <div className="p-6 text-gray-500">Challan not found.</div>;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Challan {challan.challanNumber}</h2>
          <p className="text-sm text-gray-500">Created {new Date(challan.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          {challan.status === 'DRAFT' && (
            <>
              {['ADMIN', 'SALES'].includes(user?.role || '') && (
                <button onClick={handleConfirm} disabled={actionLoading} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
              )}
              {['ADMIN', 'SALES'].includes(user?.role || '') && (
                <button onClick={handleCancel} disabled={actionLoading} className="bg-red-50 text-red-700 px-4 py-2 rounded text-sm font-medium hover:bg-red-100 disabled:opacity-50">
                  Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">Status:</span> <span className="font-medium">{challan.status}</span></div>
        <div><span className="text-gray-500">Customer:</span> <span className="text-gray-900">{challan.customer?.name || '-'}</span></div>
        <div><span className="text-gray-500">Created by:</span> <span className="text-gray-900">{challan.createdByUser?.name || 'User'}</span></div>
        <div><span className="text-gray-500">Total quantity:</span> <span className="text-gray-900">{challan.totalQuantity}</span></div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4">Product</th>
              <th className="pb-2 pr-4">SKU</th>
              <th className="pb-2 pr-4">Quantity</th>
              <th className="pb-2 pr-4">Price (at sale)</th>
              <th className="pb-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {challan.items?.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium text-gray-900">
                  {item.productNameSnapshot || 'N/A'}
                  {item.productNameSnapshot && <span className="text-xs text-gray-400 ml-1">(at time of sale)</span>}
                </td>
                <td className="py-2 pr-4 font-mono text-gray-600">{item.product?.sku || '-'}</td>
                <td className="py-2 pr-4">{item.quantity}</td>
                <td className="py-2 pr-4">₹{Number(item.unitPriceSnapshot).toFixed(2)}</td>
                <td className="py-2">₹{(Number(item.unitPriceSnapshot) * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {challan.items?.length === 0 && <p className="text-sm text-gray-500">No items.</p>}
      </div>
    </div>
  );
}
