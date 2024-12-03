import React, { useState } from 'react';
import './App.css';
import Header from './components/Header/Header';
import Content from './components/Content/Content';
import config from './config';

const App: React.FC = () => {
  const [measurementUnits, setMeasurementUnits] = useState('INT');
  const websiteType = config.website;

  return (
    <div className="App">
      <Header
        measurementUnits={measurementUnits}
        setMeasurementUnits={setMeasurementUnits}
        websiteType={websiteType}
      />
      <Content measurementUnits={measurementUnits} />
    </div>
  );
};

export default App;
