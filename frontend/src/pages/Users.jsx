import { useEffect, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser } from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';

const errMsg = (err, fallback) => err.response?.data?.error || fallback;

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [saving, setSaving] = useState(false);

  const load = () => getUsers().then(r => setUsers(r.data))
    .catch(err => toast.error(errMsg(err, 'Failed to load users')));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createUser(form);
      toast.success('User created');
      setForm({ name: '', email: '', password: '', role: 'staff' });
      load();
    } catch (err) { toast.error(errMsg(err, 'Failed to create user')); }
    finally { setSaving(false); }
  };

  const patch = async (u, data, okMsg) => {
    try { await updateUser(u._id, data); toast.success(okMsg); load(); }
    catch (err) { toast.error(errMsg(err, 'Update failed')); }
  };

  const resetPassword = (u) => {
    const password = window.prompt(`New password for ${u.email} (min 8 characters):`);
    if (password) patch(u, { password }, 'Password reset');
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}?`)) return;
    try { await deleteUser(u._id); toast.success('User deleted'); load(); }
    catch (err) { toast.error(errMsg(err, 'Delete failed')); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">👥 User Management</h1>

      <form onSubmit={add} className="bg-white rounded-xl shadow p-5 mb-6 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        {[['name', 'Name', 'text'], ['email', 'Email', 'email'], ['password', 'Password', 'password']].map(([k, label, type]) => (
          <div key={k}>
            <label className="text-xs text-gray-500 block mb-1">{label}</label>
            <input type={type} required value={form[k]}
              minLength={k === 'password' ? 8 : undefined}
              onChange={e => setForm({ ...form, [k]: e.target.value })}
              className="w-full border rounded-lg px-2 py-2 text-sm" />
          </div>
        ))}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Role</label>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
            className="w-full border rounded-lg px-2 py-2 text-sm">
            <option value="staff">Staff (view only)</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button disabled={saving}
          className="sm:col-span-5 flex items-center justify-center gap-2 bg-green-700 text-white
            py-2.5 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50">
          <UserPlus size={16} /> Add User
        </button>
      </form>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th>
              <th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {users.map(u => {
              const self = u._id === me._id;
              return (
                <tr key={u._id} className="border-t">
                  <td className="p-3">{u.name}{self && <span className="ml-2 text-xs text-gray-400">(you)</span>}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <select value={u.role} disabled={self}
                      onChange={e => patch(u, { role: e.target.value }, 'Role updated')}
                      className="border rounded px-2 py-1 text-xs disabled:opacity-50">
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <button disabled={self}
                      onClick={() => patch(u, { active: !u.active }, u.active ? 'User disabled' : 'User enabled')}
                      className={`px-2 py-1 rounded text-xs font-medium disabled:opacity-50
                        ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {u.active ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="p-3 text-right space-x-3">
                    <button onClick={() => resetPassword(u)} className="text-xs text-blue-600 hover:underline">
                      Reset password
                    </button>
                    {!self && (
                      <button onClick={() => remove(u)} className="text-red-400 hover:text-red-600 align-middle">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
