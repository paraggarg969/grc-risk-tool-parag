import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import Papa from "papaparse";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const API_URL = process.env.REACT_APP_API_URL;

const getMitigationHint = (level) => {
  switch (level) {
    case "Low":
      return "Monitor";
    case "Medium":
      return "Plan mitigation";
    case "High":
      return "Prioritize action per NIST";
    case "Critical":
      return "Immediate response";
    default:
      return "";
  }
};

const Dashboard = () => {
  const [risks, setRisks] = useState([]);
  const [filterLevel, setFilterLevel] = useState("All");
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState([]);

  const fetchRisks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/risks${filterLevel !== "All" ? `?level=${filterLevel}` : ""}`,
      );

      // Log the response to debug
      console.log("API Response:", response);
      console.log("Response data:", response.data);

      // Check if response.data exists
      if (response.data && Array.isArray(response.data)) {
        setRisks(response.data);
      } else {
        console.error("Unexpected API response:", response);
        setRisks([]);
      }
    } catch (error) {
      console.error("Error fetching risks:", error);
    }
    setLoading(false);
  }, [filterLevel]); // Add filterLevel as dependency;

  useEffect(() => {
    fetchRisks();
  }, [filterLevel]); // Now fetchRisks is stable due to useCallback

  // Table data with mitigation hint
  const data = useMemo(
    () =>
      risks.map((risk) => ({
        ...risk,
        mitigation: getMitigationHint(risk.level),
      })),
    [risks],
  );

  const columns = useMemo(
    () => [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "asset", header: "Asset" },
      { accessorKey: "threat", header: "Threat" },
      { accessorKey: "likelihood", header: "Likelihood" },
      { accessorKey: "impact", header: "Impact" },
      { accessorKey: "score", header: "Score" },
      { accessorKey: "level", header: "Level" },
      { accessorKey: "mitigation", header: "Mitigation Hint" },
    ],
    [],
  );

  //   const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
  //     useReactTable({ columns, data }, useSortBy);
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Heatmap data: 5x5 grid counts
  const heatmapData = useMemo(() => {
    const grid = Array.from({ length: 5 }, () => Array(5).fill(0));
    risks.forEach((r) => {
      const l = r.likelihood - 1;
      const i = r.impact - 1;
      if (l >= 0 && i >= 0) grid[l][i]++;
    });

    const labels = ["1", "2", "3", "4", "5"]; // Impact labels
    return {
      labels,
      datasets: labels.map((lik, likIdx) => ({
        label: `Likelihood ${likIdx + 1}`,
        data: grid[likIdx],
        backgroundColor: grid[likIdx].map((count, impIdx) => {
          const score = (likIdx + 1) * (impIdx + 1);
          if (score <= 5) return "#00FF00"; // Green
          if (score <= 12) return "#FFFF00"; // Yellow
          if (score <= 18) return "#FFA500"; // Orange
          return "#FF0000"; // Red
        }),
      })),
    };
  }, [risks]);

  const heatmapOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => `${context.raw} risks`,
          // TODO: Add asset list in tooltip (bonus: query risks matching l/i)
        },
      },
    },
    scales: {
      x: { title: { display: true, text: "Impact" } },
      y: {
        title: { display: true, text: "Likelihood" },
        reverse: true,
        ticks: {
          stepSize: 1,
        },
      }, // 5 at bottom? Adjust if needed
    },
  };

  // Stats
  const totalRisks = risks.length;
  const highCritical = risks.filter((r) =>
    ["High", "Critical"].includes(r.level),
  ).length;
  const avgScore =
    risks.reduce((sum, r) => sum + r.score, 0) / (totalRisks || 1);

  // CSV Export
  const exportCSV = () => {
    const csvData = risks.map((r) => ({
      ID: r.id,
      Asset: r.asset,
      Threat: r.threat,
      Likelihood: r.likelihood,
      Impact: r.impact,
      Score: r.score,
      Level: r.level,
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "risks.csv";
    link.click();
  };

  if (loading) return <p className="text-center">Loading...</p>;
  if (!totalRisks) return <p className="text-center">No risks yet</p>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Risk Dashboard</h2>

        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="mt-3 md:mt-0 px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
        >
          <option>All</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Critical</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-600">
          <p className="text-sm text-gray-500">Total Risks</p>
          <h3 className="text-3xl font-bold text-gray-800">{totalRisks}</h3>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-red-500">
          <p className="text-sm text-gray-500">High / Critical</p>
          <h3 className="text-3xl font-bold text-gray-800">{highCritical}</h3>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-600">
          <p className="text-sm text-gray-500">Average Score</p>
          <h3 className="text-3xl font-bold text-gray-800">
            {avgScore.toFixed(2)}
          </h3>
        </div>
      </div>

      {/* Risk Table */}
      <div className="bg-white rounded-xl shadow-md mb-6 border">
        <div className="px-5 py-3 border-b flex justify-between items-center">
          <h3 className="font-semibold text-gray-700">Risk Register</h3>
        </div>

        <div className="overflow-x-auto max-h-[260px] overflow-y-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 border cursor-pointer text-left font-semibold"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      <span className="ml-1">
                        {{
                          asc: "▲",
                          desc: "▼",
                        }[header.column.getIsSorted()] ?? ""}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50 transition">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2 border">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-xl shadow-md p-5 mb-6 border">
        <h3 className="font-semibold text-gray-700 mb-3">
          Risk Heatmap (Likelihood × Impact)
        </h3>
        <Bar data={heatmapData} options={heatmapOptions} />
      </div>

      {/* Export */}
      <button
        onClick={exportCSV}
        className="bg-grc-blue text-white px-4 py-2 rounded"
      >
        Export CSV
      </button>
    </div>
  );
};

export default Dashboard;
