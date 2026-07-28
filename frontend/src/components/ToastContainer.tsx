import { useToastStore } from '../stores/toastStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  const colors: Record<string, string> = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-gray-800 text-white',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`${colors[t.type] || colors.info} px-4 py-2 rounded shadow-lg text-sm flex items-center gap-3 max-w-xs`}>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100">&times;</button>
        </div>
      ))}
    </div>
  );
}
