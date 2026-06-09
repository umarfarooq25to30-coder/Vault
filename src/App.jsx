// Root Router router mapping secure navigation paths, first launch states, login redirects, and layout frames.

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useVault } from './hooks/useVault';
import { useUiStore } from './store/uiStore';
import { useTheme } from './hooks/useTheme';
import { useVaultStore } from './store/vaultStore';
import { validateAndRepairDatabase } from './db/database';
import { DatabaseClearedNotice } from './components/ui/DatabaseClearedNotice';
import { LockKeyhole } from 'lucide-react';
import { MainContent } from './components/layout/MainContent';
import { SetupScreen } from './pages/SetupScreen';
import { UnlockScreen } from './pages/UnlockScreen';
import { RecoveryScreen } from './pages/RecoveryScreen';
import { ResetPasswordScreen } from './pages/ResetPasswordScreen';
import { Dashboard } from './pages/Dashboard';
import { Notes } from './pages/Notes';
import Gallery from './pages/Gallery';
import { Files } from './pages/Files';
import { Passwords } from './pages/Passwords';
import { Cards } from './pages/Cards';
import { Diary } from './pages/Diary';
import { Settings } from './pages/Settings';
import StorageManager from './pages/StorageManager';
import { ToastContainer } from './components/ui/Toast';
import { ROUTES } from './constants';

/**
 * Route protector checking if the local Vault is currently unlocked.
 * Wraps content in the MainContent Layout if unlocked; otherwise, locks page access.
 */
function ProtectedRoute({ children }) {
  const { isUnlocked, isSetupComplete } = useVault();

  if (!isSetupComplete) {
    return <Navigate to={ROUTES.SETUP} replace />;
  }

  if (!isUnlocked) {
    return <Navigate to={ROUTES.UNLOCK} replace />;
  }

  return <MainContent>{children}</MainContent>;
}

/**
 * Initial Root dispatcher routing users depending on Vault setup & unlocked metrics.
 */
function RootRedirect() {
  const { isSetupComplete, isUnlocked } = useVault();

  if (!isSetupComplete) {
    return <Navigate to={ROUTES.SETUP} replace />;
  }

  if (!isUnlocked) {
    return <Navigate to={ROUTES.UNLOCK} replace />;
  }

  return <Navigate to={ROUTES.DASHBOARD} replace />;
}

export function App() {
  useTheme();
  const [dbReady, setDbReady] = useState(false);
  const [dbCleared, setDbCleared] = useState(false);
  const resetVaultState = useVaultStore((s) => s.resetVault);

  useEffect(() => {
    async function initializeApp() {
      try {
        const result = await validateAndRepairDatabase();
        if (result.action === 'cleared') {
          await resetVaultState();
          setDbCleared(true);
        }
      } catch (err) {
        await resetVaultState();
        setDbCleared(true);
      } finally {
        setDbReady(true);
      }
    }
    initializeApp();
  }, [resetVaultState]);

  if (!dbReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#141414]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#F0F0F0] dark:bg-[#252525] flex items-center justify-center">
            <LockKeyhole className="w-5 h-5 text-[#9B9B9B]" />
          </div>
          <p className="text-[13px] text-[#9B9B9B] dark:text-[#666666]">
            Starting Vault...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {dbCleared && <DatabaseClearedNotice />}
      <BrowserRouter>
        <Routes>
          {/* Entrance Route Dispatcher */}
          <Route path={ROUTES.ROOT} element={<RootRedirect />} />

          {/* Setup and Unlock Routes */}
          <Route path={ROUTES.SETUP} element={<SetupScreen />} />
          <Route path={ROUTES.UNLOCK} element={<UnlockScreen />} />
          <Route path={ROUTES.RECOVER} element={<RecoveryScreen />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordScreen />} />

          {/* Protected Feature Portals */}
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.NOTES}
            element={
              <ProtectedRoute>
                <Notes />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.GALLERY}
            element={
              <ProtectedRoute>
                <Gallery />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.FILES}
            element={
              <ProtectedRoute>
                <Files />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.PASSWORDS}
            element={
              <ProtectedRoute>
                <Passwords />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.CARDS}
            element={
              <ProtectedRoute>
                <Cards />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.DIARY}
            element={
              <ProtectedRoute>
                <Diary />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.SETTINGS}
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.STORAGE}
            element={
              <ProtectedRoute>
                <StorageManager />
              </ProtectedRoute>
            }
          />

          {/* Fallback Catch */}
          <Route path="*" element={<Navigate to={ROUTES.ROOT} replace />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </>
  );
}

export default App;
