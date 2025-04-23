import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { auth } from './firebase/firebase';
import Login from './components/Login';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Content from './components/Content';
import Subnav from './components/Subnav';
import Permissions from './components/Permissions';
import Team from './components/Team';
import Candidates from './components/Candidates';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // State to control loading
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      console.log('Auth state changed:', currentUser ? 'User logged in' : 'User logged out');
      setUser(currentUser);
      setLoading(false); // Authentication completed, stop loading
      if (!currentUser) {
        navigate('/login');
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleLogout = () => {
    auth.signOut().then(() => navigate('/login'));
  };

  const addNotification = (message) => {
    setNotifications((prev) => [...prev, { message, timestamp: new Date() }]);
  };

  const ProtectedContent = ({ children }) => (
    <>
      <Header
        user={user}
        onLogout={handleLogout}
        notifications={notifications}
        setNotifications={setNotifications}
      />
      <Sidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
      />
      <Content sidebarExpanded={sidebarExpanded}>
        {children}
      </Content>
    </>
  );

  // While loading, render nothing (avoids premature redirection)
  if (loading) {
    return null;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          user ? (
            <ProtectedContent>
              <h2>Welcome to System Management</h2>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/people/team"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'team', label: 'Team' },
                  { path: 'candidates', label: 'Candidates' },
                ]}
                basePath="/people"
              />
              <div className="content-container">
                <Team addNotification={addNotification} />
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/people/candidates"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'team', label: 'Team' },
                  { path: 'candidates', label: 'Candidates' },
                ]}
                basePath="/people"
              />
              <div className="content-container">
                <Candidates addNotification={addNotification} />
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/people"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'team', label: 'Team' },
                  { path: 'candidates', label: 'Candidates' },
                ]}
                basePath="/people"
              />
              <div className="content-container">
                <Team addNotification={addNotification} />
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/vacation-shifts/week"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'week', label: 'Week Schedules' },
                  { path: 'weekend', label: 'Weekend Schedules' },
                  { path: 'calendar', label: 'Vacation Calendar' },
                ]}
                basePath="/vacation-shifts"
              />
              <div className="content-container">
                <h2>Week Schedules</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/vacation-shifts/weekend"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'week', label: 'Week Schedules' },
                  { path: 'weekend', label: 'Weekend Schedules' },
                  { path: 'calendar', label: 'Vacation Calendar' },
                ]}
                basePath="/vacation-shifts"
              />
              <div className="content-container">
                <h2>Weekend Schedules</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/vacation-shifts/calendar"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'week', label: 'Week Schedules' },
                  { path: 'weekend', label: 'Weekend Schedules' },
                  { path: 'calendar', label: 'Vacation Calendar' },
                ]}
                basePath="/vacation-shifts"
              />
              <div className="content-container">
                <h2>Vacation Calendar</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/vacation-shifts"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'week', label: 'Week Schedules' },
                  { path: 'weekend', label: 'Weekend Schedules' },
                  { path: 'calendar', label: 'Vacation Calendar' },
                ]}
                basePath="/vacation-shifts"
              />
              <div className="content-container">
                <h2>Week Schedules</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          user ? (
            <ProtectedContent>
              <div className="content-container">
                <h2>Dashboard</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/finance/extratos"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'extratos', label: 'Extratos' },
                  { path: 'dashboard', label: 'Dashboard' },
                ]}
                basePath="/finance"
              />
              <div className="content-container">
                <h2>Extratos</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/finance/dashboard"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'extratos', label: 'Extratos' },
                  { path: 'dashboard', label: 'Dashboard' },
                ]}
                basePath="/finance"
              />
              <div className="content-container">
                <h2>Finance Dashboard</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/finance"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'extratos', label: 'Extratos' },
                  { path: 'dashboard', label: 'Dashboard' },
                ]}
                basePath="/finance"
              />
              <div className="content-container">
                <h2>Extratos</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/ai-faq/b2hive"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/ai-faq"
              />
              <div className="content-container">
                <h2>B2Hive FAQ</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/ai-faq/exnie"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/ai-faq"
              />
              <div className="content-container">
                <h2>Exnie FAQ</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/ai-faq/fundscap"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/ai-faq"
              />
              <div className="content-container">
                <h2>FundsCap FAQ</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/ai-faq/onequity"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/ai-faq"
              />
              <div className="content-container">
                <h2>OnEquity FAQ</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/ai-faq"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/ai-faq"
              />
              <div className="content-container">
                <h2>B2Hive FAQ</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/video/b2hive"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/video"
              />
              <div className="content-container">
                <h2>B2Hive Video</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/video/exnie"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/video"
              />
              <div className="content-container">
                <h2>Exnie Video</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/video/fundscap"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/video"
              />
              <div className="content-container">
                <h2>FundsCap Video</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/video/onequity"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/video"
              />
              <div className="content-container">
                <h2>OnEquity Video</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/video"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/video"
              />
              <div className="content-container">
                <h2>B2Hive Video</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/procedures/b2hive"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/procedures"
              />
              <div className="content-container">
                <h2>B2Hive Procedures</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/procedures/exnie"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/procedures"
              />
              <div className="content-container">
                <h2>Exnie Procedures</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/procedures/fundscap"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/procedures"
              />
              <div className="content-container">
                <h2>FundsCap Procedures</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/procedures/onequity"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/procedures"
              />
              <div className="content-container">
                <h2>OnEquity Procedures</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/training/procedures"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'b2hive', label: 'B2Hive' },
                  { path: 'exnie', label: 'Exnie' },
                  { path: 'fundscap', label: 'FundsCap' },
                  { path: 'onequity', label: 'OnEquity' },
                ]}
                basePath="/training/procedures"
              />
              <div className="content-container">
                <h2>B2Hive Procedures</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/onequity/ai-support"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'ai-support', label: 'A.I. Support' },
                  { path: 'internal-control', label: 'Internal Control' },
                  { path: 'termination', label: 'Termination' },
                  { path: 'complaints', label: 'Clients Complaints' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                  { path: 'trustpilot', label: 'TrustPilot' },
                  { path: 'lots-profits', label: 'Lots and Profits' },
                ]}
                basePath="/apps/onequity"
              />
              <div className="content-container">
                <h2>A.I. Support</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/onequity/internal-control"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'ai-support', label: 'A.I. Support' },
                  { path: 'internal-control', label: 'Internal Control' },
                  { path: 'termination', label: 'Termination' },
                  { path: 'complaints', label: 'Clients Complaints' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                  { path: 'trustpilot', label: 'TrustPilot' },
                  { path: 'lots-profits', label: 'Lots and Profits' },
                ]}
                basePath="/apps/onequity"
              />
              <div className="content-container">
                <h2>Internal Control</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/onequity/termination"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'ai-support', label: 'A.I. Support' },
                  { path: 'internal-control', label: 'Internal Control' },
                  { path: 'termination', label: 'Termination' },
                  { path: 'complaints', label: 'Clients Complaints' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                  { path: 'trustpilot', label: 'TrustPilot' },
                  { path: 'lots-profits', label: 'Lots and Profits' },
                ]}
                basePath="/apps/onequity"
              />
              <div className="content-container">
                <h2>Termination</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/onequity/complaints"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'ai-support', label: 'A.I. Support' },
                  { path: 'internal-control', label: 'Internal Control' },
                  { path: 'termination', label: 'Termination' },
                  { path: 'complaints', label: 'Clients Complaints' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                  { path: 'trustpilot', label: 'TrustPilot' },
                  { path: 'lots-profits', label: 'Lots and Profits' },
                ]}
                basePath="/apps/onequity"
              />
              <div className="content-container">
                <h2>Clients Complaints</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/onequity/templates"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'ai-support', label: 'A.I. Support' },
                  { path: 'internal-control', label: 'Internal Control' },
                  { path: 'termination', label: 'Termination' },
                  { path: 'complaints', label: 'Clients Complaints' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                  { path: 'trustpilot', label: 'TrustPilot' },
                  { path: 'lots-profits', label: 'Lots and Profits' },
                ]}
                basePath="/apps/onequity"
              />
              <div className="content-container">
                <h2>Templates</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/onequity/templates-html"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'ai-support', label: 'A.I. Support' },
                  { path: 'internal-control', label: 'Internal Control' },
                  { path: 'termination', label: 'Termination' },
                  { path: 'complaints', label: 'Clients Complaints' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                  { path: 'trustpilot', label: 'TrustPilot' },
                  { path: 'lots-profits', label: 'Lots and Profits' },
                ]}
                basePath="/apps/onequity"
              />
              <div className="content-container">
                <h2>Templates | HTML</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/onequity/trustpilot"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'ai-support', label: 'A.I. Support' },
                  { path: 'internal-control', label: 'Internal Control' },
                  { path: 'termination', label: 'Termination' },
                  { path: 'complaints', label: 'Clients Complaints' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                  { path: 'trustpilot', label: 'TrustPilot' },
                  { path: 'lots-profits', label: 'Lots and Profits' },
                ]}
                basePath="/apps/onequity"
              />
              <div className="content-container">
                <h2>TrustPilot</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/onequity/lots-profits"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'ai-support', label: 'A.I. Support' },
                  { path: 'internal-control', label: 'Internal Control' },
                  { path: 'termination', label: 'Termination' },
                  { path: 'complaints', label: 'Clients Complaints' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                  { path: 'trustpilot', label: 'TrustPilot' },
                  { path: 'lots-profits', label: 'Lots and Profits' },
                ]}
                basePath="/apps/onequity"
              />
              <div className="content-container">
                <h2>Lots and Profits</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/onequity"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'ai-support', label: 'A.I. Support' },
                  { path: 'internal-control', label: 'Internal Control' },
                  { path: 'termination', label: 'Termination' },
                  { path: 'complaints', label: 'Clients Complaints' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                  { path: 'trustpilot', label: 'TrustPilot' },
                  { path: 'lots-profits', label: 'Lots and Profits' },
                ]}
                basePath="/apps/onequity"
              />
              <div className="content-container">
                <h2>A.I. Support</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/exnie/order-management"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'order-management', label: 'Order Management' },
                  { path: 'trading-analysis', label: 'Trading Analysis' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                ]}
                basePath="/apps/exnie"
              />
              <div className="content-container">
                <h2>Order Management</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/exnie/trading-analysis"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'order-management', label: 'Order Management' },
                  { path: 'trading-analysis', label: 'Trading Analysis' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                ]}
                basePath="/apps/exnie"
              />
              <div className="content-container">
                <h2>Trading Analysis</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/exnie/templates"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'order-management', label: 'Order Management' },
                  { path: 'trading-analysis', label: 'Trading Analysis' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                ]}
                basePath="/apps/exnie"
              />
              <div className="content-container">
                <h2>Templates</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/exnie/templates-html"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'order-management', label: 'Order Management' },
                  { path: 'trading-analysis', label: 'Trading Analysis' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                ]}
                basePath="/apps/exnie"
              />
              <div className="content-container">
                <h2>Templates | HTML</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/apps/exnie"
        element={
          user ? (
            <ProtectedContent>
              <Subnav
                items={[
                  { path: 'order-management', label: 'Order Management' },
                  { path: 'trading-analysis', label: 'Trading Analysis' },
                  { path: 'templates', label: 'Templates' },
                  { path: 'templates-html', label: 'Templates | HTML' },
                ]}
                basePath="/apps/exnie"
              />
              <div className="content-container">
                <h2>Order Management</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/admin/config"
        element={
          user ? (
            <ProtectedContent>
              <div className="content-container">
                <h2>Config</h2>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/admin/permissions"
        element={
          user ? (
            <ProtectedContent>
              <Permissions />
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/admin/logs"
        element={
          user ? (
            <ProtectedContent>
              <div className="content-container">
                <h2>Activity Logs</h2>
                <p>Log entries will be displayed here.</p>
              </div>
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="*"
        element={
          user ? (
            <ProtectedContent>
              <Team addNotification={addNotification} />
            </ProtectedContent>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}

export default App;