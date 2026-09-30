import React from 'react';
import type { SaaSCustomer, Subscription } from '../../shared/types/domain';

interface TenantSummary {
  customer: SaaSCustomer;
  subscription: Subscription;
  locationCount: number;
  reviewsProcessed: number;
  autoPublishRate: number;
}

const mockTenants: TenantSummary[] = [
  {
    customer: {
      id: 'saas_cust_demo_01',
      name: 'Downtown Dental SF',
      billingEmail: 'billing@downtowndental-sf.com',
      status: 'ACTIVE',
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
    },
    subscription: {
      id: 'sub_01',
      saasCustomerId: 'saas_cust_demo_01',
      plan: 'STARTER',
      status: 'ACTIVE',
      currentPeriodStart: '2026-09-01T00:00:00Z',
      currentPeriodEnd: '2026-10-01T00:00:00Z',
      cancelAtPeriodEnd: false,
      locationLimit: 1,
      monthlyReplyLimit: 50,
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
    },
    locationCount: 1,
    reviewsProcessed: 42,
    autoPublishRate: 85.7,
  },
  {
    customer: {
      id: 'saas_cust_demo_02',
      name: 'Golden Gate Auto Repair',
      billingEmail: 'service@goldengateauto.com',
      status: 'ACTIVE',
      createdAt: '2026-02-10T00:00:00Z',
      updatedAt: '2026-02-10T00:00:00Z',
    },
    subscription: {
      id: 'sub_02',
      saasCustomerId: 'saas_cust_demo_02',
      plan: 'GROWTH',
      status: 'ACTIVE',
      currentPeriodStart: '2026-09-10T00:00:00Z',
      currentPeriodEnd: '2026-10-10T00:00:00Z',
      cancelAtPeriodEnd: false,
      locationLimit: 3,
      monthlyReplyLimit: 150,
      createdAt: '2026-02-10T00:00:00Z',
      updatedAt: '2026-02-10T00:00:00Z',
    },
    locationCount: 2,
    reviewsProcessed: 118,
    autoPublishRate: 74.2,
  },
];

export const TenantOverview: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">Tenant Directory</h2>
          <p className="text-xs text-slate-400">Total 148 registered SaaSCustomers across all active regions</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search tenant name or billing email..."
            className="text-xs px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 w-64"
          />
        </div>
      </div>

      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-800/80 text-slate-300 font-medium border-b border-slate-800">
              <th className="py-2.5 px-4">SaaSCustomer Name</th>
              <th className="py-2.5 px-4">Tenant ID</th>
              <th className="py-2.5 px-4">Plan / Status</th>
              <th className="py-2.5 px-4">Locations</th>
              <th className="py-2.5 px-4">30d Reviews</th>
              <th className="py-2.5 px-4">Auto-Publish %</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {mockTenants.map((t) => (
              <tr key={t.customer.id} className="hover:bg-slate-800/30 transition">
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-100">{t.customer.name}</div>
                  <div className="text-[11px] text-slate-400">{t.customer.billingEmail}</div>
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{t.customer.id}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                    {t.subscription.plan}
                  </span>
                </td>
                <td className="py-3 px-4">{t.locationCount}</td>
                <td className="py-3 px-4">{t.reviewsProcessed}</td>
                <td className="py-3 px-4 font-mono text-emerald-400">{t.autoPublishRate}%</td>
                <td className="py-3 px-4 text-right">
                  <button className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition">
                    Inspect Tenant
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
