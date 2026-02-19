import { useState, useEffect } from "react";
import { api } from "../lib/api";
import Swal from "sweetalert2";

export default function NetworkDiagnostics() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const newResults = {
      timestamp: new Date().toLocaleString(),
      online: navigator.onLine,
      backendURL: api.defaults.baseURL,
      hostname: window.location.hostname,
      userAgent: navigator.userAgent.substring(0, 50) + "...",
    };

    // Test 1: Health Check
    try {
      const response = await api.get("/health", { timeout: 5000 });
      newResults.healthCheck = { status: "✅ Success", data: response.data };
    } catch (err) {
      newResults.healthCheck = { status: "❌ Failed", error: err.message };
    }

    // Test 2: Token Check
    const token = localStorage.getItem("fibuca_token");
    newResults.tokenStored = token ? "✅ Yes" : "❌ No";
    newResults.tokenLength = token ? token.length : 0;

    // Test 3: User Check
    try {
      const response = await api.get("/api/me", { timeout: 5000 });
      newResults.userCheck = { status: "✅ Authenticated", user: response.data.user.username };
    } catch (err) {
      newResults.userCheck = { status: "❌ Not authenticated", error: err.message };
    }

    // Test 4: Network Type
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      newResults.networkType = connection.effectiveType; // "4g", "3g", "2g", "slow-2g"
      newResults.downlink = connection.downlink + " Mbps";
      newResults.rtt = connection.rtt + " ms";
    } else {
      newResults.networkType = "Unknown";
    }

    setResults(newResults);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto bg-white shadow-lg rounded p-6">
        <h1 className="text-2xl font-bold mb-4">🔧 Network Diagnostics</h1>
        <p className="text-sm text-gray-600 mb-4">
          Use this to debug network issues on your phone
        </p>

        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Testing..." : "Run Tests"}
        </button>

        <div className="space-y-3 font-mono text-sm">
          {Object.entries(results).map(([key, value]) => (
            <div key={key} className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50">
              <div className="font-bold text-gray-700">{key}:</div>
              <div className="text-gray-600 ml-2">
                {typeof value === "object" ? (
                  <pre>{JSON.stringify(value, null, 2)}</pre>
                ) : (
                  value
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm font-bold text-yellow-800">💡 Troubleshooting Tips:</p>
          <ul className="text-sm text-yellow-700 mt-2 space-y-1">
            <li>• If "Health Check" fails: Backend server is down or unreachable</li>
            <li>• If "Network Type" shows "2g" or "3g": Your connection is slow</li>
            <li>• If "Token Stored" is No: You need to log in again</li>
            <li>• If "User Check" fails but token exists: Token may have expired</li>
            <li>• Check RTT (latency) - high RTT means slow network</li>
          </ul>
        </div>

        <button
          onClick={() => {
            Swal.fire({
              title: "Diagnostics Data",
              html: `<pre style="text-align: left; overflow: auto; max-height: 400px;">${JSON.stringify(results, null, 2)}</pre>`,
              icon: "info",
              confirmButtonText: "Close"
            });
          }}
          className="mt-4 w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Show Full JSON
        </button>
      </div>
    </div>
  );
}
