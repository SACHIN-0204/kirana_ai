import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingBasket, BarChart2, ClipboardList,
  PlusCircle, Package, PieChart, Menu, X, Database, Users, LogOut
} from 'lucide-react';

const links = [
  { to: '/',             label: 'Dashboard',  icon: ShoppingBasket },
  { to: '/predictions',  label: 'Predict',    icon: BarChart2      },
  { to: '/batch',        label: 'Batch',      icon: Package        },
  { to: '/reorder',      label: 'Reorder',    icon: ClipboardList  },
  { to: '/category',     label: 'Categories', icon: PieChart       },
  { to: '/record-sale',  label: 'Record',     icon: PlusCircle,  adminOnly: true },
  { to: '/manage-sales', label: 'Sales Data', icon: Database,    adminOnly: true },
  { to: '/users',        label: 'Users',      icon: Users,       adminOnly: true },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const visibleLinks = links.filter(l => !l.adminOnly || isAdmin);

  return (
    <nav className="bg-green-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            🛒 <span>KiranaAI</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {visibleLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                  text-sm font-medium transition-all duration-150
                  ${pathname === to
                    ? 'bg-white/20 text-white'
                    : 'hover:bg-white/10 text-green-100'}`}>
                <Icon size={14} /> {label}
              </Link>
            ))}
            <span className="ml-3 text-xs text-green-100">
              {user?.name} ({user?.role})
            </span>
            <button onClick={logout} title="Sign out"
              className="p-1.5 rounded-lg hover:bg-white/10"><LogOut size={16} /></button>
          </div>

          {/* Mobile Hamburger */}
          <button className="md:hidden p-1.5 rounded-lg hover:bg-white/10"
            onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {open && (
          <div className="md:hidden pb-3 space-y-1 animate-fade-in">
            {visibleLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                  text-sm font-medium transition
                  ${pathname === to
                    ? 'bg-white/20'
                    : 'hover:bg-white/10 text-green-100'}`}>
                <Icon size={16} /> {label}
              </Link>
            ))}
            <button onClick={logout}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-green-100">
              <LogOut size={16} /> Sign out ({user?.name})
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}