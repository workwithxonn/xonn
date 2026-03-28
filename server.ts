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
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

dotenv.config();

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const adminApp = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

const Razorpay = (RazorpayModule as any).default || RazorpayModule;
const JWT_SECRET = process.env.JWT_SECRET || "xonn_admin_secret_key_2026";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  const getRazorpay = async () => {
    // ALWAYS use backend environment variables for security
    const key_id = process.env.VITE_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      throw new Error("Razorpay keys are missing in backend environment. Please configure VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the Secrets panel.");
    }

    return new Razorpay({
      key_id,
      key_secret,
    });
  };

  // Auth Middleware
  const authenticateAdmin = (req: any, res: any, next: any) => {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.admin = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // API Routes
  app.get("/api/admin/check-setup", async (req, res) => {
    try {
      const adminDoc = await db.collection("admin").doc("credentials").get();
      res.json({ isSetup: adminDoc.exists });
    } catch (error) {
      res.status(500).json({ error: "Failed to check setup" });
    }
  });

  app.post("/api/admin/setup", async (req, res) => {
    try {
      const { password } = req.body;
      const adminDoc = await db.collection("admin").doc("credentials").get();
      
      if (adminDoc.exists) {
        return res.status(400).json({ error: "Admin already setup" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.collection("admin").doc("credentials").set({
        password: hashedPassword,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Setup failed" });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { password } = req.body;
      const adminDoc = await db.collection("admin").doc("credentials").get();
      
      if (!adminDoc.exists) {
        return res.status(404).json({ error: "Admin not setup" });
      }

      const adminData = adminDoc.data();
      const isValid = await bcrypt.compare(password, adminData?.password);

      console.log("Admin Login Debug:");
      console.log("- Entered Password (trimmed):", password);
      console.log("- Stored Password Hash:", adminData?.password);
      console.log("- Comparison Result:", isValid);

      if (!isValid) {
        return res.status(401).json({ error: "Incorrect Password" });
      }

      const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
      res.cookie("admin_token", token, {
        httpOnly: true,
        secure: true, // Required for SameSite=None
        sameSite: "none", // Required for cross-origin iframe
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    res.clearCookie("admin_token");
    res.json({ success: true });
  });

  app.get("/api/admin/verify", authenticateAdmin, (req, res) => {
    res.json({ success: true });
  });

  app.post("/api/admin/change-password", authenticateAdmin, async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const adminDoc = await db.collection("admin").doc("credentials").get();
      const adminData = adminDoc.data();

      const isValid = await bcrypt.compare(oldPassword, adminData?.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid old password" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.collection("admin").doc("credentials").update({
        password: hashedPassword,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to change password" });
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

  app.get("/api/admin/orders", authenticateAdmin, async (req, res) => {
    try {
      const snapshot = await db.collection("orders").orderBy("createdAt", "desc").get();
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/admin/update-order-status", authenticateAdmin, async (req, res) => {
    try {
      const { orderId, status } = req.body;
      await db.collection("orders").doc(orderId).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  app.post("/api/admin/deliver-order", authenticateAdmin, async (req, res) => {
    try {
      const { orderId, deliveryLink, deliveryFileUrl } = req.body;
      
      await db.collection("orders").doc(orderId).update({
        status: "delivered",
        deliveryLink,
        deliveryFileUrl,
        deliveredAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to deliver order" });
    }
  });

  app.post("/api/pay-balance", async (req, res) => {
    try {
      const { orderId, amount } = req.body;
      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const razorpay = await getRazorpay();
      const options = {
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `receipt_balance_${orderId}_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create balance order" });
    }
  });

  app.post("/api/confirm-balance-payment", async (req, res) => {
    try {
      const { orderId, razorpayPaymentId } = req.body;
      
      await db.collection("orders").doc(orderId).update({
        paymentStatus: "fully_paid",
        razorpayBalancePaymentId: razorpayPaymentId,
        fullyPaidAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to confirm balance payment" });
    }
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
    } else if (status === "delivered") {
      subject = "Your Order is Ready!";
      text = `Exciting news! Your order #${orderId?.slice(-6)} has been completed and delivered. \n\nYou can access your files here: ${process.env.APP_URL}/status \n\nThank you for choosing XONN!`;
    }

    try {
      console.log(`Sending email to ${email}: ${subject}`);
      // SMTP logic here...
      res.json({ success: true });
    } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ error: "Failed to send notification" });
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
