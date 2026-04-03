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

interface WelcomeEmailProps {
  name: string;
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to GatSoft Signs — start designing your custom signage today!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={headerSection}>
            <Heading style={logo}>GatSoft Signs</Heading>
          </Section>

          <Section style={contentSection}>
            <Heading style={heading}>Welcome to GatSoft Signs!</Heading>
            <Text style={paragraph}>Hi {name},</Text>
            <Text style={paragraph}>
              Thank you for joining GatSoft Signs! We specialize in premium
              custom channel letters and 3D signage for businesses of all sizes.
            </Text>
            <Text style={paragraph}>
              With our interactive 3D configurator, you can design your perfect
              sign in real time — choose from front-lit, back-lit, halo-lit,
              marquee, trimless, and non-lit options. See your sign come to life
              before you order.
            </Text>
            <Text style={paragraph}>
              Ready to get started? Click below to design your first sign.
            </Text>

            <Section style={ctaSection}>
              <Button
                style={ctaButton}
                href="https://gatsoftsigns.com/configure/front-lit-trim-cap"
              >
                Start Designing Your Sign
              </Button>
            </Section>

            <Text style={paragraph}>
              If you have any questions, simply reply to this email — we&apos;re
              here to help.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} GatSoft Signs. All rights
              reserved.
            </Text>
            <Text style={footerText}>
              You received this email because you created an account on
              gatsoftsigns.com.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;

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

const paragraph = {
  color: "#3f3f46",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
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
