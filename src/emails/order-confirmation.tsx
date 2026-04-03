import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Row,
  Column,
  Preview,
  Hr,
} from "@react-email/components";

interface OrderItem {
  productName: string;
  configSummary: string;
  quantity: number;
  price: number;
}

interface OrderConfirmationEmailProps {
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function OrderConfirmationEmail({
  orderNumber,
  items,
  subtotal,
  total,
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your order {orderNumber} has been confirmed!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={headerSection}>
            <Heading style={logo}>GatSoft Signs</Heading>
          </Section>

          <Section style={contentSection}>
            <Heading style={heading}>Order Confirmed</Heading>
            <Text style={orderNumberText}>Order #{orderNumber}</Text>
            <Text style={paragraph}>
              Thank you for your order! We&apos;ve received your payment and
              will begin production shortly. Below is a summary of your order.
            </Text>

            <Hr style={hr} />

            <Section style={itemsSection}>
              <Heading as="h3" style={subheading}>
                Order Items
              </Heading>

              {/* Table header */}
              <Row style={tableHeaderRow}>
                <Column style={tableHeaderCell}>Product</Column>
                <Column style={tableHeaderCellRight}>Qty</Column>
                <Column style={tableHeaderCellRight}>Price</Column>
              </Row>

              {/* Items */}
              {items.map((item, index) => (
                <Row key={index} style={tableRow}>
                  <Column style={tableCell}>
                    <Text style={productName}>{item.productName}</Text>
                    <Text style={configSummary}>{item.configSummary}</Text>
                  </Column>
                  <Column style={tableCellRight}>
                    <Text style={cellText}>{item.quantity}</Text>
                  </Column>
                  <Column style={tableCellRight}>
                    <Text style={cellText}>
                      {formatPrice(item.price * item.quantity)}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>

            <Hr style={hr} />

            {/* Totals */}
            <Section style={totalsSection}>
              <Row style={totalRow}>
                <Column style={totalLabel}>Subtotal</Column>
                <Column style={totalValue}>{formatPrice(subtotal)}</Column>
              </Row>
              <Row style={totalRow}>
                <Column style={totalLabel}>Shipping</Column>
                <Column style={totalValue}>Calculated at production</Column>
              </Row>
              <Hr style={hrLight} />
              <Row style={totalRow}>
                <Column style={grandTotalLabel}>Total</Column>
                <Column style={grandTotalValue}>{formatPrice(total)}</Column>
              </Row>
            </Section>

            <Hr style={hr} />

            <Section style={infoSection}>
              <Heading as="h3" style={subheading}>
                What Happens Next?
              </Heading>
              <Text style={paragraph}>
                1. Our team will review your design specifications.
              </Text>
              <Text style={paragraph}>
                2. We&apos;ll send a digital proof for your approval within 1-2
                business days.
              </Text>
              <Text style={paragraph}>
                3. Once approved, production typically takes 2-3 weeks.
              </Text>
              <Text style={paragraph}>
                4. We&apos;ll ship your sign with tracking information and
                installation instructions.
              </Text>
            </Section>

            <Text style={paragraph}>
              If you have any questions about your order, reply to this email or
              reference order #{orderNumber}.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} GatSoft Signs. All rights
              reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderConfirmationEmail;

const body = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: "0",
  padding: "0",
};

const container = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  margin: "40px auto",
  maxWidth: "600px",
  overflow: "hidden" as const,
};

const headerSection = {
  backgroundColor: "#18181b",
  padding: "24px 40px",
};

const logo = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "700" as const,
  margin: "0",
};

const contentSection = {
  padding: "40px",
};

const heading = {
  color: "#18181b",
  fontSize: "28px",
  fontWeight: "700" as const,
  lineHeight: "1.3",
  margin: "0 0 8px 0",
};

const orderNumberText = {
  color: "#71717a",
  fontSize: "16px",
  fontWeight: "500" as const,
  margin: "0 0 24px 0",
};

const paragraph = {
  color: "#3f3f46",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 12px 0",
};

const subheading = {
  color: "#18181b",
  fontSize: "18px",
  fontWeight: "600" as const,
  margin: "0 0 16px 0",
};

const itemsSection = {
  margin: "24px 0",
};

const tableHeaderRow = {
  borderBottom: "2px solid #e4e4e7",
  padding: "8px 0",
};

const tableHeaderCell = {
  color: "#71717a",
  fontSize: "13px",
  fontWeight: "600" as const,
  padding: "8px 0",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const tableHeaderCellRight = {
  ...tableHeaderCell,
  textAlign: "right" as const,
};

const tableRow = {
  borderBottom: "1px solid #f4f4f5",
};

const tableCell = {
  padding: "12px 0",
  verticalAlign: "top" as const,
};

const tableCellRight = {
  ...tableCell,
  textAlign: "right" as const,
};

const productName = {
  color: "#18181b",
  fontSize: "15px",
  fontWeight: "600" as const,
  margin: "0 0 4px 0",
};

const configSummary = {
  color: "#71717a",
  fontSize: "13px",
  lineHeight: "1.4",
  margin: "0",
};

const cellText = {
  color: "#3f3f46",
  fontSize: "15px",
  margin: "0",
};

const totalsSection = {
  margin: "24px 0",
};

const totalRow = {
  padding: "4px 0",
};

const totalLabel = {
  color: "#71717a",
  fontSize: "15px",
};

const totalValue = {
  color: "#3f3f46",
  fontSize: "15px",
  textAlign: "right" as const,
};

const grandTotalLabel = {
  color: "#18181b",
  fontSize: "18px",
  fontWeight: "700" as const,
};

const grandTotalValue = {
  color: "#18181b",
  fontSize: "18px",
  fontWeight: "700" as const,
  textAlign: "right" as const,
};

const infoSection = {
  margin: "24px 0",
};

const hr = {
  borderColor: "#e4e4e7",
  borderTop: "1px solid #e4e4e7",
  margin: "24px 0",
};

const hrLight = {
  borderColor: "#f4f4f5",
  borderTop: "1px solid #f4f4f5",
  margin: "8px 0",
};

const footerSection = {
  padding: "24px 40px",
};

const footerText = {
  color: "#a1a1aa",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "0 0 4px 0",
};
