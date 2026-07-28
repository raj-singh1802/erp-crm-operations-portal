import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { Customer, FollowUpNote } from '../../types';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/customers/${id}`).then((res) => {
      setCustomer(res.data);
      setLoading(false);
    }).catch(() => { navigate('/customers'); setLoading(false) });
  }, [id]);

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/customers/${id}/follow-ups`, { note: noteText });
      setCustomer((prev) => prev ? { ...prev, followUpNotes: [res.data, ...(prev.followUpNotes || [])] } : prev);
      setNoteText('');
    } finally { setSending(false) }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!customer) return <div className="p-6 text-gray-500">Customer not found.</div>;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
        {['ADMIN', 'SALES'].includes(user?.role || '') && (
          <Link to={`/customers/${id}/edit`} className="text-blue-600 hover:underline text-sm">Edit</Link>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">Mobile:</span> <span className="text-gray-900">{customer.mobile}</span></div>
        <div><span className="text-gray-500">Email:</span> <span className="text-gray-900">{customer.email || '-'}</span></div>
        <div><span className="text-gray-500">Business:</span> <span className="text-gray-900">{customer.businessName || '-'}</span></div>
        <div><span className="text-gray-500">GST:</span> <span className="text-gray-900">{customer.gstNumber || '-'}</span></div>
        <div><span className="text-gray-500">Type:</span> <span className="text-gray-900">{customer.customerType}</span></div>
        <div><span className="text-gray-500">Status:</span> <span className="text-gray-900">{customer.status}</span></div>
        <div><span className="text-gray-500">Address:</span> <span className="text-gray-900">{customer.address || '-'}</span></div>
        <div><span className="text-gray-500">Follow-up:</span> <span className="text-gray-900">{customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : '-'}</span></div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Follow-up Notes</h3>
        <form onSubmit={addNote} className="flex gap-2 mb-4">
          <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {['ADMIN', 'SALES'].includes(user?.role || '') && (
            <button type="submit" disabled={sending || !noteText.trim()} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{sending ? '...' : 'Add'}</button>
          )}
        </form>
        {customer.followUpNotes?.length === 0 ? (
          <p className="text-sm text-gray-500">No notes yet.</p>
        ) : (
          <div className="space-y-3">
            {customer.followUpNotes?.map((note: FollowUpNote) => (
              <div key={note.id} className="border-b pb-3 last:border-0">
                <p className="text-sm text-gray-900">{note.note}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {note.createdByUser?.name || 'User'} — {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
