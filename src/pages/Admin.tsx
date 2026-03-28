import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { Order, OrderStatus } from "../types";
import { motion } from "framer-motion";
import { Loader2, ExternalLink, CheckCircle, Clock, XCircle, Settings, Key } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [razorpayKey, setRazorpayKey] = useState(localStorage.getItem('razorpay_key_id') || "");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
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

    return () => unsubscribe();
  }, []);

  const saveSettings = () => {
    localStorage.setItem('razorpay_key_id', razorpayKey);
    toast.success("Razorpay Key ID saved successfully.");
    setShowSettings(false);
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status });
      toast.success(`Order status updated to ${status}`);
    } catch (error) {
      console.error("Update status error:", error);
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">ADMIN <span className="text-parrot">DASHBOARD.</span></h1>
          <p className="text-white/40 text-sm mt-1">Manage orders and system settings.</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold"
          >
            <Settings size={20} className={showSettings ? "text-parrot" : "text-white"} />
            <span>Settings</span>
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
          <div className="max-w-md">
            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Razorpay Key ID</label>
            <div className="flex space-x-4">
              <input 
                type="password"
                value={razorpayKey}
                onChange={(e) => setRazorpayKey(e.target.value)}
                placeholder="rzp_test_..."
                className="flex-grow px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all"
              />
              <button 
                onClick={saveSettings}
                className="px-6 py-3 bg-parrot text-black font-bold rounded-xl hover:bg-white transition-all"
              >
                Save
              </button>
            </div>
            <p className="mt-3 text-xs text-white/40 italic">This key is stored locally in your browser and used for processing payments.</p>
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
                      order.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                      order.status === 'processing' ? 'bg-blue-500/20 text-blue-500' :
                      order.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                      'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{order.channelName || "Direct Order"} <span className="text-white/40 font-normal">({order.niche || "GFX"})</span></h3>
                  <p className="text-sm text-white/60">{order.customerEmail}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right lg:mr-8">
                    <span className="block text-xs font-bold text-white/40 uppercase tracking-widest">Amount</span>
                    <span className="text-xl font-black text-parrot">₹{order.amount}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateStatus(order.id!, 'processing')}
                      className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                      title="Process"
                    >
                      <Clock size={20} />
                    </button>
                    <button
                      onClick={() => updateStatus(order.id!, 'completed')}
                      className="p-3 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all"
                      title="Complete"
                    >
                      <CheckCircle size={20} />
                    </button>
                    <button
                      onClick={() => updateStatus(order.id!, 'cancelled')}
                      className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      title="Cancel"
                    >
                      <XCircle size={20} />
                    </button>
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
