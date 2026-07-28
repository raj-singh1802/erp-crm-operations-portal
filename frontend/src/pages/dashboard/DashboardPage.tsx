import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [lowStock, setLowStock] = useState<number | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [draftChallans, setDraftChallans] = useState<number | null>(null);
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/products', { params: { limit: 200 } }),
      api.get('/challans', { params: { limit: 1, status: 'DRAFT' } }),
      api.get('/customers', { params: { limit: 1 } }),
    ]).then(([pRes, cRes, custRes]) => {
      const allProducts = pRes.data.data;
      setLowStock(allProducts.filter((p: any) => p.isLowStock).length);
      setProductCount(pRes.data.meta.total);
      setDraftChallans(cRes.data.meta.total);
      setCustomerCount(custRes.data.meta.total);
    }).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Customers', value: customerCount, link: '/customers', color: 'bg-blue-50 text-blue-700' },
    { label: 'Products', value: productCount, link: '/products', color: 'bg-green-50 text-green-700' },
    { label: 'Low Stock', value: lowStock, link: '/products', color: lowStock && lowStock > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500' },
    { label: 'Draft Challans', value: draftChallans, link: '/challans', color: draftChallans && draftChallans > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-500' },
  ];

  if (loading) return <div className="p-6 text-gray-500">Loading dashboard...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name || 'User'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.label} to={card.link} className={`rounded-lg p-5 ${card.color} hover:opacity-80 transition-opacity`}>
            <div className="text-2xl font-bold">{card.value ?? '-'}</div>
            <div className="text-sm mt-1">{card.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
