import React, { useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Order } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Clock, CheckCircle, XCircle, CreditCard, ExternalLink, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

export default function OrderStatus() {
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchOrders = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("customerEmail", "==", email.toLowerCase().trim()),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      setOrders(ordersData);
      setHasSearched(true);
    } catch (error) {
      console.error("Fetch orders error:", error);
      toast.error("Failed to fetch orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4">
          CHECK <span className="text-parrot">STATUS.</span>
        </h1>
        <p className="text-white/60">Enter your email to track your orders and refund status.</p>
      </div>

      <form onSubmit={fetchOrders} className="max-w-md mx-auto mb-16">
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all"
            required
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 px-6 bg-parrot text-black font-bold rounded-xl hover:bg-white transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Search"}
          </button>
        </div>
      </form>

      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {hasSearched && orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-white/5 border border-dashed border-white/10 rounded-3xl"
            >
              <p className="text-white/40">No orders found for this email.</p>
            </motion.div>
          ) : (
            orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-white/5 border border-white/10 rounded-3xl hover:border-white/20 transition-colors"
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Order #{order.id?.slice(-6)}</span>
                      <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        order.status === 'approved' ? 'bg-parrot/20 text-parrot' :
                        order.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                        order.status === 'refunded' ? 'bg-orange-500/20 text-orange-500' :
                        order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-blue-500/20 text-blue-500'
                      }`}>
                        {order.status === 'pending' && <Clock size={10} />}
                        {order.status === 'approved' && <CheckCircle size={10} />}
                        {order.status === 'rejected' && <XCircle size={10} />}
                        {order.status === 'refunded' && <RefreshCcw size={10} />}
                        <span>{order.status}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        order.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-500' :
                        order.paymentStatus === 'refunded' ? 'bg-orange-500/20 text-orange-500' :
                        'bg-white/10 text-white/40'
                      }`}>
                        {order.paymentStatus}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold">{order.channelName || "Direct Order"}</h3>
                    <p className="text-sm text-white/60 line-clamp-1">{order.projectDetails}</p>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-8">
                    <div className="text-right">
                      <span className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Advance Paid</span>
                      <span className="text-xl font-black text-white">₹{order.advancePaid}</span>
                    </div>

                    <div className="text-right">
                      <span className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Total Amount</span>
                      <span className="text-xl font-black text-white/40">₹{order.amount}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
