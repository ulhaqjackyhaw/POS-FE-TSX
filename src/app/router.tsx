import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout';
import { PosLayout } from './layouts/PosLayout';
import { BackofficeLayout } from './layouts/BackofficeLayout';
import { RequireAuth } from './route-guards/RequireAuth';
import { RequireStore } from './route-guards/RequireStore';
import { RequirePermission } from './route-guards/RequirePermission';
import { RequireActiveShift } from './route-guards/RequireActiveShift';

import { LoginPage } from '../features/auth/pages/LoginPage';
import { SelectStorePage } from '../features/stores/pages/SelectStorePage';
import { PosPage } from '../features/pos/pages/PosPage';
import { ShiftsPage } from '../features/shifts/pages/ShiftsPage';
import { ProductsPage } from '../features/products/pages/ProductsPage';
import { BranchPricingPage } from '../features/pricing/pages/BranchPricingPage';
import { InventoryPage } from '../features/inventory/pages/InventoryPage';
import { TransactionsPage } from '../features/transactions/pages/TransactionsPage';
import { ApprovalsPage } from '../features/approvals/pages/ApprovalsPage';
import { ReportsPage } from '../features/reports/pages/ReportsPage';
import { StoreSettingsPage } from '../features/stores/pages/StoreSettingsPage';

export const router = createBrowserRouter([
  // Public Auth Route
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
    ],
  },

  // Store Selection (Authenticated)
  {
    path: '/select-store',
    element: (
      <RequireAuth>
        <SelectStorePage />
      </RequireAuth>
    ),
  },

  // POS Primary Route (Auth + Store + Shift Guard)
  {
    path: '/pos',
    element: (
      <RequireAuth>
        <RequireStore>
          <RequireActiveShift>
            <PosLayout />
          </RequireActiveShift>
        </RequireStore>
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <PosPage />,
      },
    ],
  },

  // Backoffice Module Routes (Auth + Store + Permissions)
  {
    path: '/',
    element: (
      <RequireAuth>
        <RequireStore>
          <BackofficeLayout />
        </RequireStore>
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/pos" replace />,
      },
      {
        path: 'shifts',
        element: <ShiftsPage />,
      },
      {
        path: 'products',
        element: (
          <RequirePermission permission="product.read">
            <ProductsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'stores/:id/pricing',
        element: (
          <RequirePermission permission="pricing.read">
            <BranchPricingPage />
          </RequirePermission>
        ),
      },
      {
        path: 'inventory',
        element: (
          <RequirePermission permission="inventory.read">
            <InventoryPage />
          </RequirePermission>
        ),
      },
      {
        path: 'transactions',
        element: (
          <RequirePermission permission="transaction.read">
            <TransactionsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'approvals',
        element: (
          <RequirePermission permission="approval.review">
            <ApprovalsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'reports',
        element: (
          <RequirePermission permission="report.sales.read">
            <ReportsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'settings/stores',
        element: (
          <RequirePermission permission="store.read">
            <StoreSettingsPage />
          </RequirePermission>
        ),
      },
    ],
  },

  // Fallback Wildcard
  {
    path: '*',
    element: <Navigate to="/pos" replace />,
  },
]);
