import React from "react";
import RiskForm from "./RiskForm";
import Dashboard from "./Dashboard";

function App() {
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleRiskAdded = () => setRefreshKey((prev) => prev + 1);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-grc-blue">
        GRC Risk Assessment Tool
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RiskForm onRiskAdded={handleRiskAdded} />
        <Dashboard key={refreshKey} /> {/* Refresh on add */}
      </div>
    </div>
  );
}

export default App;
