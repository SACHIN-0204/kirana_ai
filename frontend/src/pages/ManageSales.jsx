import { useEffect, useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { getProducts, getSales, updateSale, deleteSale } from '../api';
import { toast } from '../components/Toast';

const errMsg = (err, fallback) => err.response?.data?.error || fallback;

export default function ManageSales() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [days, setDays] = useState(30);
  const [sales, setSales] = useState([]);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({});

  useEffect(() => {
    getProducts().then(r => {
      setProducts(r.data);
      if (r.data[0]) setProductId(r.data[0]._id);
    });
  }, []);

  const load = () => {
    if (!productId) return;
    getSales(productId, days).then(r => setSales([...r.data].reverse()))
      .catch(err => toast.error(errMsg(err, 'Failed to load sales')));
  };
  useEffect(load, [productId, days]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (s) => {
    setEditId(s._id);
    setDraft({ date: s.date.split('T')[0], quantitySold: s.quantitySold, revenue: s.revenue ?? 0 });
  };

  const save = async () => {
    try {
      await updateSale(editId, draft);
      toast.success('Sale updated');
      setEditId(null); load();
    } catch (err) { toast.error(errMsg(err, 'Update failed')); }
  };

  const remove = async (s) => {
    if (!window.confirm('Delete this sale? Stock will be restored.')) return;
    try { await deleteSale(s._id); toast.success('Sale deleted'); load(); }
    catch (err) { toast.error(errMsg(err, 'Delete failed')); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">🗂️ Manage Sales Data</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={productId} onChange={e => setProductId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white">
          {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm bg-white">
          {[7, 30, 90, 180].map(d => <option key={d} value={d}>Last {d} days</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr><th className="p-3">Date</th><th className="p-3">Qty Sold</th>
              <th className="p-3">Revenue (₹)</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr><td colSpan="4" className="p-6 text-center text-gray-400">No sales in this period</td></tr>
            )}
            {sales.map(s => (
              <tr key={s._id} className="border-t">
                {editId === s._id ? (
                  <>
                    <td className="p-2"><input type="date" value={draft.date}
                      onChange={e => setDraft({ ...draft, date: e.target.value })}
                      className="border rounded px-2 py-1 text-sm" /></td>
                    <td className="p-2"><input type="number" min="0" step="0.5" value={draft.quantitySold}
                      onChange={e => setDraft({ ...draft, quantitySold: e.target.value })}
                      className="border rounded px-2 py-1 text-sm w-24" /></td>
                    <td className="p-2"><input type="number" min="0" value={draft.revenue}
                      onChange={e => setDraft({ ...draft, revenue: e.target.value })}
                      className="border rounded px-2 py-1 text-sm w-24" /></td>
                    <td className="p-2 text-right space-x-2">
                      <button onClick={save} className="text-green-600"><Check size={16} /></button>
                      <button onClick={() => setEditId(null)} className="text-gray-400"><X size={16} /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3">{s.date.split('T')[0]}</td>
                    <td className="p-3">{s.quantitySold}</td>
                    <td className="p-3">{s.revenue ?? 0}</td>
                    <td className="p-3 text-right space-x-3">
                      <button onClick={() => startEdit(s)} className="text-blue-500 hover:text-blue-700"><Pencil size={15} /></button>
                      <button onClick={() => remove(s)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
