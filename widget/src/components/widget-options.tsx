import { useWidgetStore } from "../widget-store";
import { styles } from "../widget-styles";

interface SchemaOption {
  id: string;
  label: string;
  type: string; // "text" | "number" | "select" | "color" | "toggle"
  defaultValue?: unknown;
  choices?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  dependsOn?: { field: string; value: unknown };
}

export function WidgetOptions() {
  const product = useWidgetStore((s) => s.product);
  const optionValues = useWidgetStore((s) => s.optionValues);
  const setOptionValue = useWidgetStore((s) => s.setOptionValue);

  if (!product) return null;

  const schema = product.productSchema as {
    options?: SchemaOption[];
  } | null;

  const options = schema?.options ?? [];

  return (
    <div>
      <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", color: "#171717" }}>
        {product.name}
      </h3>
      {options.map((opt) => {
        // Check dependsOn visibility
        if (opt.dependsOn) {
          const depValue = optionValues[opt.dependsOn.field];
          if (depValue !== opt.dependsOn.value) return null;
        }

        const value = optionValues[opt.id];

        return (
          <div key={opt.id} style={styles.optionGroup}>
            <label style={styles.label}>{opt.label}</label>
            {opt.type === "text" && (
              <input
                style={styles.input}
                type="text"
                value={(value as string) ?? ""}
                onChange={(e) => setOptionValue(opt.id, e.target.value)}
                placeholder={`Enter ${opt.label.toLowerCase()}`}
              />
            )}
            {opt.type === "number" && (
              <input
                style={styles.input}
                type="number"
                value={(value as number) ?? opt.min ?? 0}
                min={opt.min}
                max={opt.max}
                step={opt.step ?? 1}
                onChange={(e) => setOptionValue(opt.id, parseFloat(e.target.value) || 0)}
              />
            )}
            {opt.type === "select" && (
              <select
                style={styles.select}
                value={(value as string) ?? ""}
                onChange={(e) => setOptionValue(opt.id, e.target.value)}
              >
                {opt.choices?.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
            {opt.type === "color" && (
              <input
                type="color"
                value={(value as string) ?? "#ffffff"}
                onChange={(e) => setOptionValue(opt.id, e.target.value)}
                style={{ width: "48px", height: "36px", border: "1px solid #d4d4d4", borderRadius: "8px", cursor: "pointer" }}
              />
            )}
            {opt.type === "toggle" && (
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!value}
                  onChange={(e) => setOptionValue(opt.id, e.target.checked)}
                  style={{ width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "14px", color: "#525252" }}>
                  {value ? "Yes" : "No"}
                </span>
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
