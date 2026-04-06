# GatSoft 3D Configurator Widget

Embeddable 3D sign configurator for external websites.

## Quick Start

Add the script tag to your page:

    <script src="https://your-domain.com/widget/configurator-widget.js"></script>

Add a container element with data attributes:

    <div
      data-gatsoft-configurator
      data-api-url="https://your-domain.com"
      data-product="front-lit-trim-cap"
      data-tenant="your-tenant-slug"
      data-api-key="gsk_your_api_key"
      style="height: 600px;"
    ></div>

## Data Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| data-api-url | Yes | Base URL of the GatSoft API |
| data-product | Yes | Product slug to configure |
| data-tenant | No | Tenant slug (uses default if omitted) |
| data-api-key | No | API key for authentication |

## Programmatic Usage

    const instance = GatSoftConfigurator.mount({
      container: document.getElementById("my-widget"),
      apiUrl: "https://your-domain.com",
      product: "front-lit-trim-cap",
      tenant: "your-tenant-slug",
      apiKey: "gsk_your_api_key",
    });

    // Later:
    instance.unmount();

## Events

Listen for cart events:

    document.addEventListener("gatsoft:add-to-cart", (e) => {
      console.log(e.detail.product);
      console.log(e.detail.optionValues);
      console.log(e.detail.priceBreakdown);
    });

## Customization

Override CSS custom properties on the container:

    [data-gatsoft-configurator] {
      --widget-primary: #2563eb;
      --widget-bg: #fafafa;
    }

## Build

    cd widget
    npm install
    npm run build

Output: `widget/dist/configurator-widget.js`
