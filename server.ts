import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import RazorpayModule from "razorpay";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

dotenv.config();

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const adminApp = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

const Razorpay = (RazorpayModule as any).default || RazorpayModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const getRazorpay = async () => {
    let key_id = process.env.VITE_RAZORPAY_KEY_ID;
    let key_secret = process.env.RAZORPAY_KEY_SECRET;

    try {
      // Try to get from Firestore settings first
      const settingsDoc = await db.collection("settings").doc("razorpay").get();
      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (data?.keyId) key_id = data.keyId;
        if (data?.keySecret) key_secret = data.keySecret;
        console.log("Using Razorpay keys from Firestore");
      } else {
        console.log("Using Razorpay keys from environment variables");
      }
    } catch (error) {
      console.error("Error fetching Razorpay settings from Firestore:", error);
    }

    if (!key_id || !key_secret) {
      throw new Error("Razorpay keys are missing. Please configure them in the Admin panel or Secrets panel.");
    }

    return new Razorpay({
      key_id,
      key_secret,
    });
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
    // Authentication is now handled client-side using localStorage as per user request.
    // This endpoint can be used to issue a token if needed, but the password check is removed.
    const { deviceId, trustDevice } = req.body;
    
    res.json({ 
      success: true, 
      token: "mock_admin_token",
      deviceId: deviceId,
      trustDevice: trustDevice
    });
  });

  app.post("/api/notify", async (req, res) => {
    const { email, status, orderId } = req.body;
    
    let subject = "";
    let text = "";

    if (status === "approved") {
      subject = "Your Order has been Approved!";
      text = `Great news! Your order #${orderId?.slice(-6)} has been approved. Work will begin shortly. \n\nCheck your status here: ${process.env.APP_URL}/status`;
    } else if (status === "rejected") {
      subject = "Order Update: Not Approved";
      text = `We're sorry, but your order #${orderId?.slice(-6)} was not approved at this time. Your advance payment will be refunded to your UPI ID. \n\nFeel free to submit a new request later.`;
    } else if (status === "refunded") {
      subject = "Refund Confirmation";
      text = `Your payment for order #${orderId?.slice(-6)} has been refunded. Please check your UPI linked bank account. \n\nThank you for your patience.`;
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

      const razorpay = await getRazorpay();
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
