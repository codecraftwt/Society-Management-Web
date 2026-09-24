import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SeoHead from "./seo/SeoHead";

/* === PUBLIC PAGES === */
import Home from "./home/Home";
import { LanguageProvider } from "./context/LanguageContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RegistrationPending from "./pages/RegistrationPending";
import ForgetPassword from "./pages/auth/ForgetPassword";
import ResetPassword from "./pages/auth/ResetPassword";

/* === LEGAL PAGES === */
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import SecurityPolicy from "./pages/legal/SecurityPolicy";
import CookiePolicy from "./pages/legal/CookiePolicy";

/* === PROTECTED ROUTE === */
import ProtectedRoute from "./components/protectedRoute";
import PublicRoute from "./components/PublicRoute";
import PermissionRoute from "./components/common/PermissionRoute";

/* === SUPER ADMIN === */
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import Socities from "./pages/SuperAdmin/Socities";
import CreateSocietyAdmin from "./pages/SuperAdmin/createSocietyAdmin";
import Flats from "./pages/SuperAdmin/Flats";
import Blocks from "./pages/SuperAdmin/Blocks";
import SuperAdminLayout from "./pages/SuperAdmin/SuperAdminLayout";
import SuperAdminReports from "./pages/SuperAdmin/Reports";
const SuperAdminParking = lazy(() => import("./pages/SuperAdmin/SuperAdminParking"));
const SystemReports = SuperAdminReports; 
import SuperAdminVisitorReport from "./pages/SuperAdmin/reports/VisitorReport";
import SuperAdminComplaintReport from "./pages/SuperAdmin/reports/ComplaintReport";
import SuperAdminFinancialReport from "./pages/SuperAdmin/reports/FinancialReport";

/* === SOCIETY ADMIN (FULL ACCESS) === */
import AdminLayout from "./pages/Admin/AdminLayout";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import Resident from "./pages/Admin/Resident";
import AssignFlat from "./pages/Admin/AssignFlat";
import AssignParkingSlot from "./pages/Admin/AssignParkingSlot";
import Guard from "./pages/Admin/Guard";
import Notice from "./pages/Admin/Notice";
import Complaint from "./pages/Admin/Complaint";
import Accountant from "./pages/Admin/Accountant";
import ManageBill from "./pages/Admin/ManageBill";
import VisitorLogs from "./pages/Admin/VisitorLog";
import Reports from "./pages/Admin/Reports";
import ComplaintReport from "./pages/Admin/reports/ComplaintReport";
import VisitorReport from "./pages/Admin/reports/VisitorReport";
import FinancialReport from "./pages/Admin/reports/FinancialReport";
import AdminAmenity from "./pages/Admin/AdminAmenity";
import AdminDocument from "./pages/Admin/AdminDocument";
import ManageProperty from "./pages/Admin/ManageProperty";
import AdminSetting from "./pages/Admin/AdminSetting";
import FlatHistory from "./pages/Admin/FlatHistory";
import MaintenancePage from "./pages/Maintenance/MaintenancePage";
import RolePermissions from "./pages/Admin/RolePermissions";
import AdminEmergency from "./pages/Admin/AdminEmergency";

/* === RESIDENT === */
import ResidentLayout from "./pages/Resident/ResidentLayout";
import ResidentProfile from "./pages/Resident/ResidentProfile";
import ResidentBills from "./pages/Resident/ResidentBills";
import ResidentVisitors from "./pages/Resident/ResidentVisitors";
import ResidentReports from "./pages/Resident/ResidentReports";
import ResidentNotices from "./pages/Resident/ResidentNotices";
import ResidentComplaints from "./pages/Resident/ResidentComplaints";
import ResidentPreApproval from "./pages/Resident/ResidentPreApproval";
import ResidentParking from "./pages/Resident/ResidentParking";
import ResidentAmenity from "./pages/Resident/ResidentAmenity";
import PaymentMethods from "./pages/Resident/PaymentMethods";
import PaymentReceipt from "./pages/Resident/PaymentReceipt";
import MyProfile from "./pages/Resident/MyProfile";
import MyHousehold from "./pages/Resident/MyHouseHold";
import MyVehicles from "./pages/Resident/MyVehicles";
import MyCollection from "./pages/Resident/MyCollection";
import MySetting from "./pages/Resident/MySetting";
import MyEmergency from "./pages/Resident/MyEmergency";
import ResidentComplaintReport from "./pages/Resident/reports/ResidentComplaintReport";
import ResidentVisitorReport from "./pages/Resident/reports/ResidentVisitorReport";
import ResidentFinanceReport from "./pages/Resident/reports/ResidentFinanceReport";
import ResidentDocument from "./pages/Resident/ResidentDocument";
import MyDocument from "./pages/Resident/MyDocuments";
import MyProperties from "./pages/Resident/MyProperties";
import ResidentDirectory from "./pages/Resident/ResidentDirectory";

/* === GUARD === */
import GuardLayout from "./pages/Guard/GuardLayout";
import GuardDashboard from "./pages/Guard/GuardDashboard";
import GuestEntry from "./pages/Guard/GuestEntry";
import CabEntry from "./pages/Guard/CabEntry";
import DeliveryEntry from "./pages/Guard/DeliveryEntry";
import ServiceEntry from "./pages/Guard/ServiceEntry";
import DailyHelp from "./pages/Guard/DailyHelp";
import ShiftLogbook from "./pages/Guard/ShiftLogbook";
import VisitorLogScreen from "./pages/Guard/VisitorLogScreen";
import GuardSetting from "./pages/Guard/GuardSetting";
import EmergencyHistory from "./pages/Guard/EmergencyHistory";
import GuardGatePass from "./pages/Guard/GuardGetPass";
import GuardCollection from "./pages/Guard/GuardCollection";
import GuardParking from "./pages/Guard/GuardParking";
import GuardHelpContacts from "./pages/Guard/GuardHelpContacts";

/* === ACCOUNTANT === */
import AccountantLayout from "./pages/Accountant/AccountantLayout";
import ManageBillsAccountant from "./pages/Accountant/ManageBilllsAccountant";
import PaymentsAccountant from "./pages/Accountant/PaymentsAccountant";
import AccountDashboard from "./pages/Accountant/AccountantDashboard";
import AccountantReports from "./pages/Accountant/AccountantReports";
import Floors from "./pages/SuperAdmin/Floors.jsx";
import TenantManagement from "./pages/Admin/TenantManagement.jsx";
import Accounting from "./pages/Admin/Accounting";
import Payments from "./pages/Admin/Payments";


function App() {
  return (
    <>
      <SeoHead />
      {/* === GLOBAL TOAST === */}
      <ToastContainer
        position="top-center"
        autoClose={1000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        toastClassName="custom-toast"
        bodyClassName="custom-toast-body"
        progressClassName="custom-toast-progress"
        style={{ zIndex: 11000 }}
      />

      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <Routes>
          {/* === PUBLIC ROUTES === */}
        <Route path="/" element={<LanguageProvider role="home"><Home /></LanguageProvider>} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route path="/register" element={<Register />} />
        <Route path="/registration-pending" element={<RegistrationPending />} />
        <Route path="/forgot-password" element={<ForgetPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* === LEGAL PAGES === */}
        <Route path="/privacy-policy" element={<LanguageProvider role="home"><PrivacyPolicy /></LanguageProvider>} />
        <Route path="/terms-of-service" element={<LanguageProvider role="home"><TermsOfService /></LanguageProvider>} />
        <Route path="/security-policy" element={<LanguageProvider role="home"><SecurityPolicy /></LanguageProvider>} />
        <Route path="/cookie-policy" element={<LanguageProvider role="home"><CookiePolicy /></LanguageProvider>} />

        {/* === SUPER ADMIN === */}
        <Route element={<ProtectedRoute roles={["SUPER_ADMIN"]} />}>
          <Route path="/superadmin" element={<SuperAdminLayout />}>
            <Route index element={<SuperAdminDashboard />} />
            <Route path="societies" element={<Socities />} />
            <Route path="society/:societyId/blocks" element={<Blocks />} />
            <Route path="floor/:floorId/flats" element={<Flats />} />
            <Route path="create-admin" element={<CreateSocietyAdmin />} />
            <Route path="block/:blockId/floors" element={<Floors />} />

            {/* --- INJECTED GLOBAL ADMIN ROUTES --- */}
            <Route path="resident" element={<Resident />} />
            <Route path="complaints" element={<Complaint />} />
            <Route path="notice" element={<Notice />} />
            <Route path="guard" element={<Guard />} />
            <Route path="visitor-logs" element={<VisitorLogs />} />
            <Route path="reports" element={<Reports />} />
            <Route path="amenities" element={<AdminAmenity />} />
            <Route path="society_documents" element={<AdminDocument />} />
            <Route path="assign-flat" element={<AssignFlat />} />
            <Route path="assign-parking-slot" element={<AssignParkingSlot />} />
            <Route path="settings" element={<AdminSetting />} />
            <Route path="flat-history" element={<FlatHistory />} />
            <Route path="role-permissions" element={<RolePermissions />} />
            <Route path="reports/complaints" element={<ComplaintReport />} />
            <Route path="reports/visitors" element={<VisitorReport />} />
            <Route path="reports/financial" element={<FinancialReport />} />
            <Route path="superadmin-reports" element={<SystemReports />} />
            <Route path="parking" element={<SuperAdminParking />} />
            <Route path="accounting" element={<Accounting />} />
            <Route path="accountant" element={<Accountant />} />
            <Route path="payments" element={<Payments />} />
            <Route path="manage-bills" element={<ManageBill />} />
            <Route path="tenant-management" element={<TenantManagement />} />
            <Route
              path="superadmin-reports/visitor-report"
              element={<SuperAdminVisitorReport />}
            />
            <Route
              path="superadmin-reports/complaint-report"
              element={<SuperAdminComplaintReport />}
            />
            <Route
              path="superadmin-reports/finance-report"
              element={<SuperAdminFinancialReport />}
            />
          </Route>
        </Route>

        {/* === SOCIETY ADMIN & COMMITTEE MEMBER === */}
        <Route element={<ProtectedRoute roles={["SOCIETY_ADMIN", "COMMITTEE_MEMBER"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route element={<PermissionRoute module="role_permissions" />}>
              <Route path="role-permissions" element={<RolePermissions />} />
            </Route>
            <Route element={<PermissionRoute module="accounting" />}>
              <Route path="accounting" element={<Accounting />} />
            </Route>
            <Route element={<PermissionRoute module="expenses" />}>
              <Route path="expenses" element={<Accounting initialTab="expenses" />} />
            </Route>
            <Route element={<PermissionRoute module="general_ledger" />}>
              <Route path="general-ledger" element={<Accounting initialTab="ledger" />} />
            </Route>
            <Route element={<PermissionRoute module="financial_audit_log" />}>
              <Route path="financial-audit-log" element={<Accounting initialTab="audit" />} />
            </Route>
            <Route element={<PermissionRoute module="emergency" />}>
              <Route path="emergency" element={<AdminEmergency />} />
            </Route>
            <Route element={<PermissionRoute module="maintenance" />}>
              <Route path="maintenance" element={<MaintenancePage />} />
            </Route>
            <Route element={<PermissionRoute module="property" />}>
              <Route path="property" element={<ManageProperty />} />
            </Route>
            <Route element={<PermissionRoute module="assign_flat" />}>
              <Route path="assign-flat" element={<AssignFlat />} />
            </Route>
            <Route element={<PermissionRoute module="parking_slots" />}>
              <Route path="parking-slots" element={<AssignParkingSlot />} />
            </Route>
            <Route element={<PermissionRoute module="resident" />}>
              <Route path="resident" element={<Resident />} />
            </Route>
            <Route element={<PermissionRoute module="guard" />}>
              <Route path="guard" element={<Guard />} />
            </Route>
            <Route element={<PermissionRoute module="notice" />}>
              <Route path="notice" element={<Notice />} />
            </Route>
            <Route element={<PermissionRoute module="complaints" />}>
              <Route path="complaints" element={<Complaint />} />
            </Route>
            <Route element={<PermissionRoute module="accountant" />}>
              <Route path="accountant" element={<Accountant />} />
            </Route>
            <Route element={<PermissionRoute module="manage_bills" />}>
              <Route path="manage-bills" element={<ManageBill />} />
            </Route>
            <Route element={<PermissionRoute module="payments" />}>
              <Route path="payments" element={<Payments />} />
            </Route>
            <Route element={<PermissionRoute module="visitor_logs" />}>
              <Route path="visitor-logs" element={<VisitorLogs />} />
            </Route>
            <Route element={<PermissionRoute module="settings" />}>
              <Route path="settings" element={<AdminSetting />} />
            </Route>
            <Route element={<PermissionRoute module="reports" />}>
              <Route path="reports" element={<Reports />} />
              <Route path="reports/complaints" element={<ComplaintReport />} />
              <Route path="reports/visitors" element={<VisitorReport />} />
              <Route path="reports/financial" element={<FinancialReport />} />
            </Route>
            <Route element={<PermissionRoute module="amenities" />}>
              <Route path="amenities" element={<AdminAmenity />} />
            </Route>
            <Route element={<PermissionRoute module="society_documents" />}>
              <Route path="society_documents" element={<AdminDocument />} />
            </Route>
            <Route element={<PermissionRoute module="flat_history" />}>
              <Route path="flat-history" element={<FlatHistory />} />
            </Route>
            <Route element={<PermissionRoute module="tenant_management" />}>
              <Route path="tenant-management" element={<TenantManagement />} />
            </Route>
          </Route>
        </Route>

        {/* === RESIDENT (Full Access) === */}
        <Route element={<ProtectedRoute roles={["RESIDENT"]} />}>
          <Route path="/resident" element={<ResidentLayout />}>
            <Route index element={<ResidentProfile />} />
            <Route path="profile" element={<ResidentProfile />} />
            <Route path="bills" element={<ResidentBills />} />
            <Route path="visitors" element={<ResidentVisitors />} />
            <Route path="reports" element={<ResidentReports />} />
            <Route path="notices" element={<ResidentNotices />} />
            <Route path="complaints" element={<ResidentComplaints />} />
            <Route path="myprofile" element={<MyProfile />} />
            <Route path="my-household" element={<MyHousehold />} />
            <Route path="my-documents" element={<MyDocument />} />
            <Route path="preapproval" element={<ResidentPreApproval />} />
            <Route path="my-vehicles" element={<MyVehicles />} />
            <Route path="my-collection" element={<MyCollection />} />
            <Route path="settings" element={<MySetting />} />
            <Route path="emergency" element={<MyEmergency />} />
            <Route path="parking" element={<ResidentParking />} />
            <Route path="amenities" element={<ResidentAmenity />} />
            <Route path="directory" element={<ResidentDirectory />} />
            <Route path="payment" element={<PaymentMethods />} />
            <Route path="payment-receipt" element={<PaymentReceipt />} />
            <Route path="my-properties" element={<MyProperties />} />
            <Route
              path="reports/complaint-report"
              element={<ResidentComplaintReport />}
            />
            <Route
              path="reports/visitor-report"
              element={<ResidentVisitorReport />}
            />
            <Route
              path="reports/finance-report"
              element={<ResidentFinanceReport />}
            />
            <Route path="society_documents" element={<ResidentDocument />} />
          </Route>
        </Route>

        {/* === FAMILY MEMBER (Limited Access) === */}
        <Route element={<ProtectedRoute roles={["FAMILY_MEMBER"]} />}>
          <Route path="/family" element={<ResidentLayout />}>
            <Route index element={<ResidentProfile />} />
            <Route path="profile" element={<ResidentProfile />} />
            <Route path="myprofile" element={<MyProfile />} />
            <Route path="notices" element={<ResidentNotices />} />
            <Route path="bills" element={<ResidentBills />} />
            <Route path="complaints" element={<ResidentComplaints />} />
            <Route path="visitors" element={<ResidentVisitors />} />
            <Route path="preapproval" element={<ResidentPreApproval />} />
            <Route path="amenities" element={<ResidentAmenity />} />
            <Route path="directory" element={<ResidentDirectory />} />
          </Route>
        </Route>

        {/* === GUARD === */}
        <Route element={<ProtectedRoute roles={["GUARD"]} />}>
          <Route path="/guard" element={<GuardLayout />}>
            <Route index element={<GuardDashboard />} />
            <Route path="guest-entry" element={<GuestEntry />} />
            <Route path="cab-entry" element={<CabEntry />} />
            <Route path="delivery-entry" element={<DeliveryEntry />} />
            <Route path="service-entry" element={<ServiceEntry />} />
            <Route path="daily-help" element={<DailyHelp />} />
            <Route path="shift-logbook" element={<ShiftLogbook />} />
            <Route path="visitorlogs" element={<VisitorLogScreen />} />
            <Route path="settings" element={<GuardSetting />} />
            <Route path="emergency-history" element={<EmergencyHistory />} />
            <Route path="gatepass" element={<GuardGatePass />} />
            <Route path="collection" element={<GuardCollection />} />
            <Route path="parking" element={<GuardParking />} />
            <Route path="help-contacts" element={<GuardHelpContacts />} />
          </Route>
        </Route>

        {/* === ACCOUNTANT === */}
        <Route element={<ProtectedRoute roles={["ACCOUNTANT"]} />}>
          <Route path="/accountant" element={<AccountantLayout />}>
            <Route index element={<AccountDashboard />} />
            <Route element={<PermissionRoute module="manage_bills" />}>
              <Route path="manage-bills" element={<ManageBillsAccountant />} />
            </Route>
            <Route element={<PermissionRoute module="payments" />}>
              <Route path="payments" element={<Payments />} />
            </Route>
            <Route element={<PermissionRoute module="accounting" />}>
              <Route path="accounting" element={<Accounting />} />
            </Route>
            <Route element={<PermissionRoute module="expenses" />}>
              <Route path="expenses" element={<Accounting initialTab="expenses" />} />
            </Route>
            <Route element={<PermissionRoute module="general_ledger" />}>
              <Route path="general-ledger" element={<Accounting initialTab="ledger" />} />
            </Route>
            <Route element={<PermissionRoute module="financial_audit_log" />}>
              <Route path="financial-audit-log" element={<Accounting initialTab="audit" />} />
            </Route>
            <Route element={<PermissionRoute module="maintenance" />}>
              <Route path="maintenance" element={<MaintenancePage />} />
            </Route>
            <Route element={<PermissionRoute module="reports" />}>
              <Route path="reports" element={<AccountantReports />} />
              <Route path="reports/financial" element={<FinancialReport />} />
            </Route>
            <Route element={<PermissionRoute module="society_documents" />}>
              <Route path="society_documents" element={<AdminDocument />} />
            </Route>
            <Route element={<PermissionRoute module="notice" />}>
              <Route path="notice" element={<Notice />} />
            </Route>
            <Route element={<PermissionRoute module="amenities" />}>
              <Route path="amenities" element={<AdminAmenity />} />
            </Route>
            <Route element={<PermissionRoute module="parking_slots" />}>
              <Route path="parking-slots" element={<AssignParkingSlot />} />
            </Route>
            <Route element={<PermissionRoute module="property" />}>
              <Route path="property" element={<ManageProperty />} />
            </Route>
            <Route element={<PermissionRoute module="resident" />}>
              <Route path="resident" element={<Resident />} />
            </Route>
            <Route element={<PermissionRoute module="flat_history" />}>
              <Route path="flat-history" element={<FlatHistory />} />
            </Route>
            <Route element={<PermissionRoute module="tenant_management" />}>
              <Route path="tenant-management" element={<TenantManagement />} />
            </Route>
            <Route element={<PermissionRoute module="guard" />}>
              <Route path="guard" element={<Guard />} />
            </Route>
            <Route element={<PermissionRoute module="visitor_logs" />}>
              <Route path="visitor-logs" element={<VisitorLogs />} />
            </Route>
            <Route element={<PermissionRoute module="complaints" />}>
              <Route path="complaints" element={<Complaint />} />
            </Route>
            <Route element={<PermissionRoute module="emergency" />}>
              <Route path="emergency" element={<AdminEmergency />} />
            </Route>
            <Route element={<PermissionRoute module="settings" />}>
              <Route path="settings" element={<AdminSetting />} />
            </Route>
          </Route>
        </Route>

        {/* === FALLBACK NOT FOUND ROUTE === */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}

export default App;