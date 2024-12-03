import React, { useState, useEffect } from 'react';
import './Header.css';

interface HeaderProps {
  measurementUnits: string;
  setMeasurementUnits: any;
  websiteType: string | null;
}

const Header: React.FC<HeaderProps> = ({
  measurementUnits,
  setMeasurementUnits,
  websiteType,
}) => {
  const handleChange = (event: any) => {
    const selectedValue = event.target.value;
    setMeasurementUnits(selectedValue);
  };

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Determine whether to show units selection based on website type
  const showUnitsSelection = websiteType === 'sailors';

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <img
            src="assets/img/logo-eolos.svg"
            alt="Eolos"
            className="navbar-eolos"
          />
        </div>
        <div className="navbar-brand">
          <img src="assets/img/logo-sailorsApp.svg" alt="Sailors App" />
        </div>
        <div className="navbar-brand">
          {showUnitsSelection &&
            (windowSize.width < 992 ? (
              <select value={measurementUnits} onChange={handleChange}>
                <option value="INT">INT</option>
                <option value="IMP">IMP</option>
              </select>
            ) : (
              <>
                <label>Units:</label>
                <select value={measurementUnits} onChange={handleChange}>
                  <option value="INT">International</option>
                  <option value="IMP">Imperial</option>
                </select>
              </>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Header;
