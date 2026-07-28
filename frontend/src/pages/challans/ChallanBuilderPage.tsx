import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import type { Customer, Product } from '../../types';

interface LineItem {
  productId: number;
  productName: string;
  quantity: number;
  availableStock: number;
}

export default function ChallanBuilderPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ productId: 0, productName: '', quantity: 1, availableStock: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [action, setAction] = useState<'DRAFT' | 'CONFIRM'>('DRAFT');

  useEffect(() => {
    Promise.all([
      api.get('/customers?limit=100'),
      api.get('/products?limit=100'),
    ]).then(([cRes, pRes]) => {
      setCustomers(cRes.data.data);
      setProducts(pRes.data.data);
    });
  }, []);

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const addRow = () => {
    setItems([...items, { productId: 0, productName: '', quantity: 1, availableStock: 0 }]);
  };

  const removeRow = (idx: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    if (field === 'productId') {
      const prod = products.find((p) => p.id === Number(value));
      updated[idx] = {
        ...updated[idx],
        productId: Number(value),
        productName: prod?.name || '',
        availableStock: prod?.currentStock || 0,
        quantity: 1,
      };
    } else if (field === 'quantity') {
      updated[idx] = { ...updated[idx], quantity: Math.max(1, Number(value) || 1) };
    }
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { setError('Select a customer'); return }
    const validItems = items.filter((i) => i.productId > 0);
    if (validItems.length === 0) { setError('Add at least one product'); return }
    setSaving(true);
    setError('');

    try {
      const res = await api.post('/challans', {
        customerId: Number(customerId),
        items: validItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });

      if (action === 'CONFIRM') {
        try {
          const confirmed = await api.patch(`/challans/${res.data.id}/confirm`);
          navigate(`/challans/${confirmed.data.id}`);
        } catch (confirmErr: any) {
          setError(confirmErr.response?.data?.message || 'Confirmation failed');
          navigate(`/challans/${res.data.id}`);
        }
      } else {
        navigate(`/challans/${res.data.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create challan');
    } finally { setSaving(false) }
  };

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-xl font-bold text-gray-900 mb-4">New Challan</h2>
      {error && <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
          <select id="customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.businessName ? `(${c.businessName})` : ''}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Products</h3>
            <button type="button" onClick={addRow} className="text-blue-600 hover:underline text-sm">+ Add Row</button>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Product</label>
                  <select value={item.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="0">Select...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.currentStock}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-500 mb-1">Qty</label>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="text-sm text-gray-400 pb-2">{item.availableStock > 0 ? `Avail: ${item.availableStock}` : ''}</div>
                <button type="button" onClick={() => removeRow(idx)} disabled={items.length <= 1} className="text-red-500 pb-2 disabled:opacity-30 text-sm">✕</button>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-gray-600">Total quantity: <strong>{totalQty}</strong></div>
        </div>

        <div className="flex gap-3">
          <button type="submit" name="action" value="DRAFT" onClick={() => setAction('DRAFT')} disabled={saving} className="bg-gray-100 text-gray-700 px-6 py-2 rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button type="submit" name="action" value="CONFIRM" onClick={() => setAction('CONFIRM')} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save & Confirm'}
          </button>
          <button type="button" onClick={() => navigate('/challans')} className="text-gray-500 px-6 py-2 text-sm hover:text-gray-700">Cancel</button>
        </div>
      </form>
    </div>
  );
}
