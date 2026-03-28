import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, setDoc, getDoc, deleteDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { Order, OrderStatus, AdminDevice } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ExternalLink, CheckCircle, Clock, XCircle, Settings, Key, Lock, ShieldCheck, Mail, CreditCard, RefreshCcw, Phone, Monitor, Trash2, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deliveryData, setDeliveryData] = useState<{ orderId: string; link: string; fileUrl: string } | null>(null);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await fetch("/api/admin/check-setup");
        const data = await res.json();
        setIsSetup(data.isSetup);
      } catch (error) {
        console.error("Setup check error:", error);
      }
    };

    const verifyAuth = async () => {
      try {
        const res = await fetch("/api/admin/verify");
        if (res.ok) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Auth verification error:", error);
      }
    };

    checkSetup();
    verifyAuth();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        toast.error("Failed to fetch orders");
      }
    } catch (error) {
      console.error("Orders fetch error:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPassword = password.trim();
    if (trimmedPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: trimmedPassword })
      });
      if (res.ok) {
        setIsSetup(true);
        localStorage.setItem("admin_password", trimmedPassword);
        setPassword("");
        toast.success("Admin password set successfully! Now you can log in.");
      } else {
        const data = await res.json();
        toast.error(data.error || "Setup failed");
      }
    } catch (error) {
      toast.error("Setup failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPassword = password.trim();
    console.log("Admin Login Attempt:");
    console.log("- Entered Password:", trimmedPassword);
    console.log("- LocalStorage Password:", localStorage.getItem("admin_password"));
    
    setAuthLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: trimmedPassword })
      });
      if (res.ok) {
        setIsAuthenticated(true);
        localStorage.setItem("admin_password", trimmedPassword);
        setPassword("");
        toast.success("Welcome back, Admin!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Incorrect Password");
      }
    } catch (error) {
      toast.error("Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      if (res.ok) {
        setOldPassword("");
        setNewPassword("");
        toast.success("Password changed successfully!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to change password");
      }
    } catch (error) {
      toast.error("Failed to change password");
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setIsAuthenticated(false);
      toast.success("Logged out successfully.");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const deliverOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryData) return;

    try {
      const res = await fetch("/api/admin/deliver-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: deliveryData.orderId,
          deliveryLink: deliveryData.link,
          deliveryFileUrl: deliveryData.fileUrl
        })
      });

      if (res.ok) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: orders.find(o => o.id === deliveryData.orderId)?.customerEmail, 
            status: 'delivered', 
            orderId: deliveryData.orderId 
          })
        });
        toast.success("Order delivered successfully!");
        setDeliveryData(null);
        fetchOrders();
      } else {
        toast.error("Failed to deliver order");
      }
    } catch (error) {
      toast.error("Delivery failed");
    }
  };

  const updateStatus = async (order: Order, status: OrderStatus) => {
    try {
      const res = await fetch("/api/admin/update-order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status })
      });
      
      if (res.ok) {
        if (status === 'approved' || status === 'rejected' || status === 'refunded') {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: order.customerEmail, 
              status, 
              orderId: order.id 
            })
          });
          toast.success(`Order ${status} and notification sent!`);
        } else {
          toast.success(`Order status updated to ${status}`);
        }
        fetchOrders();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Update status error:", error);
      toast.error("Failed to update status");
    }
  };

  if (isSetup === null) return null;

  if (!isSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 bg-zinc-900 border border-parrot/30 rounded-3xl shadow-2xl"
        >
          <div className="w-16 h-16 bg-parrot/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="text-parrot" size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-center mb-2">
            INITIAL <span className="text-parrot">SETUP.</span>
          </h1>
          <p className="text-white/40 text-center text-sm mb-8">
            Set your master admin password to secure the dashboard.
          </p>
          
          <form onSubmit={handleInitialSetup} className="space-y-4">
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set New Admin Password"
              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all"
              required
            />
            <button 
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-parrot text-black font-bold rounded-xl hover:bg-white transition-all flex items-center justify-center space-x-2"
            >
              {authLoading ? <Loader2 className="animate-spin" size={20} /> : <span>Set Password & Continue</span>}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl"
        >
          <div className="w-16 h-16 bg-parrot/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="text-parrot" size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-center mb-2">
            ADMIN <span className="text-parrot">ACCESS.</span>
          </h1>
          <p className="text-white/40 text-center text-sm mb-8">
            Please enter your password to access the dashboard.
          </p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all"
              required
            />
            <button 
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-parrot text-black font-bold rounded-xl hover:bg-white transition-all flex items-center justify-center space-x-2"
            >
              {authLoading ? <Loader2 className="animate-spin" size={20} /> : <span>Authenticate</span>}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">ADMIN <span className="text-parrot">DASHBOARD.</span></h1>
          <p className="text-white/40 text-sm mt-1">Manage orders and system settings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold"
          >
            <Settings size={20} className={showSettings ? "text-parrot" : "text-white"} />
            <span>Settings</span>
          </button>
          <button 
            onClick={logout}
            className="flex items-center space-x-2 px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all font-bold"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
          <div className="px-6 py-3 bg-parrot/10 border border-parrot/20 rounded-2xl text-sm font-black text-parrot uppercase tracking-widest">
            {orders.length} Orders
          </div>
        </div>
      </div>

      {showSettings && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 p-8 bg-zinc-900 border border-parrot/20 rounded-3xl"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Lock className="text-parrot" size={24} />
            <h2 className="text-xl font-black tracking-tighter uppercase">Security Settings</h2>
          </div>
          <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Old Password</label>
              <input 
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-parrot transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">New Password</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-parrot transition-all"
                required
              />
            </div>
            <button 
              type="submit"
              className="px-8 py-3 bg-parrot text-black font-bold rounded-xl hover:bg-white transition-all"
            >
              Update Password
            </button>
          </form>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-parrot" size={32} />
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-white/20 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Order #{order.id?.slice(-6)}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      order.status === 'approved' ? 'bg-parrot/20 text-parrot' :
                      order.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                      order.status === 'refunded' ? 'bg-orange-500/20 text-orange-500' :
                      order.status === 'processing' ? 'bg-blue-500/20 text-blue-500' :
                      order.status === 'delivered' ? 'bg-green-500/20 text-green-500' :
                      'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {order.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      order.paymentStatus === 'fully_paid' ? 'bg-green-500/20 text-green-500' :
                      order.paymentStatus === 'advance_paid' ? 'bg-blue-500/20 text-blue-500' :
                      order.paymentStatus === 'refunded' ? 'bg-orange-500/20 text-orange-500' :
                      'bg-white/10 text-white/40'
                    }`}>
                      {order.paymentStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{order.customerName} <span className="text-white/40 font-normal">({order.channelName || "Direct"})</span></h3>
                  <div className="flex items-center space-x-4 text-sm text-white/60">
                    <span className="flex items-center space-x-1"><Mail size={14} /> <span>{order.customerEmail}</span></span>
                    <span className="flex items-center space-x-1"><Phone size={14} /> <span>{order.customerPhone}</span></span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right lg:mr-8">
                    <span className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Advance Paid</span>
                    <span className="text-lg font-bold text-white">₹{order.advancePaid}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(order, 'approved')}
                          className="flex items-center space-x-2 px-4 py-2 bg-parrot/10 text-parrot border border-parrot/20 rounded-xl hover:bg-parrot hover:text-black transition-all font-bold text-sm"
                        >
                          <CheckCircle size={16} />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => updateStatus(order, 'rejected')}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold text-sm"
                        >
                          <XCircle size={16} />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                    {order.status === 'approved' && (
                      <button
                        onClick={() => updateStatus(order, 'processing')}
                        className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                        title="Start Processing"
                      >
                        <Clock size={20} />
                      </button>
                    )}
                    {order.status === 'processing' && (
                      <button
                        onClick={() => setDeliveryData({ orderId: order.id!, link: "", fileUrl: "" })}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl hover:bg-green-500 hover:text-white transition-all font-bold text-sm"
                      >
                        <CheckCircle size={16} />
                        <span>Deliver Work</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {deliveryData?.orderId === order.id && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  onSubmit={deliverOrder}
                  className="mt-6 p-6 bg-white/5 border border-parrot/20 rounded-2xl space-y-4"
                >
                  <h4 className="font-bold text-parrot uppercase tracking-tighter">Delivery Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      type="url"
                      placeholder="Delivery Link (Google Drive, etc.)"
                      value={deliveryData.link}
                      onChange={(e) => setDeliveryData({ ...deliveryData, link: e.target.value })}
                      className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white outline-none focus:border-parrot"
                    />
                    <input 
                      type="url"
                      placeholder="Direct File URL (Optional)"
                      value={deliveryData.fileUrl}
                      onChange={(e) => setDeliveryData({ ...deliveryData, fileUrl: e.target.value })}
                      className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white outline-none focus:border-parrot"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button type="submit" className="px-6 py-2 bg-parrot text-black font-bold rounded-lg hover:bg-white transition-all">Submit Delivery</button>
                    <button type="button" onClick={() => setDeliveryData(null)} className="px-6 py-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-all">Cancel</button>
                  </div>
                </motion.form>
              )}

              {order.status === 'delivered' && (
                <div className="mt-6 p-4 bg-green-500/5 border border-green-500/20 rounded-2xl">
                  <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-2">Delivered Assets</p>
                  <div className="flex flex-wrap gap-4">
                    {order.deliveryLink && (
                      <a href={order.deliveryLink} target="_blank" rel="noopener noreferrer" className="text-sm text-white hover:text-parrot flex items-center space-x-1 underline">
                        <ExternalLink size={14} /> <span>Main Delivery Link</span>
                      </a>
                    )}
                    {order.deliveryFileUrl && (
                      <a href={order.deliveryFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-white hover:text-parrot flex items-center space-x-1 underline">
                        <ExternalLink size={14} /> <span>Direct File</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Project Details</h4>
                  <p className="text-sm text-white/80 bg-white/5 p-4 rounded-xl border border-white/5 italic">
                    "{order.projectDetails || "No details provided"}"
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Reference Images</h4>
                  <div className="flex flex-wrap gap-2">
                    {order.referenceImages && order.referenceImages.length > 0 ? (
                      order.referenceImages.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 hover:border-parrot transition-colors relative group"
                        >
                          <img src={url} alt="Ref" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ExternalLink size={16} className="text-white" />
                          </div>
                        </a>
                      ))
                    ) : (
                      <span className="text-sm text-white/20">No images uploaded</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
