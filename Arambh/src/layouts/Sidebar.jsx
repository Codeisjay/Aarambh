// Sidebar.jsx
import { Home, Briefcase, BarChart3, Settings, LogOut, Users, FileSearch } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Sidebar() {
  const links = [
    { label: 'Dashboard', icon: Home, href: '/dashboard' },
    { label: 'Interview', icon: Briefcase, href: '/interview-setup' },
    { label: 'Reports', icon: BarChart3, href: '/reports' },
    { label: 'Admin', icon: Users, href: '/admin' },
    { label: 'Settings', icon: Settings, href: '/settings' },
    { label: 'Resume Parser Test', icon: FileSearch, href: '/resume-parser-test' },
  ];

  return (
    <div className="w-64 bg-[#0a0f1a] border-r border-slate-800 p-6 hidden lg:flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold">
          A
        </div>
        <span className="text-lg font-semibold">ARAMBH</span>
      </div>

      <nav className="space-y-2 flex-1">
        {links.map(link => (
          <Link key={link.href} to={link.href}>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800/50 transition text-slate-300 hover:text-white">
              <link.icon size={20} />
              <span>{link.label}</span>
            </button>
          </Link>
        ))}
      </nav>

      <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-900/30 transition text-red-400">
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </div>
  );
}
