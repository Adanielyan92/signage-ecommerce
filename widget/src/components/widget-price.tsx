import { useWidgetStore } from "../widget-store";
import { styles } from "../widget-styles";

export function WidgetPrice() {
  const breakdown = useWidgetStore((s) => s.priceBreakdown);
  const pricingLoading = useWidgetStore((s) => s.pricingLoading);

  const total = breakdown?.total ?? 0;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(total);

  return (
    <div style={styles.priceBar}>
      <div>
        <div style={styles.priceLabel}>Total</div>
        <div style={{ ...styles.priceValue, opacity: pricingLoading ? 0.5 : 1 }}>
          {formatted}
        </div>
      </div>
      <button
        style={styles.button}
        onClick={() => {
          const state = useWidgetStore.getState();
          const event = new CustomEvent("gatsoft:add-to-cart", {
            detail: {
              product: state.product,
              optionValues: state.optionValues,
              priceBreakdown: state.priceBreakdown,
            },
          });
          document.dispatchEvent(event);
        }}
      >
        Add to Cart
      </button>
    </div>
  );
}
