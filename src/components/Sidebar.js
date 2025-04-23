// src/components/Sidebar.js
import React from 'react';
import { Link } from 'react-router-dom';

function Sidebar({ sidebarExpanded, setSidebarExpanded }) {
  const [expanded, setExpanded] = React.useState({
    hr: false,
    training: false,
    apps: false,
    admin: false,
  });

  const toggleMenu = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      className={`sidebar ${sidebarExpanded ? 'expanded' : ''}`}
      onMouseEnter={() => setSidebarExpanded(true)}
      onMouseLeave={() => setSidebarExpanded(false)}
    >
      <div className="menu-item" onClick={() => toggleMenu('hr')}>
        <i className="fas fa-users"></i>
        <span>Human Resources</span>
        <i
          className={`fas fa-chevron-${expanded.hr ? 'up' : 'down'} toggle-icon`}
        ></i>
      </div>
      {expanded.hr && (
        <>
          <Link to="/people" className="submenu">
            People
          </Link>
          <Link to="/vacation-shifts" className="submenu">
            Vacation | Shifts
          </Link>
          <Link to="/dashboard" className="submenu">
            Dashboard
          </Link>
        </>
      )}
      <div className="menu-item">
        <i className="fas fa-dollar-sign"></i>
        <span>
          <Link to="/finance" className="menu-item-link">
            Finance
          </Link>
        </span>
      </div>
      <div className="menu-item" onClick={() => toggleMenu('training')}>
        <i className="fas fa-graduation-cap"></i>
        <span>Training</span>
        <i
          className={`fas fa-chevron-${expanded.training ? 'up' : 'down'} toggle-icon`}
        ></i>
      </div>
      {expanded.training && (
        <>
          <Link to="/training/ai-faq" className="submenu">
            AI | FAQ
          </Link>
          <Link to="/training/video" className="submenu">
            Technical Video
          </Link>
          <Link to="/training/procedures" className="submenu">
            Procedures Video
          </Link>
        </>
      )}
      <div className="menu-item" onClick={() => toggleMenu('apps')}>
        <i className="fas fa-mobile-alt"></i>
        <span>Apps</span>
        <i
          className={`fas fa-chevron-${expanded.apps ? 'up' : 'down'} toggle-icon`}
        ></i>
      </div>
      {expanded.apps && (
        <>
          <Link to="/apps/onequity" className="submenu">
            OnEquity
          </Link>
          <Link to="/apps/exnie" className="submenu">
            Exnie
          </Link>
        </>
      )}
      <div className="menu-item" onClick={() => toggleMenu('admin')}>
        <i className="fas fa-cog"></i>
        <span>Admin</span>
        <i
          className={`fas fa-chevron-${expanded.admin ? 'up' : 'down'} toggle-icon`}
        ></i>
      </div>
      {expanded.admin && (
        <>
          <Link to="/admin/config" className="submenu">
            Config
          </Link>
          <Link to="/admin/permissions" className="submenu">
            Permissions
          </Link>
          <Link to="/admin/logs" className="submenu">
            Activity Logs
          </Link>
        </>
      )}
    </div>
  );
}

export default Sidebar;