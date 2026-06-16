import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Appointment from "@/pages/Appointment";
import Assessment from "@/pages/Assessment";
import Injection from "@/pages/Injection";
import Report from "@/pages/Report";
import Statistics from "@/pages/Statistics";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/appointment" element={<Appointment />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/injection" element={<Injection />} />
          <Route path="/report" element={<Report />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
