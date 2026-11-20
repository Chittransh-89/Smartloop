import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { DataProvider } from "@/state/DataContext";
import Dashboard from "@/pages/Dashboard";
import Forecast from "@/pages/Forecast";
import Alerts from "@/pages/Alerts";
import Insights from "@/pages/Insights";
import About from "@/pages/About";

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    return undefined;
  }, [location.pathname, location.hash]);

  return null;
}

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <ScrollManager />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}
