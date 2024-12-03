import React, { useState } from 'react';
import ChartsContent from '../Charts/ChartsContent';

import './Sidebar.css';
import { Item, SidebarProps } from '../../../../types';
import { motion } from 'framer-motion';

const Sidebar: React.FC<SidebarProps> = ({
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
            className={`${isActive ? 'button-dades' : ''}`}
            onClick={() => onToggle('DADES')}
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
          <img src="assets/img/icon-chevron.svg" alt="Open" />
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
              データ
            </button>
            <button
              className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => handleTabClick('charts')}
            >
              チャート
            </button>
          </div>
        )}
        {/* Tab Content */}
        {activeTab === 'details' ? (
          htmlDetailBouy ? (
            <div dangerouslySetInnerHTML={{ __html: htmlDetailBouy }} />
          ) : noData ? (
            <div className="sidebar-message">
              {/* Original message */}
              {/* <p>
                Hello! Explore buoy data by{' '}
                <strong>
                  tapping on a buoy{' '}
                  <img src="assets/img/icon-pointer.png" alt="buoy" /> on the
                  map
                </strong>
                .
              </p> */}
              <p>
                こんにちは! ブイにタップすることで、
                <strong>
                  ブイ <img src="assets/img/icon-pointer.png" alt="buoy" />
                </strong>
                データを探索することができます。
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
                <span>Barcelona, Catalunya</span>
              </div>
              <div className="date">
                <span className="skeleton-item">
                  <img src="assets/img/icon-date.svg" alt="Date" />
                </span>
                <span className="skeleton-item">25/04/1987 ~ 03:00 AM</span>
              </div>
              <div className="list">
                {/* Repeat list items as needed */}
                <div className="list-item">
                  <div className="list-item-icon skeleton-item">
                    <img
                      src="assets/img/icons/icono-e-default.svg"
                      alt="Eolos"
                    />
                  </div>
                  <div className="list-item-content">
                    <div className="list-item-col">
                      <span className="title skeleton-item">Label text</span>
                      <span className="text skeleton-item">898,3m</span>
                    </div>
                    <div className="list-item-col">
                      <span className="title skeleton-item">Label text</span>
                      <span className="text skeleton-item">88,3m</span>
                    </div>
                    <div className="list-item-col">
                      <span className="title skeleton-item">Label text</span>
                      <span className="text skeleton-item">88,3m</span>
                    </div>
                  </div>
                </div>
                <img
                  src="assets/img/icon-dots.svg"
                  alt="..."
                  className="dots"
                />
              </div>
            </div>
          )
        ) : (
          // Add animation to ChartsContent
          <motion.div
            key="charts-content"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={motionVariants}
          >
            <ChartsContent
              dataBuoy={dataBuoy}
              measurementUnits={measurementUnits}
              lastTimeStamp={lastTimeStamp}
              lastBuoyTimeStamp={lastBuoyTimeStamp}
              selectedNameBuoy={selectedNameBuoy}
              logoBuoy={logoBuoy}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
