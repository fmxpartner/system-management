// src/components/Subnav.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Subnav({ items, basePath }) {
  const location = useLocation();

  return (
    <div className="subnav">
      {items.map((item) => (
        <Link
          key={item.path}
          to={`${basePath}/${item.path}`}
          className={`subnav-item ${
            location.pathname === `${basePath}/${item.path}` ? 'active' : ''
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export default Subnav;