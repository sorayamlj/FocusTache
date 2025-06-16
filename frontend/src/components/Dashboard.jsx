import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  BookOpen, 
  Target, 
  BarChart3, 
  Clock, 
  TrendingUp, 
  Edit3, 
  Play, 
  Zap, 
  Timer,
  ArrowRight,
  Eye,
  Share2,
  AlertCircle,
  CheckCircle,
  User,
  Settings,
  Bookmark,
  Star,
  Coffee,
  Brain,
  Lightbulb,
  RefreshCw
} from 'lucide-react';

const Dashboard = ({ user, onNavigate }) => {
  const [stats, setStats] = useState({
    tasks: { total: 0, completed: 0, pending: 0, urgent: 0, overdue: 0 },
    sessions: { today: 0, todayTime: 0, thisWeek: 0, totalTime: 0 },
    notes: { total: 0, recent: [] },
    calendar: { todayTasks: 0, upcomingTasks: 0, weekEvents: 0 }
  });
  
  const [recentTasks, setRecentTasks] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeQuickAction, setActiveQuickAction] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Fonction pour obtenir le token d'authentification
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Fonction pour faire les appels API avec authentification
  const apiCall = async (url, options = {}) => {
    const token = getAuthToken();
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  };

  // Charger les tâches depuis l'API
  const loadTasks = async () => {
    try {
      const response = await apiCall('http://localhost:5000/api/tasks');
      const tasks = response.tasks || response || [];
      return tasks;
    } catch (error) {
      console.error('Erreur chargement tâches:', error);
      return [];
    }
  };

  // Charger les sessions depuis l'API
  const loadSessions = async () => {
    try {
      const response = await apiCall('http://localhost:5000/api/sessions');
      const sessions = response.sessions || response || [];
      return sessions;
    } catch (error) {
      console.error('Erreur chargement sessions:', error);
      // Retourner des données par défaut si l'API sessions n'existe pas encore
      return [];
    }
  };

  // Charger les notes depuis l'API
  const loadNotes = async () => {
    try {
      const response = await apiCall('http://localhost:5000/api/notes');
      const notes = response.notes || response || [];
      return notes;
    } catch (error) {
      console.error('Erreur chargement notes:', error);
      // Retourner des données par défaut si l'API notes n'existe pas encore
      return [];
    }
  };

  // Charger les événements du calendrier depuis l'API
  const loadCalendarEvents = async () => {
    try {
      const response = await apiCall('http://localhost:5000/api/calendar/events');
      const events = response.events || response || [];
      return events;
    } catch (error) {
      console.error('Erreur chargement calendrier:', error);
      // Retourner des données par défaut si l'API calendrier n'existe pas encore
      return [];
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Chargement des données du dashboard...');

      // Charger toutes les données en parallèle
      const [tasks, sessions, notes, calendarEvents] = await Promise.all([
        loadTasks(),
        loadSessions(),
        loadNotes(),
        loadCalendarEvents()
      ]);

      console.log('Données chargées:', { 
        tasks: tasks.length, 
        sessions: sessions.length, 
        notes: notes.length, 
        events: calendarEvents.length 
      });

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Calcul des statistiques des tâches
      const taskStats = {
        total: tasks.length,
        completed: tasks.filter(t => t.statut === 'terminée').length,
        pending: tasks.filter(t => t.statut === 'à faire').length,
        inProgress: tasks.filter(t => t.statut === 'en cours').length,
        urgent: tasks.filter(t => t.priorite === 'haute' && t.statut !== 'terminée').length,
        overdue: tasks.filter(t => 
          t.statut !== 'terminée' && 
          t.dateEcheance && 
          new Date(t.dateEcheance) < now
        ).length
      };

      // Calcul des statistiques des sessions
      const todaySessions = sessions.filter(s => {
        const sessionDate = new Date(s.createdAt || s.updatedAt);
        return sessionDate >= today;
      });

      const thisWeekSessions = sessions.filter(s => {
        const sessionDate = new Date(s.createdAt || s.updatedAt);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return sessionDate >= weekAgo;
      });

      const sessionStats = {
        today: todaySessions.length,
        todayTime: todaySessions.reduce((total, s) => total + (s.tempsEcoule || 0), 0) / 60, // en minutes
        thisWeek: thisWeekSessions.length,
        totalTime: sessions.reduce((total, s) => total + (s.tempsEcoule || 0), 0) / 60 // en minutes
      };

      // Statistiques des notes
      const noteStats = {
        total: notes.length,
        recent: notes.slice(0, 2)
      };

      // Événements du jour et à venir
      const todayEvents = calendarEvents.filter(e => {
        const eventDate = new Date(e.dateEcheance || e.date);
        return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      });

      const upcomingEvents = calendarEvents.filter(e => {
        const eventDate = new Date(e.dateEcheance || e.date);
        return eventDate > now && eventDate <= weekFromNow;
      });

      const calendarStats = {
        todayTasks: todayEvents.length,
        upcomingTasks: upcomingEvents.length,
        weekEvents: calendarEvents.filter(e => {
          const eventDate = new Date(e.dateEcheance || e.date);
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return eventDate >= weekAgo && eventDate <= weekFromNow;
        }).length
      };

      // Tâches récentes (triées par date de modification)
      const recentTasks = tasks
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 5);

      // Notes récentes
      const recentNotes = notes
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 3);

      // Mettre à jour les états
      setStats({
        tasks: taskStats,
        sessions: sessionStats,
        notes: noteStats,
        calendar: calendarStats
      });

      setRecentTasks(recentTasks);
      setRecentNotes(recentNotes);
      setTodayEvents(todayEvents);

      console.log('Dashboard mis à jour avec succès');

    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      setError('Impossible de charger les données du dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    setActiveQuickAction(action);
    setTimeout(() => setActiveQuickAction(null), 200);
    
    // Déterminer la route exacte selon l'action
    let route = '';
    switch(action) {
      case 'tasks':
        route = '/tasks';
        break;
      case 'sessions':
        route = '/sessions';
        break;
      case 'notes':
        route = '/notes';
        break;
      case 'calendar':
        route = '/calendar';
        break;
      case 'stats':
        route = '/stats';
        break;
      case 'settings':
        route = '/settings';
        break;
      default:
        route = `/${action}`;
    }
    
    if (onNavigate) {
      // Utiliser la fonction de navigation passée en prop
      onNavigate(route);
    } else {
      // Fallback pour navigation directe
      if (window.location.hash !== undefined) {
        window.location.hash = `#${route}`;
      } else {
        window.location.pathname = route;
      }
    }
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'haute': return 'text-red-400 bg-red-500/20 border-red-500/40';
      case 'moyenne': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
      case 'basse': return 'text-green-400 bg-green-500/20 border-green-500/40';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'terminée': return 'text-green-400 bg-green-500/20';
      case 'en cours': return 'text-blue-400 bg-blue-500/20';
      case 'à faire': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getMotivationalMessage = () => {
    const hour = new Date().getHours();
    const { tasks, sessions } = stats;
    
    if (hour < 12) {
      return tasks.pending > 0 
        ? `Bonjour ! Prêt pour une journée productive ? ${tasks.pending} tâche${tasks.pending > 1 ? 's' : ''} vous attend${tasks.pending > 1 ? 'ent' : ''}.`
        : "Bonjour ! Excellente nouvelle, aucune tâche en attente aujourd'hui !";
    } else if (hour < 17) {
      return sessions.today > 0
        ? `Bon après-midi ! ${sessions.today} session${sessions.today > 1 ? 's' : ''} de focus aujourd'hui. Continuez sur cette lancée !`
        : "Bon après-midi ! Que diriez-vous d'une session de focus pour booster votre productivité ?";
    } else {
      const completedToday = stats.tasks.completed;
      return completedToday > 0
        ? `Bonsoir ! Belle journée avec ${completedToday} tâche${completedToday > 1 ? 's' : ''} terminée${completedToday > 1 ? 's' : ''} !`
        : "Bonsoir ! Il est encore temps pour finaliser quelques tâches...";
    }
  };

  const getProductivityTip = () => {
    const tips = [
      "Essayez la technique Pomodoro pour améliorer votre concentration !",
      "Prenez des notes pendant vos sessions d'étude pour mieux retenir.",
      "Planifiez vos tâches dans le calendrier pour une meilleure organisation.",
      "Commencez par les tâches les plus importantes de votre journée.",
      "Définissez des objectifs clairs pour chaque session de travail.",
      "N'oubliez pas de faire des pauses régulières pour rester efficace."
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  };

  const handleRefreshData = () => {
    loadDashboardData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="w-6 h-6 text-blue-400 animate-pulse" />
            </div>
          </div>
          <p className="text-slate-400 text-lg">Chargement de votre dashboard...</p>
          <p className="text-slate-500 text-sm">Récupération des données depuis l'API...</p>
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const statCardsData = [
    {
      icon: <CheckSquare className="w-6 h-6" />,
      title: 'Tâches actives',
      value: stats.tasks.pending + stats.tasks.inProgress,
      subtitle: `${stats.tasks.total} au total`,
      trend: stats.tasks.completed > 0 ? '+' + stats.tasks.completed + ' terminées' : 'Aucune terminée',
      gradient: 'from-blue-500 to-cyan-500',
      hoverShadow: 'hover:shadow-blue-500/20',
      action: () => handleQuickAction('tasks')
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: 'Sessions focus',
      value: stats.sessions.today,
      subtitle: `${formatTime(stats.sessions.todayTime)} aujourd'hui`,
      trend: `${stats.sessions.thisWeek} cette semaine`,
      gradient: 'from-purple-500 to-pink-500',
      hoverShadow: 'hover:shadow-purple-500/20',
      action: () => handleQuickAction('sessions')
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: 'Notes créées',
      value: stats.notes.total,
      subtitle: `${stats.notes.recent.length} récentes`,
      trend: 'Dernière: aujourd\'hui',
      gradient: 'from-amber-500 to-orange-500',
      hoverShadow: 'hover:shadow-amber-500/20',
      action: () => handleQuickAction('notes')
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Événements',
      value: stats.calendar.todayTasks,
      subtitle: 'Aujourd\'hui',
      trend: `${stats.calendar.upcomingTasks} à venir`,
      gradient: 'from-emerald-500 to-teal-500',
      hoverShadow: 'hover:shadow-emerald-500/20',
      action: () => handleQuickAction('calendar')
    }
  ];

  const quickActionsData = [
    {
      icon: <Plus className="w-5 h-5" />,
      title: 'Nouvelle tâche',
      description: 'Créer et organiser',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      action: () => handleQuickAction('tasks'),
      shortcut: 'Ctrl+T'
    },
    {
      icon: <Play className="w-5 h-5" />,
      title: 'Démarrer Focus',
      description: 'Session Pomodoro',
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      action: () => handleQuickAction('sessions'),
      shortcut: 'Ctrl+F'
    },
    {
      icon: <Edit3 className="w-5 h-5" />,
      title: 'Nouvelle note',
      description: 'Prendre des notes',
      color: 'amber',
      gradient: 'from-amber-500 to-amber-600',
      action: () => handleQuickAction('notes'),
      shortcut: 'Ctrl+N'
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      title: 'Voir calendrier',
      description: 'Planifier la journée',
      color: 'emerald',
      gradient: 'from-emerald-500 to-emerald-600',
      action: () => handleQuickAction('calendar'),
      shortcut: 'Ctrl+K'
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: 'Statistiques',
      description: 'Analyser la performance',
      color: 'rose',
      gradient: 'from-rose-500 to-rose-600',
      action: () => handleQuickAction('stats'),
      shortcut: 'Ctrl+S'
    },
    {
      icon: <Settings className="w-5 h-5" />,
      title: 'Paramètres',
      description: 'Configurer l\'app',
      color: 'slate',
      gradient: 'from-slate-500 to-slate-600',
      action: () => handleQuickAction('settings'),
      shortcut: 'Ctrl+,'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header avec design moderne */}
        <div className="relative mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-3xl">
            <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-cyan-400/20"></div>
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-4 left-4 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute top-8 right-8 w-16 h-16 bg-cyan-300/20 rounded-full blur-lg animate-bounce"></div>
              <div className="absolute bottom-4 left-1/3 w-12 h-12 bg-purple-300/15 rounded-full blur-md animate-pulse"></div>
            </div>
          </div>
          
          <div className="relative z-10 p-10 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
                    Salut {user?.name || 'Étudiant'} !
                  </h1>
                  <p className="text-xl opacity-90 font-medium max-w-2xl mt-2">
                    {getMotivationalMessage()}
                  </p>
                </div>
              </div>
              
              {/* Actions du header */}
              <div className="flex items-center gap-4">
                {/* Bouton de rafraîchissement */}
                <button
                  onClick={handleRefreshData}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-all duration-200 group"
                  title="Actualiser les données"
                >
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                </button>
                
                {/* Notification du jour */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 max-w-sm">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Conseil du jour
                  </h3>
                  <p className="text-sm opacity-90">{getProductivityTip()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8 text-red-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <p className="font-semibold">Erreur de connexion API</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
              <button
                onClick={handleRefreshData}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
            </div>
          </div>
        )}

        {/* Alertes importantes */}
        {stats.tasks.overdue > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8 text-red-300">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Attention ! {stats.tasks.overdue} tâche{stats.tasks.overdue > 1 ? 's' : ''} en retard</p>
                <button 
                  onClick={() => handleQuickAction('tasks')}
                  className="text-sm text-red-200 hover:text-red-100 underline mt-1"
                >
                  Voir les tâches en retard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {statCardsData.map((stat, index) => (
            <div
              key={index}
              onClick={stat.action}
              className={`
                bg-slate-800/80 backdrop-blur-xl border border-slate-600/20 rounded-2xl p-7 
                cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:scale-105
                ${stat.hoverShadow} hover:shadow-2xl group
                ${activeQuickAction === stat.action ? 'scale-95' : ''}
              `}
              style={{ 
                animation: `fadeInUp 0.6s ease-out forwards`,
                animationDelay: `${index * 100}ms`,
                opacity: 0
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient} text-white shadow-lg`}>
                  {stat.icon}
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
              
              <h3 className={`text-5xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-2 leading-none`}>
                {stat.value}
              </h3>
              
              <p className="text-slate-200 text-lg font-semibold mb-1">
                {stat.title}
              </p>
              
              <p className="text-slate-400 text-sm mb-2">
                {stat.subtitle}
              </p>
              
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-green-400">{stat.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Actions rapides étendues */}
          <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-600/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                <Zap className="w-5 h-5" />
              </div>
              Actions rapides
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActionsData.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`
                    flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl 
                    text-white text-left transition-all duration-300 
                    hover:scale-105 hover:bg-white/10 hover:border-white/20
                    group relative overflow-hidden
                    ${activeQuickAction === action.action ? 'scale-95' : ''}
                  `}
                  style={{ 
                    animation: `fadeInUp 0.6s ease-out forwards`,
                    animationDelay: `${index * 100}ms`,
                    opacity: 0
                  }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                  <div className={`p-2 bg-gradient-to-r ${action.gradient} rounded-lg shadow-lg z-10 group-hover:scale-110 transition-transform`}>
                    {action.icon}
                  </div>
                  <div className="z-10 flex-1">
                    <div className="font-semibold mb-1">{action.title}</div>
                    <div className="text-sm text-slate-400">{action.description}</div>
                  </div>
                  <div className="text-xs text-slate-500 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    {action.shortcut}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tâches et Notes */}
          <div className="space-y-8">
            {/* Tâches récentes */}
            <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-600/20 rounded-3xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  Tâches récentes
                </h2>
                <button
                  onClick={() => handleQuickAction('tasks')}
                  className="text-blue-400 text-sm font-semibold hover:text-blue-300 hover:scale-105 transition-all duration-200 px-3 py-2 rounded-lg"
                >
                  Voir tout
                </button>
              </div>

              <div className="space-y-3">
                {recentTasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckSquare className="w-8 h-8 mx-auto mb-2" />
                    <p className="mb-3">Aucune tâche créée</p>
                    <button
                      onClick={() => handleQuickAction('tasks')}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                    >
                      Créer une tâche
                    </button>
                  </div>
                ) : (
                  recentTasks.slice(0, 4).map((task, index) => (
                    <div
                      key={task._id}
                      onClick={() => handleQuickAction('tasks')}
                      className="p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer transition-all duration-300 hover:translate-x-1 hover:bg-white/10 group"
                      style={{ 
                        animation: `fadeInUp 0.6s ease-out forwards`,
                        animationDelay: `${index * 100}ms`,
                        opacity: 0
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-1 rounded-lg ${getStatusColor(task.statut)}`}>
                            {task.statut === 'terminée' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-semibold ${
                              task.statut === 'terminée' 
                                ? 'text-slate-400 line-through' 
                                : 'text-white group-hover:text-blue-300'
                            }`}>
                              {task.titre}
                            </h3>
                            <p className="text-sm text-slate-400">{task.module}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(task.priorite)}`}>
                            {task.priorite}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                      </div>
                      
                      {task.dateEcheance && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                          <Calendar className="w-3 h-3" />
                          <span>Échéance: {new Date(task.dateEcheance).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notes récentes */}
            <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-600/20 rounded-3xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  Notes récentes
                </h2>
                <button
                  onClick={() => handleQuickAction('notes')}
                  className="text-amber-400 text-sm font-semibold hover:text-amber-300 hover:scale-105 transition-all duration-200 px-3 py-2 rounded-lg"
                >
                  Voir tout
                </button>
              </div>

              <div className="space-y-3">
                {recentNotes.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2" />
                    <p className="mb-3">Aucune note créée</p>
                    <button
                      onClick={() => handleQuickAction('notes')}
                      className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                    >
                      Créer une note
                    </button>
                  </div>
                ) : (
                  recentNotes.map((note, index) => (
                    <div
                      key={note._id}
                      onClick={() => handleQuickAction('notes')}
                      className="p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer transition-all duration-300 hover:translate-x-1 hover:bg-white/10 group"
                      style={{ 
                        animation: `fadeInUp 0.6s ease-out forwards`,
                        animationDelay: `${index * 100}ms`,
                        opacity: 0
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-amber-500/20 rounded-lg">
                            <BookOpen className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white group-hover:text-amber-300 transition-colors">
                              {note.title || note.titre}
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">
                              Modifiée {new Date(note.updatedAt || note.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .animate-fadeInUp {
            animation: fadeInUp 0.6s ease-out forwards;
          }
          
          /* Animations pour les interactions */
          @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          
          @keyframes slideInRight {
            from { transform: translateX(20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          
          /* Scrollbar personnalisée */
          ::-webkit-scrollbar {
            width: 6px;
          }
          
          ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 3px;
          }
          
          ::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.5);
            border-radius: 3px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(59, 130, 246, 0.7);
          }
        `
      }} />
    </div>
  );
};

export default Dashboard;
