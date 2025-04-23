// src/components/Content.js
import React from 'react';

function Content({ children, sidebarExpanded }) {
  return (
    <div className={`content ${sidebarExpanded ? 'expanded' : ''}`}>
      {children}
    </div>
  );
}

export default Content;