import { DemoResponse } from "@shared/api";
import { useEffect, useState } from "react";

export default function Index() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch("/api/admin/data", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch summary");
        const data = await response.json();
        setSummary(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-800 mb-4">AASTU Clearance Management System</h1>
        {loading ? (
          <p className="text-slate-600">Loading summary...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : summary ? (
          <div className="mt-4">
            <h2 className="text-lg font-bold mb-2">Clearance Requests Overview</h2>
            <table className="mx-auto border border-slate-300 rounded">
              <thead>
                <tr>
                  <th className="px-2 py-1">Request ID</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Student ID</th>
                  <th className="px-2 py-1">Name</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Approvals</th>
                  <th className="px-2 py-1">Approved</th>
                  <th className="px-2 py-1">Rejected</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row: any) => (
                  <tr key={row.request_id}>
                    <td className="px-2 py-1">{row.request_id}</td>
                    <td className="px-2 py-1">{row.type_name}</td>
                    <td className="px-2 py-1">{row.id_no}</td>
                    <td className="px-2 py-1">{row.first_name} {row.last_name}</td>
                    <td className="px-2 py-1">{row.overall_status}</td>
                    <td className="px-2 py-1">{row.total_approvals}</td>
                    <td className="px-2 py-1">{row.approved_count}</td>
                    <td className="px-2 py-1">{row.rejected_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-600">No summary data available.</p>
        )}
        <p className="mt-4 text-slate-600 max-w-md">
          Watch the chat on the left for updates that might need your attention
          to finish generating
        </p>
        <p className="mt-4 hidden max-w-md"></p>
      </div>
    </div>
  );
}
