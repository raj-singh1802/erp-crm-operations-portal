import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { Customer, PaginatedResponse } from '../../types';

export default function CustomerListPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<PaginatedResponse<Customer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const fetch = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (type) params.customerType = type;
      const res = await api.get('/customers', { params });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch() }, [page, status, type]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetch() };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { LEAD: 'bg-yellow-100 text-yellow-800', ACTIVE: 'bg-green-100 text-green-800', INACTIVE: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[s] || ''}`}>{s}</span>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Customers</h2>
        {['ADMIN', 'SALES'].includes(user?.role || '') && (
          <Link to="/customers/new" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">Add Customer</Link>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or mobile..." className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="border border-gray-300 rounded px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }} className="border border-gray-300 rounded px-3 py-2 text-sm">
          <option value="">All Types</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="DISTRIBUTOR">Distributor</option>
        </select>
        <button type="submit" className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-200">Search</button>
      </form>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No customers found.</div>
      ) : (
        <>
          <table className="w-full bg-white rounded-lg shadow-sm">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 text-sm">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.mobile}</td>
                  <td className="px-4 py-3 text-gray-600">{c.businessName || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.customerType}</td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/customers/${c.id}`} className="text-blue-600 hover:underline text-sm">View</Link>
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
