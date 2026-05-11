import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import RazorpayModule from "razorpay";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, getDocs, serverTimestamp } from "firebase/firestore";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

dotenv.config();

// Initialize Firebase with Client SDK for better cross-environment support in AI Studio
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

console.log(`Firebase Client SDK initialized for project: ${firebaseConfig.projectId}, database: ${firebaseConfig.firestoreDatabaseId}`);

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
      console.log("Checking admin setup status via Client SDK...");
      const docRef = doc(db, "admin", "credentials");
      const adminDoc = await getDoc(docRef);
      console.log("Admin setup exists:", adminDoc.exists());
      res.json({ isSetup: adminDoc.exists() });
    } catch (error: any) {
      console.error("Failed to check setup:", error);
      res.status(500).json({ error: "Failed to check setup", details: error.message });
    }
  });

  app.post("/api/admin/setup", async (req, res) => {
    try {
      const { password } = req.body;
      console.log("Attempting initial admin setup via Client SDK...");
      
      const docRef = doc(db, "admin", "credentials");
      const adminDoc = await getDoc(docRef);
      
      if (adminDoc.exists()) {
        console.warn("Setup aborted: Admin already exists.");
        return res.status(400).json({ error: "Admin already setup" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await setDoc(docRef, {
        password: hashedPassword,
        createdAt: serverTimestamp()
      });

      console.log("Admin setup successful.");
      res.json({ success: true });
    } catch (error: any) {
      console.error("Setup failed error:", error);
      res.status(500).json({ error: "Setup failed", details: error.message });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { password } = req.body;
      const docRef = doc(db, "admin", "credentials");
      const adminDoc = await getDoc(docRef);
      
      if (!adminDoc.exists()) {
        return res.status(404).json({ error: "Admin not setup" });
      }

      const adminData = adminDoc.data();
      const isValid = await bcrypt.compare(password, adminData?.password);

      console.log("Admin Login Debug:");
      console.log("- Comparison Result:", isValid);

      if (!isValid) {
        return res.status(401).json({ error: "Incorrect Password" });
      }

      const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
      res.cookie("admin_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000
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
      const docRef = doc(db, "admin", "credentials");
      const adminDoc = await getDoc(docRef);
      const adminData = adminDoc.data();

      const isValid = await bcrypt.compare(oldPassword, adminData?.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid old password" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await updateDoc(docRef, {
        password: hashedPassword,
        updatedAt: serverTimestamp()
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
        amount: Math.round(amount * 100),
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
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/admin/update-order-status", authenticateAdmin, async (req, res) => {
    try {
      const { orderId, status } = req.body;
      const docRef = doc(db, "orders", orderId);
      await updateDoc(docRef, {
        status,
        updatedAt: serverTimestamp()
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  app.post("/api/admin/deliver-order", authenticateAdmin, async (req, res) => {
    try {
      const { orderId, deliveryLink, deliveryFileUrl } = req.body;
      const docRef = doc(db, "orders", orderId);
      
      await updateDoc(docRef, {
        status: "delivered",
        deliveryLink,
        deliveryFileUrl,
        deliveredAt: serverTimestamp()
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
      const docRef = doc(db, "orders", orderId);
      
      await updateDoc(docRef, {
        paymentStatus: "fully_paid",
        razorpayBalancePaymentId: razorpayPaymentId,
        fullyPaidAt: serverTimestamp()
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
