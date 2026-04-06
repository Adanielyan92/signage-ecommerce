import { Suspense } from "react";
import { useWidgetStore } from "./widget-store";
import { WidgetOptions } from "./components/widget-options";
import { WidgetScene } from "./components/widget-scene";
import { WidgetPrice } from "./components/widget-price";
import { styles } from "./widget-styles";

export function WidgetApp() {
  const loading = useWidgetStore((s) => s.loading);
  const error = useWidgetStore((s) => s.error);
  const product = useWidgetStore((s) => s.product);

  if (loading) {
    return (
      <div style={{ ...styles.container, alignItems: "center", justifyContent: "center" }}>
        <div style={styles.loading}>Loading configurator...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ ...styles.container, alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...styles.loading, color: "#ef4444" }}>{error ?? "Product not found"}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.viewport}>
        <Suspense fallback={<div style={styles.loading}>Loading 3D...</div>}>
          <WidgetScene />
        </Suspense>
      </div>
      <div style={{ ...styles.panel, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <WidgetOptions />
        </div>
        <WidgetPrice />
      </div>
    </div>
  );
}
