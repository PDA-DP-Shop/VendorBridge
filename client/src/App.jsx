import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import VendorsList from './pages/Vendors/VendorsList';
import VendorDetail from './pages/Vendors/VendorDetail';
import RFQsList from './pages/RFQs/RFQsList';
import CreateRFQ from './pages/RFQs/CreateRFQ';
import RFQDetail from './pages/RFQs/RFQDetail';
import QuotationsList from './pages/Quotations/QuotationsList';
import SubmitQuotation from './pages/Quotations/SubmitQuotation';
import QuotationDetail from './pages/Quotations/QuotationDetail';
import QuoteComparison from './pages/Quotations/QuoteComparison';
import ApprovalsList from './pages/Approvals/ApprovalsList';
import ApprovalDetail from './pages/Approvals/ApprovalDetail';
import POList from './pages/PurchaseOrders/POList';
import GeneratePO from './pages/PurchaseOrders/GeneratePO';
import PODetail from './pages/PurchaseOrders/PODetail';
import InvoicesList from './pages/Invoices/InvoicesList';
import InvoiceDetail from './pages/Invoices/InvoiceDetail';
import ActivityLogs from './pages/ActivityLogs';
import Reports from './pages/Reports';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Real-time Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '13px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            },
          }}
        />

        <Routes>
          {/* Public Authentication Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Main App Layout & Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Vendors directory */}
          <Route
            path="/vendors"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <VendorsList />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Vendor details */}
          <Route
            path="/vendors/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <VendorDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected RFQ Directory */}
          <Route
            path="/rfqs"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <RFQsList />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Create RFQ wizard */}
          <Route
            path="/rfqs/create"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CreateRFQ />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected RFQ details */}
          <Route
            path="/rfqs/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <RFQDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Quotation list */}
          <Route
            path="/quotations"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <QuotationsList />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Submit/Edit Quotation */}
          <Route
            path="/quotations/submit/:rfqId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SubmitQuotation />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Quotation details */}
          <Route
            path="/quotations/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <QuotationDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Quotation Comparison */}
          <Route
            path="/quotations/compare/:rfqId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <QuoteComparison />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Approvals list */}
          <Route
            path="/approvals"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ApprovalsList />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Approval details */}
          <Route
            path="/approvals/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ApprovalDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Purchase Orders list */}
          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <POList />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Generate PO */}
          <Route
            path="/purchase-orders/create"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <GeneratePO />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected PO details */}
          <Route
            path="/purchase-orders/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PODetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Invoices list */}
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <InvoicesList />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Invoice details */}
          <Route
            path="/invoices/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <InvoiceDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Activity Logs */}
          <Route
            path="/activity-logs"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ActivityLogs />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Reports & Analytics */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Reports />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Default Redirection: / -> /dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Fallback route redirection */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
