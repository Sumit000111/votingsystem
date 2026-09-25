import { Navigate, Route, Routes } from 'react-router';
import PublicLayout from './components/PublicLayout.jsx';
import LoginPage from './pages/voter/LoginPage.jsx';
import VotePage from './pages/voter/VotePage.jsx';
import VerifyReceiptPage from './pages/voter/VerifyReceiptPage.jsx';
import PublicResultsPage from './pages/voter/PublicResultsPage.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Overview from './pages/admin/Overview.jsx';
import Results from './pages/admin/Results.jsx';
import Explorer from './pages/admin/Explorer.jsx';
import BlockPage from './pages/admin/BlockPage.jsx';
import TxPage from './pages/admin/TxPage.jsx';
import Audit from './pages/admin/Audit.jsx';
import Election from './pages/admin/Election.jsx';
import Voters from './pages/admin/Voters.jsx';
import './components/charts/charts.css';
import './components/layout.css';
import './components/chain/chain.css';
import './styles/public.css';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LoginPage />} />
        <Route path="vote" element={<VotePage />} />
        <Route path="verify" element={<VerifyReceiptPage />} />
        <Route path="verify/:txHash" element={<VerifyReceiptPage />} />
        <Route path="results" element={<PublicResultsPage />} />
        <Route path="admin/login" element={<AdminLogin />} />
      </Route>

      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Overview />} />
        <Route path="results" element={<Results />} />
        <Route path="explorer" element={<Explorer />} />
        <Route path="explorer/block/:id" element={<BlockPage />} />
        <Route path="explorer/tx/:hash" element={<TxPage />} />
        <Route path="audit" element={<Audit />} />
        <Route path="election" element={<Election />} />
        <Route path="voters" element={<Voters />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
