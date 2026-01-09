import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Sidebar } from './components/common/Sidebar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { EnergyBreakdown } from './components/Analytics/EnergyBreakdown';
import { HistoricalChart } from './components/Analytics/HistoricalChart';
import { ModelInfoCard } from './components/Analytics/ModelInfoCard';
import { LoadSignatureChart } from './components/Analytics/LoadSignatureChart';
import { CarbonFootprint } from './components/Analytics/CarbonFootprint';
import { LoadManagement } from './components/LoadManagement/LoadManagement';
import { TrainingManagement } from './components/Training/TrainingManagement';

function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-light-surface">
          <Sidebar />
          
          {/* Main Content with Sidebar Offset */}
          <main className="ml-64 min-h-screen">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route
                path="/analytics"
                element={
                  <div className="p-8">
                    <div className="mb-8">
                      <h1 className="text-2xl font-semibold text-neutral-darker mb-1">Analytics</h1>
                      <p className="text-sm text-neutral-muted">Energy consumption analysis and cost estimation</p>
                    </div>
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <EnergyBreakdown />
                        <HistoricalChart />
                      </div>
                      <CarbonFootprint />
                      <LoadSignatureChart />
                    </div>
                  </div>
                }
              />
              <Route
                path="/loads"
                element={
                  <div className="p-8">
                    <LoadManagement />
                  </div>
                }
              />
              <Route
                path="/training"
                element={
                  <div className="p-8">
                    <TrainingManagement />
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

