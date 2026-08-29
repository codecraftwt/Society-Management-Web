import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* === PUBLIC PAGES === */
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RegistrationPending from "./pages/RegistrationPending";
import ForgetPassword from "./pages/auth/ForgetPassword";
import ResetPassword from "./pages/auth/ResetPassword";

/* === PROTECTED ROUTE === */
import ProtectedRoute from "./components/protectedRoute";
import PublicRoute from "./components/PublicRoute";

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

/* === COMMITTEE MEMBER (LIMITED ACCESS) === */
import CommitteeLayout from "./pages/Committee/CommitteeLayout";
import CommitteeDashboard from "./pages/Committee/CommitteeDashboard";
import CommitteeResidents from "./pages/Committee/CommitteeResidents";
import CommitteeVisitorLogs from "./pages/Committee/CommitteeVisitorLogs.jsx";
import CommitteeNotices from "./pages/Committee/CommitteeNotices";
import CommitteeComplaints from "./pages/Committee/CommitteeComplaints";
import CommitteeBillingRules from "./pages/Committee/CommitteeBillingRules";
import CommitteeManageBills from "./pages/Committee/CommitteeManageBills";
import CommitteePaymentTracking from "./pages/Committee/CommitteePaymentTracking";
import CommitteeAmenities from "./pages/Committee/CommitteeAmenities";
import CommitteeReports from "./pages/Committee/CommitteeReports";
import CommitteeDocuments from "./pages/Committee/CommitteeDocuments";
import CommitteeGuards from "./pages/Committee/CommitteeGuards";
import CommitteeProperty from "./pages/Committee/CommitteeProperty";


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


/* === GUARD === */
import GuardLayout from "./pages/Guard/GuardLayout";
import GuardDashboard from "./pages/Guard/GuardDashboard";
import GuestEntry from "./pages/Guard/GuestEntry";
import CabEntry from "./pages/Guard/CabEntry";
import DeliveryEntry from "./pages/Guard/DeliveryEntry";
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


function App() {
  return (
    <>
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
      />

      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <Routes>
          {/* === PUBLIC ROUTES === */}
        <Route path="/" element={<Landing />} />
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
            <Route path="accountant" element={<Accountant />} />
            <Route path="manage-bills" element={<ManageBill />} />
            <Route path="parking" element={<SuperAdminParking />} />
            <Route path="reports" element={<SystemReports />} />
            <Route path="reports/visitors" element={<SuperAdminVisitorReport />} />
            <Route path="reports/complaints" element={<SuperAdminComplaintReport />} />
            <Route path="reports/financial" element={<SuperAdminFinancialReport />} />
            {/* Add any other Admin routes you wish to expose to Super Admin */}
          </Route>
        </Route>

        {/* === SOCIETY ADMIN ONLY (FULL ACCESS) === */}
        <Route element={<ProtectedRoute roles={["SOCIETY_ADMIN"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="resident" element={<Resident />} />
            <Route path="assign-flat" element={<AssignFlat />} />
            <Route path="settings" element={<AdminSetting />} />
            <Route path="property" element={<ManageProperty />} />
            <Route path="parking-slots" element={<AssignParkingSlot />} />
            <Route path="guard" element={<Guard />} />
            <Route path="notice" element={<Notice />} />
            <Route path="complaints" element={<Complaint />} />
            <Route path="accountant" element={<Accountant />} />
            <Route path="manage-bills" element={<ManageBill />} />
            <Route path="visitor-logs" element={<VisitorLogs />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/complaints" element={<ComplaintReport />} />
            <Route path="reports/visitors" element={<VisitorReport />} />
            <Route path="reports/financial" element={<FinancialReport />} />
            <Route path="amenities" element={<AdminAmenity />} />
            <Route path="society_documents" element={<AdminDocument />} />
            <Route path="flat-history" element={<FlatHistory />} />
            <Route path="tenant-management" element={<TenantManagement />} />
          </Route>
        </Route>

        {/* === COMMITTEE MEMBER ONLY (LIMITED ACCESS) === */}
        {/* <Route element={<ProtectedRoute roles={["COMMITTEE_MEMBER"]} />}>
          <Route path="/committee" element={<CommitteeLayout />}>
            <Route index element={<CommitteeDashboard />} />
            <Route path="residents" element={<CommitteeResidents />} />
            <Route path="visitor-logs" element={<CommitteeVisitorLogs />} />
            <Route path="notices" element={<CommitteeNotices />} />
            <Route path="complaints" element={<CommitteeComplaints />} />
            <Route path="billing-rules" element={<CommitteeBillingRules />} />
            <Route path="manage-bills" element={<CommitteeManageBills />} />
            <Route path="payment-tracking" element={<CommitteePaymentTracking />} />
            <Route path="reports" element={<CommitteeReports />} />
            <Route path="documents" element={<CommitteeDocuments />} />
            <Route path="guards" element={<CommitteeGuards />} />
            <Route path="property" element={<CommitteeProperty />} />
            <Route path="amenities" element={<CommitteeAmenities />} />
          </Route>
        </Route> */}

        <Route element={<ProtectedRoute roles={["COMMITTEE_MEMBER"]} />}>
          <Route path="/committee" element={<CommitteeLayout />}>
            <Route index element={<CommitteeDashboard />} />
            <Route path="residents" element={<CommitteeResidents />} />
            <Route path="visitor-logs" element={<CommitteeVisitorLogs />} />
            <Route path="notices" element={<CommitteeNotices />} />
            <Route path="complaints" element={<CommitteeComplaints />} />
            <Route path="billing-rules" element={<CommitteeBillingRules />} />
            <Route path="manage-bills" element={<CommitteeManageBills />} />
            <Route path="payment-tracking" element={<CommitteePaymentTracking />} />
            <Route path="reports" element={<CommitteeReports />} />
            <Route path="reports/complaints" element={<ComplaintReport />} />
            <Route path="reports/visitors" element={<VisitorReport />} />
            <Route path="reports/financial" element={<FinancialReport />} />
            <Route path="documents" element={<CommitteeDocuments />} />
            <Route path="guards" element={<CommitteeGuards />} />
            <Route path="property" element={<CommitteeProperty />} />
            <Route path="amenities" element={<CommitteeAmenities />} />
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
          </Route>
        </Route>

        {/* === GUARD === */}
        <Route element={<ProtectedRoute roles={["GUARD"]} />}>
          <Route path="/guard" element={<GuardLayout />}>
            <Route index element={<GuardDashboard />} />
            <Route path="guest-entry" element={<GuestEntry />} />
            <Route path="cab-entry" element={<CabEntry />} />
            <Route path="delivery-entry" element={<DeliveryEntry />} />
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
            <Route path="manage-bills" element={<ManageBillsAccountant />} />
            <Route path="payments" element={<PaymentsAccountant />} />
            <Route path="reports" element={<AccountantReports />} />
            <Route path="reports/financial" element={<FinancialReport />} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
    </>
  );
}

export default App;