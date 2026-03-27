import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { Order, OrderStatus } from "../types";
import { motion } from "framer-motion";
import { Loader2, ExternalLink, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const { profile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;

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
  }, [profile]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status });
      toast.success(`Order status updated to ${status}`);
    } catch (error) {
      console.error("Update status error:", error);
      toast.error("Failed to update status");
    }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-parrot" size={48} />
    </div>
  );

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertCircle size={64} className="text-red-500 mb-4" />
        <h1 className="text-3xl font-black tracking-tighter mb-2">ACCESS DENIED.</h1>
        <p className="text-white/60">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-4xl font-black tracking-tighter">ADMIN <span className="text-parrot">DASHBOARD.</span></h1>
        <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-bold">
          {orders.length} Total Orders
        </div>
      </div>

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
              className="p-6 bg-white/5 border border-white/10 rounded-3xl overflow-hidden"
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
                  <h3 className="text-xl font-bold">{order.channelName} <span className="text-white/40 font-normal">({order.niche})</span></h3>
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
                  <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Thumbnail Text</h4>
                  <p className="text-sm text-white/80 bg-white/5 p-4 rounded-xl border border-white/5 italic">
                    "{order.text || "No text provided"}"
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
