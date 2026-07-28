import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isWarehouse = user?.role === 'WAREHOUSE';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', sku: '', category: '', unitPrice: '', currentStock: '0', minStockAlert: '0', warehouseLocation: '',
  });

  useEffect(() => {
    if (id) {
      api.get(`/products/${id}`).then((res) => {
        const p = res.data;
        setForm({
          name: p.name, sku: p.sku, category: p.category || '', unitPrice: String(p.unitPrice),
          currentStock: String(p.currentStock), minStockAlert: String(p.minStockAlert), warehouseLocation: p.warehouseLocation || '',
        });
      }).catch(() => navigate('/products'));
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (!isEdit && user?.role === 'WAREHOUSE') navigate('/products');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, any> = {
        ...form,
        unitPrice: parseFloat(form.unitPrice),
        currentStock: parseInt(form.currentStock) || 0,
        minStockAlert: parseInt(form.minStockAlert) || 0,
      };
      if (isWarehouse) {
        ['name', 'sku', 'category', 'unitPrice'].forEach((k) => delete payload[k]);
      }
      if (isEdit) {
        await api.patch(`/products/${id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      navigate('/products');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save product');
    } finally { setLoading(false) }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{isEdit ? 'Edit Product' : 'Add Product'}</h2>
      {error && <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2 mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-2 gap-4">
          {!isWarehouse && (
            <div className="col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input id="name" name="name" required value={form.name} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          {!isWarehouse && (
            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
              <input id="sku" name="sku" required disabled={isEdit} value={form.sku} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
            </div>
          )}
          {!isWarehouse && (
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input id="category" name="category" value={form.category} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          {!isWarehouse && (
            <div>
              <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700 mb-1">Unit Price *</label>
              <input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" required value={form.unitPrice} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div>
            <label htmlFor="currentStock" className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
            <input id="currentStock" name="currentStock" type="number" min="0" value={form.currentStock} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="minStockAlert" className="block text-sm font-medium text-gray-700 mb-1">Min Stock Alert</label>
            <input id="minStockAlert" name="minStockAlert" type="number" min="0" value={form.minStockAlert} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label htmlFor="warehouseLocation" className="block text-sm font-medium text-gray-700 mb-1">Warehouse Location</label>
            <input id="warehouseLocation" name="warehouseLocation" value={form.warehouseLocation} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
          </button>
          <button type="button" onClick={() => navigate('/products')} className="bg-gray-100 text-gray-700 px-6 py-2 rounded text-sm hover:bg-gray-200">Cancel</button>
        </div>
      </form>
    </div>
  );
}
