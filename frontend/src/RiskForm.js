import React, { useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

const RiskForm = ({ onRiskAdded }) => {
  const [asset, setAsset] = useState("");
  const [threat, setThreat] = useState("");
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);

  const calculateScore = () => likelihood * impact;

  const calculateLevel = (score) => {
    if (score <= 5)
      return { label: "Low", color: "bg-green-100 text-green-700" };
    if (score <= 12)
      return { label: "Medium", color: "bg-yellow-100 text-yellow-700" };
    if (score <= 18)
      return { label: "High", color: "bg-orange-100 text-orange-700" };
    return { label: "Critical", color: "bg-red-100 text-red-700" };
  };

  const score = calculateScore();
  const level = calculateLevel(score);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/assess-risk`, {
        asset,
        threat,
        likelihood,
        impact,
      });
      alert("Risk added successfully!");
      onRiskAdded(); // Callback to refresh dashboard
      // Reset form
      setAsset("");
      setThreat("");
      setLikelihood(3);
      setImpact(3);
    } catch (error) {
      alert(
        "Error adding risk: " + (error.response?.data?.error || error.message),
      );
    }
  };

  return (
    <div className="bg-gray-50 p-6 rounded-xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-blue-700">Add New Risk</h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${level.color}`}
        >
          {level.label}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-blue-600 font-semibold mb-3">
            Risk Identification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Asset</label>
              <input
                type="text"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="mt-1 w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. Database Server"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Threat</label>
              <input
                type="text"
                value={threat}
                onChange={(e) => setThreat(e.target.value)}
                className="mt-1 w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. Unauthorized Access"
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          {/* <h3 className="text-blue-600 font-semibold mb-3">Risk Assessment</h3> */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium">Likelihood (1–5)</label>
              <input
                type="range"
                min="1"
                max="5"
                value={likelihood}
                onChange={(e) => setLikelihood(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <p className="text-sm mt-1">Value: {likelihood}</p>
            </div>

            <div>
              <label className="text-sm font-medium">Impact (1–5)</label>
              <input
                type="range"
                min="1"
                max="5"
                value={impact}
                onChange={(e) => setImpact(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <p className="text-sm mt-1">Value: {impact}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="text-sm font-medium">
              Risk Score:{" "}
              <span className="font-bold text-blue-700">{score}</span>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-semibold ${level.color}`}
            >
              {level.label}
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <button
            type="submit"
            className="bg-grc-blue text-white px-6 py-2 rounded shadow hover:bg-blue-700 transition"
          >
            Submit Risk
          </button>
        </div>
      </form>
    </div>
  );
};

export default RiskForm;
