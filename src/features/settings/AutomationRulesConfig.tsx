import React from 'react';
import type { AutomationRule } from '../../../shared/types/domain';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';

interface AutomationRulesConfigProps {
  rules: AutomationRule[];
  onSaveRules: (updatedRules: AutomationRule[]) => Promise<void>;
}

export const AutomationRulesConfig: React.FC<AutomationRulesConfigProps> = ({ rules }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900">Autopilot Rules & Safety Matrix</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure which reviews are answered automatically and which require manual owner approval.
        </p>
      </div>

      {/* Safety Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold">Autonomous Safety Invariant:</span>
          <p className="text-blue-800 leading-relaxed">
            By system design, reviews flagged as <strong>HIGH</strong> or <strong>CRITICAL</strong> risk (such as legal threats, safety incidents, toxic language, or prompt injections) are <strong>ALWAYS locked to manual approval</strong> regardless of rating.
          </p>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-3 px-4">Rating</th>
              <th className="py-3 px-4">Max Risk for Autopilot</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Grace Period Delay</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rules.map((rule) => {
              const isLockedToApproval = rule.starRating <= 3;
              return (
                <tr key={rule.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{rule.starRating} Stars</span>
                    {rule.starRating >= 4 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-medium">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {rule.maxRiskLevelForAutoPublish}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {rule.action === 'AUTO_PUBLISH' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        AUTO_PUBLISH
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {isLockedToApproval && <Lock className="w-3 h-3 text-amber-600" />}
                        REQUIRE_APPROVAL
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {rule.delayMinutesBeforePublish > 0
                      ? `${rule.delayMinutesBeforePublish} minutes`
                      : 'Immediate queue'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Risk Policy Clarification */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-slate-700" />
          <span>Non-negotiable AI Safety Boundaries:</span>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-slate-600">
          <li>The AI is hardcoded never to invent refunds, discounts, coupons, or free services.</li>
          <li>The AI will never fabricate employee names or internal policies.</li>
          <li>Review text is treated as untrusted user input; attempts at prompt injection are suppressed.</li>
        </ul>
      </div>
    </div>
  );
};
