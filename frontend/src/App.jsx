// src/App.jsx - VERSION CORRIGÉE
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginUnified from './components/Login';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import Timer from './components/Timer';
import Stats from './components/Stats';
import Calendar from './components/Calendar';
import Layout from './components/Layout';
import Session from './components/Session';
import Notes from './components/Notes';
import './App.css';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appError, setAppError] = useState(null);

  // Fonction pour vérifier si le token est valide côté client
  const isTokenValid = (token) => {
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      // Vérifier si le token n'est pas expiré
      if (payload.exp < currentTime) {
        console.log('Token expiré');
        return false;
      }
      
      console.log('Token valide jusqu\'au:', new Date(payload.exp * 1000));
      return true;
    } catch (error) {
      console.error('Erreur décodage token:', error);
      return false;
    }
  };

  // Vérifier l'authentification au chargement
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      console.log('🔍 Vérification authentification...');
      console.log('Token trouvé:', !!token);
      console.log('User data trouvé:', !!userData);
      
      if (token && userData && isTokenValid(token)) {
        console.log('✅ Token valide côté client');
        
        // Optionnel: Vérifier avec le serveur en utilisant l'endpoint /me existant
        try {
          const response = await fetch('http://localhost:5000/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const serverUser = await response.json();
            console.log('✅ Token validé côté serveur');
            setUser(serverUser);
            setIsAuthenticated(true);
          } else {
            console.log('❌ Token rejeté par le serveur');
            // Token invalide côté serveur, déconnecter
            handleLogout();
          }
        } catch (networkError) {
          console.log('⚠️ Erreur réseau, utilisation du cache local');
          // En cas d'erreur réseau, utiliser les données locales
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
        }
      } else {
        console.log('❌ Pas de token valide');
        handleLogout();
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error);
      handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de logout
  const handleLogout = () => {
    console.log('🚪 Déconnexion');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setAppError(null);
  };

  // Fonction de login (appelée depuis le composant Login)
  const handleLogin = (userData, token) => {
    try {
      console.log('🔑 Connexion:', userData);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      setAppError(null);
    } catch (error) {
      console.error('Erreur lors du login:', error);
      setAppError('Erreur lors de la connexion');
    }
  };

  // Gestion d'erreur globale
  const handleGlobalError = (error) => {
    console.error('Erreur globale:', error);
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      handleLogout();
    } else {
      setAppError(error.message);
    }
  };

  // Composant de chargement amélioré
  const LoadingScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Logo animé */}
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-2xl">
            <span className="text-2xl font-bold text-white">F</span>
          </div>
          <div className="absolute inset-0 w-16 h-16 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-2xl animate-ping opacity-20"></div>
        </div>
        
        {/* Spinner */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-slate-600 border-t-green-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-b-emerald-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
        </div>
        
        {/* Texte */}
        <div className="text-center">
          <p className="text-slate-400 text-lg font-medium mb-2">Chargement de FocusTâche...</p>
          <p className="text-slate-500 text-sm">Vérification de votre authentification</p>
        </div>
        
        {/* Points de progression */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div 
              key={i}
              className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.3}s` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );

  // Composant d'erreur globale
  const ErrorBoundary = ({ error, onRetry, onLogout }) => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-sm border border-red-500/30 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 p-4 bg-red-500/20 rounded-full">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.186-.833-2.956 0L3.858 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-4">Oups ! Une erreur s'est produite</h2>
        <p className="text-red-300 mb-6">{error}</p>
        
        <div className="flex gap-4">
          <button 
            onClick={onRetry}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            Réessayer
          </button>
          <button 
            onClick={onLogout}
            className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );

  // Composant de route protégée
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  // États de chargement et d'erreur
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (appError) {
    return (
      <ErrorBoundary 
        error={appError} 
        onRetry={() => {
          setAppError(null);
          checkAuthentication();
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <Router>
      <div className="App min-h-screen bg-slate-900">
        {!isAuthenticated ? (
          <Routes>
            <Route path="/login" element={<LoginUnified onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <Layout user={user} onLogout={handleLogout}>
            <Routes>
              {/* Routes principales */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard user={user} onError={handleGlobalError} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tasks" 
                element={
                  <ProtectedRoute>
                    <TaskList onError={handleGlobalError} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/sessions" 
                element={
                  <ProtectedRoute>
                    <Session onError={handleGlobalError} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/notes" 
                element={
                  <ProtectedRoute>
                    <Notes onError={handleGlobalError} />
                  </ProtectedRoute>
                } 
              />
             
        
              <Route 
                path="/stats" 
                element={
                  <ProtectedRoute>
                    <Stats onError={handleGlobalError} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/calendar" 
                element={
                  <ProtectedRoute>
                    <Calendar onError={handleGlobalError} />
                  </ProtectedRoute>
                } 
              />
              
              {/* Routes de redirection et 404 */}
              <Route path="/login" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        )}
      </div>
    </Router>
  );
};

export default App;
