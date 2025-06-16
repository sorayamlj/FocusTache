// src/components/Layout.jsx - VERSION AMÉLIORÉE
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  CheckSquare, 
  Timer, 
  BarChart3, 
  Calendar, 
  User, 
  LogOut, 
  Menu, 
  X,
  Play,
  BookOpen,
  Settings,
  Bell
} from 'lucide-react';

const Layout = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, color: 'blue' },
    { name: 'Mes Tâches', href: '/tasks', icon: CheckSquare, color: 'green' },
    { name: 'Sessions Focus', href: '/sessions', icon: Play, color: 'purple' },
    { name: 'Mes Notes', href: '/notes', icon: BookOpen, color: 'yellow' },
    { name: 'Statistiques', href: '/stats', icon: BarChart3, color: 'cyan' },
    { name: 'Calendrier', href: '/calendar', icon: Calendar, color: 'pink' },
  ];

  const getPageTitle = () => {
    const currentNav = navigation.find(nav => nav.href === location.pathname);
    return currentNav?.name || 'Dashboard';
  };

  const getPageIcon = () => {
    const currentNav = navigation.find(nav => nav.href === location.pathname);
    return currentNav?.icon || Home;
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700/50 transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:inset-0 transition-transform duration-300 ease-out shadow-2xl`}>
        
        {/* Logo avec animation */}
        <div className="flex items-center gap-3 h-16 px-6 border-b border-slate-700/50 bg-slate-800/50">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-lg font-bold text-white">F</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">FocusTâche</h1>
            <p className="text-xs text-slate-400">Votre assistant productivité</p>
          </div>
        </div>

        {/* Navigation améliorée */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 group relative overflow-hidden ${
                  isActive
                    ? `bg-${item.color}-600/20 text-${item.color}-400 border border-${item.color}-500/30 shadow-lg`
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                style={{ 
                  animation: `slideInLeft 0.3s ease-out forwards`,
                  animationDelay: `${index * 50}ms`,
                  opacity: 0
                }}
              >
                {/* Effet de brillance au survol */}
                <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700`}></div>
                
                <div className={`p-2 rounded-lg ${
                  isActive 
                    ? `bg-${item.color}-500/20` 
                    : 'bg-slate-700/30 group-hover:bg-slate-600/50'
                } transition-colors duration-200`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1">
                  <span className="font-semibold">{item.name}</span>
                  {isActive && (
                    <div className="w-2 h-2 bg-current rounded-full absolute right-4 top-1/2 -translate-y-1/2"></div>
                  )}
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Section Raccourcis */}
        <div className="px-4 mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
            Actions Rapides
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/#/sessions'}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-purple-600/20 rounded-lg transition-all duration-200 group"
            >
              <div className="p-1.5 bg-purple-500/20 rounded-md group-hover:bg-purple-500/30">
                <Play className="w-4 h-4" />
              </div>
              <span>Nouvelle Session</span>
            </button>
            <button
              onClick={() => window.location.href = '/#/tasks'}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-green-600/20 rounded-lg transition-all duration-200 group"
            >
              <div className="p-1.5 bg-green-500/20 rounded-md group-hover:bg-green-500/30">
                <CheckSquare className="w-4 h-4" />
              </div>
              <span>Nouvelle Tâche</span>
            </button>
          </div>
        </div>

        {/* User Profile amélioré */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-xl backdrop-blur-sm border border-slate-600/30">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.nom || 'Utilisateur'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user?.email || 'email@example.com'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-600/50 rounded-lg transition-all duration-200"
                title="Paramètres"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-600/50 rounded-lg transition-all duration-200"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Header amélioré */}
        <header className="h-16 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50 flex items-center justify-between px-6 shadow-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-white lg:hidden hover:bg-slate-700 rounded-lg transition-all duration-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
              {(() => {
                const PageIcon = getPageIcon();
                const currentNav = navigation.find(nav => nav.href === location.pathname);
                return (
                  <div className={`p-2 bg-${currentNav?.color || 'blue'}-500/20 rounded-lg`}>
                    <PageIcon className={`w-5 h-5 text-${currentNav?.color || 'blue'}-400`} />
                  </div>
                );
              })()}
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {getPageTitle()}
                </h1>
                <p className="text-xs text-slate-400">
                  {new Date().toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>
          
          {/* Header Actions */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all duration-200">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                3
              </span>
            </button>
            
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-700/50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-400">
                Bienvenue, <span className="text-white font-medium">{user?.nom || 'Utilisateur'}</span>
              </span>
            </div>
          </div>
        </header>

        {/* Page Content avec animation */}
        <main className="flex-1 p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="max-w-7xl mx-auto">
            <div 
              className="animate-fadeIn"
              style={{
                animation: 'fadeIn 0.5s ease-out forwards'
              }}
            >
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Close Button */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-4 right-4 z-50 p-2 bg-slate-800 text-white rounded-lg lg:hidden shadow-lg hover:bg-slate-700 transition-colors duration-200"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Styles CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.5s ease-out forwards;
          }
        `
      }} />
    </div>
  );
};

export default Layout;
