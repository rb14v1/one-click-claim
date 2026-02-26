// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import ReviewPage from './pages/ReviewPage';
import SuccessPage from './pages/SuccessPage';
import AnalyticsPage from './pages/UserAnalytics';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/uploadpage" element={<UploadPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/analytics" element={<AnalyticsPage />} />

        <Route path="*" element={<Navigate to="/uploadpage" replace />} />
      </Routes>
    </Router>
  );
}

export default App;