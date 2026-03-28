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
  const [razorpayKey, setRazorpayKey] = useState(localStorage.getItem('razorpay_key_id') || "");
  const [adminPassword, setAdminPassword] = useState(localStorage.getItem('admin_password') || "");
  const [showSettings, setShowSettings] = useState(false);
  const [showDeviceManager, setShowDeviceManager] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(sessionStorage.getItem('admin_token') === 'mock_admin_token');
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [isTrustedDevice, setIsTrustedDevice] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState<AdminDevice[]>([]);
  const [deviceId, setDeviceId] = useState(localStorage.getItem('admin_device_id') || "");

  useEffect(() => {
    const checkTrust = async () => {
      if (!deviceId) return;
      try {
        const deviceDoc = await getDoc(doc(db, "admin_devices", deviceId));
        if (deviceDoc.exists() && deviceDoc.data().isTrusted) {
          setIsTrustedDevice(true);
        }
      } catch (error) {
        console.error("Device trust check error:", error);
      }
    };
    checkTrust();
  }, [deviceId]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Orders fetch error:", error);
      toast.error("Failed to fetch orders");
      setLoading(false);
    });

    const devicesQ = query(collection(db, "admin_devices"), orderBy("lastUsed", "desc"));
    const unsubscribeDevices = onSnapshot(devicesQ, (snapshot) => {
      const devicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminDevice[];
      setTrustedDevices(devicesData);
    });

    return () => {
      unsubscribe();
      unsubscribeDevices();
    };
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    
    const storedPassword = localStorage.getItem('admin_password');
    const enteredPassword = password.trim();
    
    console.log("Stored Password:", storedPassword);
    console.log("Entered Password:", enteredPassword);

    if (!storedPassword) {
      toast.error("Admin password not set");
      setAuthLoading(false);
      return;
    }

    if (enteredPassword === storedPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_token', 'mock_admin_token');
      
      // Handle device trust
      let currentDeviceId = deviceId;
      if (!currentDeviceId) {
        currentDeviceId = crypto.randomUUID();
        setDeviceId(currentDeviceId);
        localStorage.setItem('admin_device_id', currentDeviceId);
      }

      if (trustDevice) {
        try {
          await setDoc(doc(db, "admin_devices", currentDeviceId), {
            id: currentDeviceId,
            name: `${navigator.platform} - ${navigator.vendor || 'Unknown Browser'}`,
            userAgent: navigator.userAgent,
            lastUsed: serverTimestamp(),
            isTrusted: true
          });
          setIsTrustedDevice(true);
          toast.success("Welcome back, Admin! This device is now trusted.");
        } catch (error) {
          console.error("Error saving device trust:", error);
        }
      } else {
        toast.success("Welcome back, Admin!");
      }
      
      // Update last used for existing trusted device
      if (isTrustedDevice) {
        try {
          await updateDoc(doc(db, "admin_devices", currentDeviceId), {
            lastUsed: serverTimestamp()
          });
        } catch (error) {
          console.error("Error updating device last used:", error);
        }
      }
    } else {
      toast.error("Invalid password.");
    }
    setAuthLoading(false);
  };

  const logout = async () => {
    sessionStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setPassword("");
    toast.success("Logged out successfully.");
  };

  const logoutAndUntrust = async () => {
    if (deviceId) {
      await deleteDoc(doc(db, "admin_devices", deviceId));
      localStorage.removeItem('admin_device_id');
      setDeviceId("");
      setIsTrustedDevice(false);
    }
    logout();
  };

  const removeDevice = async (id: string) => {
    try {
      await deleteDoc(doc(db, "admin_devices", id));
      if (id === deviceId) {
        localStorage.removeItem('admin_device_id');
        setDeviceId("");
        setIsTrustedDevice(false);
        logout();
      }
      toast.success("Device removed successfully.");
    } catch (error) {
      toast.error("Failed to remove device.");
    }
  };

  const removeAllDevices = async () => {
    try {
      const snapshot = await getDocs(collection(db, "admin_devices"));
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      localStorage.removeItem('admin_device_id');
      setDeviceId("");
      setIsTrustedDevice(false);
      logout();
      toast.success("All devices removed.");
    } catch (error) {
      toast.error("Failed to remove all devices.");
    }
  };

  const saveSettings = () => {
    localStorage.setItem('razorpay_key_id', razorpayKey);
    localStorage.setItem('admin_password', adminPassword);
    toast.success("Settings saved successfully.");
    setShowSettings(false);
  };

  const updateStatus = async (order: Order, status: OrderStatus) => {
    try {
      const updateData: any = { status };
      if (status === 'refunded') {
        updateData.paymentStatus = 'refunded';
      }
      
      await updateDoc(doc(db, "orders", order.id!), updateData);
      
      // Send notification email
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
    } catch (error) {
      console.error("Update status error:", error);
      toast.error("Failed to update status");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl"
        >
          <div className="w-16 h-16 bg-parrot/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            {isTrustedDevice ? <ShieldCheck className="text-parrot" size={32} /> : <Lock className="text-parrot" size={32} />}
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-center mb-2">
            {isTrustedDevice ? "QUICK " : "ADMIN "}
            <span className="text-parrot">ACCESS.</span>
          </h1>
          <p className="text-white/40 text-center text-sm mb-8">
            {isTrustedDevice 
              ? "Trusted device detected. Confirm password to proceed." 
              : "This area is restricted. Please enter the password."}
          </p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all"
                required
              />
            </div>

            {!isTrustedDevice && (
              <label className="flex items-center space-x-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${trustDevice ? 'bg-parrot' : 'bg-white/10'}`}></div>
                  <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${trustDevice ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
                <span className="text-sm text-white/60 group-hover:text-white transition-colors">Trust this device</span>
              </label>
            )}

            <button 
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-parrot text-black font-bold rounded-xl hover:bg-white transition-all flex items-center justify-center space-x-2"
            >
              {authLoading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <ShieldCheck size={20} />
                  <span>Authenticate</span>
                </>
              )}
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
            onClick={() => {
              setShowDeviceManager(!showDeviceManager);
              setShowSettings(false);
            }}
            className="flex items-center space-x-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold"
          >
            <Monitor size={20} className={showDeviceManager ? "text-parrot" : "text-white"} />
            <span>Devices</span>
          </button>
          <button 
            onClick={() => {
              setShowSettings(!showSettings);
              setShowDeviceManager(false);
            }}
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
            <Key className="text-parrot" size={24} />
            <h2 className="text-xl font-black tracking-tighter uppercase">Payment Settings</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="max-w-md">
              <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Razorpay Key ID</label>
              <input 
                type="password"
                value={razorpayKey}
                onChange={(e) => setRazorpayKey(e.target.value)}
                placeholder="rzp_test_..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all mb-4"
              />
            </div>
            <div className="max-w-md">
              <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Admin Password</label>
              <input 
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Set Admin Password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all mb-4"
              />
            </div>
          </div>
          <div className="mt-4">
            <button 
              onClick={saveSettings}
              className="px-8 py-3 bg-parrot text-black font-bold rounded-xl hover:bg-white transition-all"
            >
              Save Settings
            </button>
            <p className="mt-3 text-xs text-white/40 italic">These settings are stored locally in your browser.</p>
          </div>
        </motion.div>
      )}

      {showDeviceManager && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 p-8 bg-zinc-900 border border-parrot/20 rounded-3xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Monitor className="text-parrot" size={24} />
              <h2 className="text-xl font-black tracking-tighter uppercase">Trusted Devices Manager</h2>
            </div>
            <button 
              onClick={removeAllDevices}
              className="text-xs font-bold text-red-500 uppercase tracking-widest hover:text-white transition-colors flex items-center space-x-2"
            >
              <Trash2 size={14} />
              <span>Remove All Devices</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trustedDevices.map((device) => (
              <div 
                key={device.id}
                className={`p-4 rounded-2xl border transition-all ${device.id === deviceId ? 'bg-parrot/5 border-parrot/30' : 'bg-white/5 border-white/10'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${device.id === deviceId ? 'bg-parrot/20 text-parrot' : 'bg-white/10 text-white/40'}`}>
                      <Monitor size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold truncate max-w-[150px]">{device.name}</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">
                        {device.id === deviceId ? "Current Device" : "Trusted Device"}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeDevice(device.id)}
                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-white/30 truncate">{device.userAgent}</p>
                  <p className="text-[10px] text-white/60">Last used: {device.lastUsed?.toDate().toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-white/40 italic">Trusted devices can access the admin panel with a quick password confirmation.</p>
            <button 
              onClick={logoutAndUntrust}
              className="text-xs font-bold text-white/60 hover:text-red-500 transition-colors uppercase tracking-widest flex items-center space-x-2"
            >
              <Shield size={14} />
              <span>Untrust this device & Logout</span>
            </button>
          </div>
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
                      order.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                      'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {order.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      order.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-500' :
                      order.paymentStatus === 'refunded' ? 'bg-orange-500/20 text-orange-500' :
                      'bg-white/10 text-white/40'
                    }`}>
                      {order.paymentStatus}
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
                    <span className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1">UPI ID (Refund)</span>
                    <span className="text-sm font-bold text-parrot">{order.customerUpiId}</span>
                  </div>
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
                    {order.status === 'rejected' && order.paymentStatus === 'paid' && (
                      <button
                        onClick={() => updateStatus(order, 'refunded')}
                        className="flex items-center space-x-2 px-4 py-2 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-xl hover:bg-orange-500 hover:text-white transition-all font-bold text-sm"
                      >
                        <RefreshCcw size={16} />
                        <span>Refund Payment</span>
                      </button>
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
                        onClick={() => updateStatus(order, 'completed')}
                        className="p-3 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all"
                        title="Mark Completed"
                      >
                        <CheckCircle size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

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
