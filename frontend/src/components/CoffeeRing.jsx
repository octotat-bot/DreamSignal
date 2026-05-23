import React from 'react';

// CoffeeRing — pure CSS decorative element
const CoffeeRing = ({ className = '', style = {} }) => (
  <div
    className={`coffee-ring coffee-ring-outer ${className}`}
    style={style}
    aria-hidden="true"
  >
    <div className="coffee-ring-inner" />
  </div>
);

export default CoffeeRing;
