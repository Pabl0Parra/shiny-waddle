import React, { useState } from 'react';
import ChartsGlobalContent from '../Charts/ChartsGlobalContent';
import './Sidebar.css';
import { SidebarProps } from '../../../../types';
import { motion } from 'framer-motion';

const SideGlobalComponent: React.FC<SidebarProps> = ({
  onToggle,
  isActive,
  htmlDetailBouy,
  noData,
  mobile,
  bouysLoadMap,
  dataBuoy,
  measurementUnits,
  lastTimeStamp,
  lastBuoyTimeStamp,
  selectedNameBuoy,
  logoBuoy,
  lat_str,
  longi_str,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'charts'>('details');

  const handleTabClick = (tab: 'details' | 'charts') => {
    setActiveTab(tab);
  };

  // Animation Variants
  const motionVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6 } },
    exit: { opacity: 0, scale: 0.8, y: 50, transition: { duration: 0.5 } },
  };

  return (
    <div
      className={`sidebar ${bouysLoadMap ? '' : 'sidebar-hidden'} ${
        isActive ? 'sidebar-close' : ''
      }`}
    >
      {mobile ? (
        <div className="sidebar-buttons">
          <button
            className={`${isActive ? 'button-data' : ''}`}
            onClick={() => onToggle('DATA')}
          >
            DATA
          </button>
          <button
            className={`${isActive ? '' : 'button-map'}`}
            onClick={() => onToggle('MAP')}
          >
            MAP
          </button>
        </div>
      ) : (
        <div className="sidebar-button" onClick={() => onToggle('')}>
          <img src="assets/img/icon-chevron.svg" alt="Toggle Sidebar" />
        </div>
      )}

      <div className="sidebar-content">
        {/* Tab Navigation */}
        {htmlDetailBouy && (
          <div className="sidebar-tabs">
            <button
              className={`tab-button ${
                activeTab === 'details' ? 'active' : ''
              }`}
              onClick={() => handleTabClick('details')}
            >
              Data
            </button>
            <button
              className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => handleTabClick('charts')}
            >
              Charts
            </button>
          </div>
        )}
        {/* Tab Content */}
        {activeTab === 'details' ? (
          htmlDetailBouy ? (
            <div dangerouslySetInnerHTML={{ __html: htmlDetailBouy }} />
          ) : noData ? (
            <div className="sidebar-message">
              <p>
                Hello! By tapping on a buoy, you can explore
                <strong>
                  {' '}
                  buoy <img src="assets/img/icon-pointer.png" alt="buoy" />
                </strong>
                data.
              </p>
              <img
                src="assets/img/img_selected-map.svg"
                alt="Tapping on a buoy on the map"
              />
            </div>
          ) : (
            <div className="skeleton-loader">
              <h1>
                <span className="skeleton-item">Loading...</span>
              </h1>
              <div className="skeleton-item ubication">
                <img src="assets/img/icon-pointer.svg" alt="Pointer map" />{' '}
                <span>Barcelona, Catalonia</span>
              </div>
              <div className="date">
                <span className="skeleton-item">
                  <img src="assets/img/icon-date.svg" alt="Date" />
                </span>
                <span className="skeleton-item">25/04/1987 ~ 03:00 AM</span>
              </div>
              <div className="list">
                <div className="list-item">
                  <div className="list-item-icon skeleton-item">
                    <img
                      src="assets/img/icons/icono-e-default.svg"
                      alt="Eolos"
                    />
                  </div>
                  <div className="list-item-content">
                    <div className="list-item-col">
                      <span className="title skeleton-item">Label Text</span>
                      <span className="text skeleton-item">898.3m</span>
                    </div>
                    <div className="list-item-col">
                      <span className="title skeleton-item">Label Text</span>
                      <span className="text skeleton-item">88.3m</span>
                    </div>
                    <div className="list-item-col">
                      <span className="title skeleton-item">Label Text</span>
                      <span className="text skeleton-item">88.3m</span>
                    </div>
                  </div>
                </div>
                <img
                  src="assets/img/icon-dots.svg"
                  alt="More options"
                  className="dots"
                />
              </div>
            </div>
          )
        ) : (
          <motion.div
            key="charts-content"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={motionVariants}
          >
            <ChartsGlobalContent
              dataBuoy={dataBuoy}
              measurementUnits={measurementUnits}
              lastTimeStamp={lastTimeStamp}
              lastBuoyTimeStamp={lastBuoyTimeStamp}
              selectedNameBuoy={selectedNameBuoy}
              logoBuoy={logoBuoy}
              lat_str={lat_str}
              longi_str={longi_str}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SideGlobalComponent;
