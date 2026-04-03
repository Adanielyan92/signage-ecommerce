import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
  Preview,
  Hr,
} from "@react-email/components";

export type OrderStatus =
  | "pending"
  | "proof_sent"
  | "proof_approved"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled";

interface OrderStatusUpdateEmailProps {
  orderNumber: string;
  newStatus: OrderStatus;
  orderUrl: string;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending Review",
  proof_sent: "Digital Proof Sent",
  proof_approved: "Proof Approved",
  in_production: "In Production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  pending: "Your order has been received and is pending review by our team.",
  proof_sent:
    "We have sent a digital proof of your sign design. Please review and approve it so we can begin production.",
  proof_approved:
    "Your proof has been approved! We are now preparing your order for production.",
  in_production:
    "Your sign is currently being manufactured. Production typically takes 2-3 weeks.",
  shipped:
    "Your sign has been shipped! You will receive tracking information separately.",
  delivered:
    "Your sign has been delivered. We hope you love it! If you need installation help, please reach out.",
  cancelled:
    "Your order has been cancelled. If you did not request this cancellation, please contact us immediately.",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#f59e0b",
  proof_sent: "#3b82f6",
  proof_approved: "#10b981",
  in_production: "#8b5cf6",
  shipped: "#06b6d4",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

export function OrderStatusUpdateEmail({
  orderNumber,
  newStatus,
  orderUrl,
}: OrderStatusUpdateEmailProps) {
  const statusLabel = STATUS_LABELS[newStatus];
  const statusDescription = STATUS_DESCRIPTIONS[newStatus];
  const statusColor = STATUS_COLORS[newStatus];

  return (
    <Html>
      <Head />
      <Preview>
        Order {orderNumber} — {statusLabel}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={headerSection}>
            <Heading style={logo}>GatSoft Signs</Heading>
          </Section>

          <Section style={contentSection}>
            <Text style={orderNumberText}>Order #{orderNumber}</Text>
            <Heading style={heading}>Order Status Update</Heading>

            <Section style={statusBadgeSection}>
              <Text
                style={{
                  ...statusBadge,
                  backgroundColor: `${statusColor}15`,
                  color: statusColor,
                  borderColor: statusColor,
                }}
              >
                {statusLabel}
              </Text>
            </Section>

            <Text style={paragraph}>{statusDescription}</Text>

            <Section style={ctaSection}>
              <Button style={ctaButton} href={orderUrl}>
                View Order Details
              </Button>
            </Section>

            {newStatus === "proof_sent" && (
              <Section style={calloutSection}>
                <Text style={calloutText}>
                  Action Required: Please review and approve your digital proof
                  so we can begin production. You can view and approve the proof
                  from your order details page.
                </Text>
              </Section>
            )}

            {newStatus === "shipped" && (
              <Section style={calloutSection}>
                <Text style={calloutText}>
                  Tracking information will be sent in a separate email once the
                  carrier provides it. Most shipments arrive within 5-7 business
                  days.
                </Text>
              </Section>
            )}

            <Text style={paragraph}>
              If you have any questions about your order, reply to this email or
              contact our support team.
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

export default OrderStatusUpdateEmail;

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
  margin: "0 0 24px 0",
};

const orderNumberText = {
  color: "#71717a",
  fontSize: "14px",
  fontWeight: "500" as const,
  margin: "0 0 8px 0",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const paragraph = {
  color: "#3f3f46",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const statusBadgeSection = {
  margin: "0 0 24px 0",
};

const statusBadge = {
  border: "1px solid",
  borderRadius: "24px",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "8px 20px",
  margin: "0",
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const ctaButton = {
  backgroundColor: "#18181b",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600" as const,
  padding: "14px 32px",
  textDecoration: "none",
};

const calloutSection = {
  backgroundColor: "#f4f4f5",
  borderLeft: "4px solid #18181b",
  borderRadius: "4px",
  margin: "24px 0",
  padding: "16px 20px",
};

const calloutText = {
  color: "#3f3f46",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0",
};

const hr = {
  borderColor: "#e4e4e7",
  borderTop: "1px solid #e4e4e7",
  margin: "0",
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
