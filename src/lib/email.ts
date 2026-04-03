import { Resend } from "resend";
import { WelcomeEmail } from "@/emails/welcome";
import { OrderConfirmationEmail } from "@/emails/order-confirmation";
import {
  OrderStatusUpdateEmail,
  type OrderStatus,
} from "@/emails/order-status-update";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "GatSoft Signs <orders@gatsoftsigns.com>";

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    react,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export async function sendWelcomeEmail(name: string, email: string) {
  return sendEmail({
    to: email,
    subject: "Welcome to GatSoft Signs!",
    react: WelcomeEmail({ name }),
  });
}

interface OrderEmailData {
  orderNumber: string;
  items: Array<{
    productName: string;
    configSummary: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  total: number;
}

export async function sendOrderConfirmation(
  order: OrderEmailData,
  email: string
) {
  return sendEmail({
    to: email,
    subject: `Order Confirmed — ${order.orderNumber}`,
    react: OrderConfirmationEmail({
      orderNumber: order.orderNumber,
      items: order.items,
      subtotal: order.subtotal,
      total: order.total,
    }),
  });
}

interface OrderStatusEmailData {
  orderNumber: string;
}

export async function sendOrderStatusUpdate(
  order: OrderStatusEmailData,
  email: string,
  newStatus: OrderStatus
) {
  const orderUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://gatsoftsigns.com"}/orders/${order.orderNumber}`;

  return sendEmail({
    to: email,
    subject: `Order ${order.orderNumber} — Status Update`,
    react: OrderStatusUpdateEmail({
      orderNumber: order.orderNumber,
      newStatus,
      orderUrl,
    }),
  });
}
