import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { Product, PaginatedResponse } from '../../types';

export default function ProductListPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetch = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      const res = await api.get('/products', { params });
      setData(res.data);
    } finally { setLoading(false) }
  };

  useEffect(() => { fetch() }, [page]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetch() };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Products</h2>
        {['ADMIN'].includes(user?.role || '') && (
          <Link to="/products/new" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">Add Product</Link>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, or category..." className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-200">Search</button>
      </form>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No products found.</div>
      ) : (
        <>
          <table className="w-full bg-white rounded-lg shadow-sm">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 text-sm">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-600">{p.category || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">₹{p.unitPrice}</td>
                  <td className="px-4 py-3">
                    <span className={p.isLowStock ? 'text-red-600 font-medium' : 'text-gray-600'}>
                      {p.currentStock} {p.isLowStock && '(Low)'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.warehouseLocation || '-'}</td>
                  <td className="px-4 py-3">
                    <Link to={`/products/${p.id}`} className="text-blue-600 hover:underline text-sm">View</Link>
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
