import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import RazorpayModule from "razorpay";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const Razorpay = (RazorpayModule as any).default || RazorpayModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let razorpayInstance: any = null;

  const getRazorpay = () => {
    if (!razorpayInstance) {
      const key_id = process.env.VITE_RAZORPAY_KEY_ID;
      const key_secret = process.env.RAZORPAY_KEY_SECRET;

      if (!key_id || !key_secret) {
        throw new Error("Razorpay keys are missing. Please configure VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the Secrets panel.");
      }

      razorpayInstance = new Razorpay({
        key_id,
        key_secret,
      });
    }
    return razorpayInstance;
  };

  // Email Transporter (Mock for now, user should configure SMTP in Secrets)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || "mock_user",
      pass: process.env.SMTP_PASS || "mock_pass",
    },
  });

  // API Routes
  app.post("/api/admin/auth", (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123"; // Default for demo

    if (password === adminPassword) {
      res.json({ success: true, token: "mock_admin_token" });
    } else {
      res.status(401).json({ success: false, error: "Invalid password" });
    }
  });

  app.post("/api/notify", async (req, res) => {
    const { email, status, orderId } = req.body;
    
    let subject = "";
    let text = "";

    if (status === "approved") {
      subject = "Your Order has been Approved!";
      text = `Great news! Your order #${orderId?.slice(-6)} has been approved. You can now proceed with the payment to start the project. \n\nCheck your status here: ${process.env.APP_URL}/status`;
    } else if (status === "rejected") {
      subject = "Order Update: Not Approved";
      text = `We're sorry, but your order #${orderId?.slice(-6)} was not approved at this time. This could be due to budget constraints or project requirements. \n\nFeel free to submit a new request later.`;
    }

    try {
      // In a real scenario, this would send an email. 
      // For now, we'll log it and return success.
      console.log(`Sending email to ${email}: ${subject}`);
      
      // If SMTP is configured, uncomment this:
      /*
      await transporter.sendMail({
        from: '"XONN Admin" <admin@xonn.com>',
        to: email,
        subject: subject,
        text: text,
      });
      */

      res.json({ success: true });
    } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  app.post("/api/create-order", async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const razorpay = getRazorpay();
      const options = {
        amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (error: any) {
      console.error("Razorpay error:", error);
      res.status(500).json({ error: error.message || "Failed to create order" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
