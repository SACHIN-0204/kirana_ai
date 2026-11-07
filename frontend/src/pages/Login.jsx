import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reach the server');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={submit} className="bg-white w-full max-w-sm rounded-xl shadow p-8 space-y-4">
        <div className="text-center">
          <div className="text-4xl">🛒</div>
          <h1 className="text-xl font-bold text-gray-800 mt-2">KiranaAI</h1>
          <p className="text-sm text-gray-500">Sign in to continue</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Email</label>
          <input type="email" required autoFocus value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Password</label>
          <input type="password" required value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-green-700 text-white py-2.5 rounded-lg font-semibold
            hover:bg-green-800 disabled:opacity-50 transition">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
