import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { Challan, PaginatedResponse } from '../../types';

export default function ChallanListPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<PaginatedResponse<Challan> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const fetch = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (status) params.status = status;
      const res = await api.get('/challans', { params });
      setData(res.data);
    } finally { setLoading(false) }
  };

  useEffect(() => { fetch() }, [page, status]);

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { DRAFT: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800' };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[s] || ''}`}>{s}</span>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Challans</h2>
        {['ADMIN', 'SALES'].includes(user?.role || '') && (
          <Link to="/challans/new" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">New Challan</Link>
        )}
      </div>

      <div className="flex gap-3">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="border border-gray-300 rounded px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No challans found.</div>
      ) : (
        <>
          <table className="w-full bg-white rounded-lg shadow-sm">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="px-4 py-3">Challan #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 text-sm">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{c.challanNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{c.customer?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{c._count?.items || 0}</td>
                  <td className="px-4 py-3 text-gray-600">{c.totalQuantity}</td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link to={`/challans/${c.id}`} className="text-blue-600 hover:underline text-sm">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data && data.meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 text-sm">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded border disabled:opacity-50 hover:bg-gray-100">Prev</button>
              <span className="px-3 py-1 text-gray-600">Page {data.meta.page} of {data.meta.totalPages}</span>
              <button disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded border disabled:opacity-50 hover:bg-gray-100">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
