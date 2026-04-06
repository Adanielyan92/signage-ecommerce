"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import type { OptionPricingRule } from "@/types/product";
import type { OptionDef } from "./option-editor";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OptionPricingEditorProps {
  rules: OptionPricingRule[];
  onChange: (rules: OptionPricingRule[]) => void;
  options: OptionDef[];
}

const EFFECT_TYPES: { value: OptionPricingRule["effectType"]; label: string }[] = [
  { value: "multiplier", label: "Multiply price by" },
  { value: "fixed_add", label: "Add fixed amount" },
  { value: "per_unit_add", label: "Add per letter" },
  { value: "per_sqft_add", label: "Add per sqft" },
];

function generateId(): string {
  return `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateLabel(
  optionLabel: string,
  value: string,
  effectType: OptionPricingRule["effectType"],
  effectValue: number
): string {
  if (effectType === "multiplier" && effectValue < 1) {
    return `${value} Discount`;
  }
  return `${value} Premium`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OptionPricingEditor({
  rules,
  onChange,
  options,
}: OptionPricingEditorProps) {
  const [addingCustom, setAddingCustom] = useState(false);
  const [customOptionId, setCustomOptionId] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [customEffectType, setCustomEffectType] = useState<OptionPricingRule["effectType"]>("multiplier");
  const [customEffectValue, setCustomEffectValue] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  // Group rules by optionId
  const rulesByOption = new Map<string, OptionPricingRule[]>();
  for (const rule of rules) {
    const existing = rulesByOption.get(rule.optionId) ?? [];
    existing.push(rule);
    rulesByOption.set(rule.optionId, existing);
  }

  // Get select-type options that have possible values
  const selectOptions = options.filter(
    (opt) => opt.type === "select" && opt.values.length > 0
  );

  // Collect all optionIds present in rules (some might be custom / not in current options)
  const allOptionIds = new Set<string>();
  for (const opt of selectOptions) {
    allOptionIds.add(opt.id);
  }
  for (const rule of rules) {
    allOptionIds.add(rule.optionId);
  }

  function updateRule(ruleId: string, patch: Partial<OptionPricingRule>) {
    onChange(
      rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r))
    );
  }

  function deleteRule(ruleId: string) {
    onChange(rules.filter((r) => r.id !== ruleId));
  }

  function addCustomRule() {
    if (!customOptionId || !customValue || !customEffectValue) return;

    const effectValue = parseFloat(customEffectValue);
    if (isNaN(effectValue)) return;

    const optionDef = selectOptions.find((o) => o.id === customOptionId);
    const optionLabel = optionDef?.label ?? customOptionId;
    const label = customLabel || generateLabel(optionLabel, customValue, customEffectType, effectValue);

    const newRule: OptionPricingRule = {
      id: generateId(),
      optionId: customOptionId,
      optionValue: customValue,
      effectType: customEffectType,
      effectValue,
      label,
    };

    onChange([...rules, newRule]);

    // Reset form
    setAddingCustom(false);
    setCustomOptionId("");
    setCustomValue("");
    setCustomEffectType("multiplier");
    setCustomEffectValue("");
    setCustomLabel("");
  }

  function getOptionLabel(optionId: string): string {
    const opt = options.find((o) => o.id === optionId);
    return opt?.label ?? optionId;
  }

  function getValuesForOption(optionId: string): string[] {
    const opt = selectOptions.find((o) => o.id === optionId);
    return opt?.values.map((v) => v.value) ?? [];
  }

  // Build display: for each select option, show its values and any rules
  const displayGroups: {
    optionId: string;
    label: string;
    values: string[];
    rules: OptionPricingRule[];
  }[] = [];

  for (const opt of selectOptions) {
    const optRules = rulesByOption.get(opt.id) ?? [];
    displayGroups.push({
      optionId: opt.id,
      label: opt.label,
      values: opt.values.map((v) => v.value),
      rules: optRules,
    });
  }

  // Add groups for rules that reference options not in the current options list
  for (const [optionId, optRules] of rulesByOption) {
    if (!selectOptions.find((o) => o.id === optionId)) {
      displayGroups.push({
        optionId,
        label: optionId,
        values: [...new Set(optRules.map((r) => r.optionValue))],
        rules: optRules,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Option Pricing Rules
        </h3>
      </div>

      {displayGroups.length === 0 && (
        <p className="text-sm italic text-neutral-400">
          No options with selectable values. Add select-type options above to
          configure pricing rules.
        </p>
      )}

      {displayGroups.map((group) => {
        const hasRules = group.rules.length > 0;
        return (
          <div
            key={group.optionId}
            className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
          >
            <h4 className="mb-3 text-sm font-medium text-neutral-700">
              {group.label}
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    <th className="pb-2 pr-4">Value</th>
                    <th className="pb-2 pr-4">Effect</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Label</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {group.values.map((val) => {
                    const matchingRules = group.rules.filter(
                      (r) => r.optionValue === val
                    );

                    if (matchingRules.length === 0) {
                      return (
                        <tr
                          key={val}
                          className="border-b border-neutral-100 last:border-0"
                        >
                          <td className="py-2 pr-4 text-neutral-900">
                            {val}
                          </td>
                          <td className="py-2 pr-4 text-neutral-400 italic">
                            (no effect)
                          </td>
                          <td className="py-2 pr-4 text-neutral-400">
                            &mdash;
                          </td>
                          <td className="py-2 pr-4 text-neutral-400">
                            &mdash;
                          </td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => {
                                const optionLabel = getOptionLabel(group.optionId);
                                const newRule: OptionPricingRule = {
                                  id: generateId(),
                                  optionId: group.optionId,
                                  optionValue: val,
                                  effectType: "multiplier",
                                  effectValue: 1.0,
                                  label: generateLabel(optionLabel, val, "multiplier", 1.0),
                                };
                                onChange([...rules, newRule]);
                              }}
                              className="rounded p-1 text-neutral-400 transition hover:bg-blue-50 hover:text-blue-500"
                              title="Add pricing rule"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return matchingRules.map((rule) => (
                      <tr
                        key={rule.id}
                        className="border-b border-neutral-100 last:border-0"
                      >
                        <td className="py-2 pr-4 text-neutral-900">{val}</td>
                        <td className="py-2 pr-4">
                          <select
                            value={rule.effectType}
                            onChange={(e) =>
                              updateRule(rule.id, {
                                effectType: e.target.value as OptionPricingRule["effectType"],
                              })
                            }
                            className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            {EFFECT_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-1">
                            {rule.effectType !== "multiplier" && (
                              <span className="text-neutral-400">$</span>
                            )}
                            <input
                              type="number"
                              step="any"
                              value={rule.effectValue}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v)) {
                                  updateRule(rule.id, { effectValue: v });
                                }
                              }}
                              className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-xs tabular-nums text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            {rule.effectType === "multiplier" && (
                              <span className="text-xs text-neutral-400">x</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            type="text"
                            value={rule.label}
                            onChange={(e) =>
                              updateRule(rule.id, { label: e.target.value })
                            }
                            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => deleteRule(rule.id)}
                            className="rounded p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-500"
                            title="Remove rule"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Add Custom Rule */}
      {!addingCustom ? (
        <button
          type="button"
          onClick={() => {
            setAddingCustom(true);
            if (selectOptions.length > 0) {
              setCustomOptionId(selectOptions[0].id);
              const firstValues = selectOptions[0].values;
              if (firstValues.length > 0) {
                setCustomValue(firstValues[0].value);
              }
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
        >
          <Plus className="h-4 w-4" />
          Add Custom Rule
        </button>
      ) : (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <h4 className="mb-3 text-sm font-medium text-neutral-700">
            New Custom Rule
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Option */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Option
              </label>
              <select
                value={customOptionId}
                onChange={(e) => {
                  setCustomOptionId(e.target.value);
                  const vals = getValuesForOption(e.target.value);
                  setCustomValue(vals[0] ?? "");
                }}
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {selectOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Value
              </label>
              {getValuesForOption(customOptionId).length > 0 ? (
                <select
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {getValuesForOption(customOptionId).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Option value"
                  className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              )}
            </div>

            {/* Effect Type */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Effect
              </label>
              <select
                value={customEffectType}
                onChange={(e) =>
                  setCustomEffectType(
                    e.target.value as OptionPricingRule["effectType"]
                  )
                }
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {EFFECT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Effect Value */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Amount
              </label>
              <input
                type="number"
                step="any"
                value={customEffectValue}
                onChange={(e) => setCustomEffectValue(e.target.value)}
                placeholder={customEffectType === "multiplier" ? "1.2" : "300"}
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm tabular-nums text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Label */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Label (optional)
              </label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Auto-generated"
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={addCustomRule}
              disabled={!customOptionId || !customValue || !customEffectValue}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Rule
            </button>
            <button
              type="button"
              onClick={() => setAddingCustom(false)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
