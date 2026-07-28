import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { Product, StockMovement } from '../../types';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [adjType, setAdjType] = useState<'IN' | 'OUT'>('IN');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjError, setAdjError] = useState('');

  const fetchData = async () => {
    try {
      const [pRes, mRes] = await Promise.all([
        api.get(`/products/${id}`),
        api.get(`/products/${id}/stock-movements`),
      ]);
      setProduct(pRes.data);
      setMovements(mRes.data);
    } catch { navigate('/products') }
    finally { setLoading(false) }
  };

  useEffect(() => { fetchData() }, [id]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjLoading(true);
    setAdjError('');
    try {
      await api.post(`/products/${id}/stock-movements`, {
        movementType: adjType,
        quantityChanged: parseInt(adjQty),
        reason: adjReason,
      });
      setShowForm(false);
      setAdjQty('');
      setAdjReason('');
      fetchData();
    } catch (err: any) {
      setAdjError(err.response?.data?.message || 'Adjustment failed');
    } finally { setAdjLoading(false) }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!product) return <div className="p-6 text-gray-500">Product not found.</div>;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
        {['ADMIN', 'WAREHOUSE'].includes(user?.role || '') && (
          <Link to={`/products/${id}/edit`} className="text-blue-600 hover:underline text-sm">Edit</Link>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">SKU:</span> <span className="font-mono text-gray-900">{product.sku}</span></div>
        <div><span className="text-gray-500">Category:</span> <span className="text-gray-900">{product.category || '-'}</span></div>
        <div><span className="text-gray-500">Unit Price:</span> <span className="text-gray-900">₹{product.unitPrice}</span></div>
        <div>
          <span className="text-gray-500">Stock:</span>
          <span className={`ml-1 ${product.isLowStock ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
            {product.currentStock} {product.isLowStock && '(Low — min alert: ' + product.minStockAlert + ')'}
          </span>
        </div>
        <div><span className="text-gray-500">Location:</span> <span className="text-gray-900">{product.warehouseLocation || '-'}</span></div>
        <div><span className="text-gray-500">Image:</span> <span className="text-gray-900">{product.imageUrl || '-'}</span></div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Stock Movements</h3>
          {['ADMIN', 'WAREHOUSE'].includes(user?.role || '') && (
            <button onClick={() => setShowForm(!showForm)} className="text-blue-600 hover:underline text-sm">
              {showForm ? 'Cancel' : 'Adjust Stock'}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleAdjust} className="mb-4 p-4 bg-gray-50 rounded space-y-3">
            {adjError && <div className="text-sm text-red-600">{adjError}</div>}
            <div className="flex gap-3">
              <select value={adjType} onChange={(e) => setAdjType(e.target.value as any)} className="border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
              <input type="number" min="1" required placeholder="Quantity" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm flex-1" />
              <input required placeholder="Reason" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm flex-1" />
              <button type="submit" disabled={adjLoading} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                {adjLoading ? '...' : 'Submit'}
              </button>
            </div>
          </form>
        )}

        {movements.length === 0 ? (
          <p className="text-sm text-gray-500">No movements recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">Reason</th>
                <th className="pb-2 pr-4">By</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.movementType === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {m.movementType}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{m.quantityChanged}</td>
                  <td className="py-2 pr-4 text-gray-600">{m.reason}</td>
                  <td className="py-2 pr-4 text-gray-600">{m.createdByUser?.name || 'User'}</td>
                  <td className="py-2 text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
