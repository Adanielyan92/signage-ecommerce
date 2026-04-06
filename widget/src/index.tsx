import { createRoot, type Root } from "react-dom/client";
import { WidgetApp } from "./widget-app";
import { useWidgetStore } from "./widget-store";

interface MountOptions {
  container: HTMLElement;
  apiUrl: string;
  product: string;
  tenant?: string;
  apiKey?: string;
}

const roots = new Map<HTMLElement, Root>();

function mount(options: MountOptions): { unmount: () => void } {
  const { container, apiUrl, product, tenant, apiKey } = options;

  if (roots.has(container)) {
    roots.get(container)!.unmount();
  }

  const root = createRoot(container);
  roots.set(container, root);

  // Initialize the store
  useWidgetStore.getState().initialize(
    { apiUrl, tenantSlug: tenant, apiKey },
    product,
  );

  root.render(<WidgetApp />);

  return {
    unmount: () => {
      root.unmount();
      roots.delete(container);
    },
  };
}

// Auto-mount on data attribute elements
function autoMount() {
  const elements = document.querySelectorAll<HTMLElement>("[data-gatsoft-configurator]");
  elements.forEach((el) => {
    const apiUrl = el.dataset.apiUrl ?? el.dataset.gatsoft_api_url ?? "";
    const product = el.dataset.product ?? "";
    const tenant = el.dataset.tenant;
    const apiKey = el.dataset.apiKey;

    if (!apiUrl || !product) {
      console.warn("GatSoft Widget: data-api-url and data-product are required", el);
      return;
    }

    mount({ container: el, apiUrl, product, tenant, apiKey });
  });
}

// Auto-mount when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoMount);
} else {
  autoMount();
}

// Export for programmatic usage
export { mount };
