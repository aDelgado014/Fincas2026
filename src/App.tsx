import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { DashboardLayout } from '@/src/components/layout/DashboardLayout';
import { OwnerLayout } from '@/src/components/layout/OwnerLayout';
import { Login } from '@/src/pages/Login';
import { Dashboard } from '@/src/pages/Dashboard';
import { Communities } from '@/src/pages/Communities';
import { Import } from '@/src/pages/Import';
import { Debt } from '@/src/pages/Debt';
import { Communications } from '@/src/pages/Communications';
import { Audit } from '@/src/pages/Audit';
import { Settings } from '@/src/pages/Settings';
import { Reconciliation } from '@/src/pages/Reconciliation';
import { Incidents } from '@/src/pages/Incidents';
import { Minutes } from '@/src/pages/Minutes';
import { CommunityDetail } from '@/src/pages/CommunityDetail';
import { AdminProfile } from '@/src/pages/AdminProfile';
import { Morosidad } from '@/src/pages/Morosidad';
import { Presupuesto } from '@/src/pages/Presupuesto';
import { Calendario } from '@/src/pages/Calendario';
import { AdminFincasPanel } from '@/src/pages/AdminFincasPanel';
import { CommunityOnboarding } from '@/src/pages/CommunityOnboarding';
import { PremiumLegal } from '@/src/pages/premium/PremiumLegal';
import { PremiumConvocatorias } from '@/src/pages/premium/PremiumConvocatorias';
import { PremiumReservas } from '@/src/pages/premium/PremiumReservas';
import { Chatbot } from '@/src/pages/Chatbot';
import { Expenses } from '@/src/pages/Expenses';
import { BankConciliation } from '@/src/pages/BankConciliation';

// Owner Pages
import { OwnerDashboard } from '@/src/pages/owner/OwnerDashboard';
import { MyCharges } from '@/src/pages/owner/MyCharges';
import { ReportIncident } from '@/src/pages/owner/ReportIncident';
import { Documents } from '@/src/pages/owner/Documents';
import { Profile } from '@/src/pages/owner/Profile';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Admin/Operator Routes */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="comunidades" element={<Communities />} />
          <Route path="comunidades/nueva" element={<CommunityOnboarding />} />
          <Route path="comunidades/:id" element={<CommunityDetail />} />
          <Route path="importar" element={<Import />} />
          <Route path="deuda" element={<Debt />} />
          <Route path="comunicaciones" element={<Communications />} />
          <Route path="auditoria" element={<Audit />} />
          <Route path="configuracion" element={<Settings />} />
          <Route path="conciliacion" element={<Reconciliation />} />
          <Route path="incidencias" element={<Incidents />} />
          <Route path="actas" element={<Minutes />} />
          <Route path="perfil" element={<AdminProfile />} />
          <Route path="morosidad" element={<Morosidad />} />
          <Route path="presupuesto" element={<Presupuesto />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="admin-fincas" element={<AdminFincasPanel />} />
          <Route path="premium/legal" element={<PremiumLegal />} />
          <Route path="premium/convocatorias" element={<PremiumConvocatorias />} />
          <Route path="premium/reservas" element={<PremiumReservas />} />
          <Route path="chatbot" element={<Chatbot />} />
          <Route path="gastos" element={<Expenses />} />
          <Route path="bancos" element={<BankConciliation />} />
        </Route>

        {/* Owner Portal Routes */}
        <Route path="/owner" element={<OwnerLayout />}>
          <Route index element={<OwnerDashboard />} />
          <Route path="recibos" element={<MyCharges />} />
          <Route path="incidencias" element={<ReportIncident />} />
          <Route path="documentos" element={<Documents />} />
          <Route path="perfil" element={<Profile />} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}
