import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Order } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Clock, CheckCircle, XCircle, CreditCard, ExternalLink, RefreshCcw, Download, Lock } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function OrderStatus() {
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [payingBalance, setPayingBalance] = useState<string | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchOrders = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  const handlePayBalance = async (order: Order) => {
    const balanceAmount = order.amount - order.advancePaid;
    if (balanceAmount <= 0) return;

    setPayingBalance(order.id!);
    try {
      const response = await fetch("/api/pay-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, amount: balanceAmount }),
      });

      if (!response.ok) throw new Error("Failed to create balance order");
      const razorpayOrder = await response.json();

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: "INR",
        name: "XONN",
        description: `Balance Payment for Order #${order.id?.slice(-6)}`,
        order_id: razorpayOrder.id,
        handler: async function (response: any) {
          try {
            const confirmRes = await fetch("/api/confirm-balance-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: order.id,
                razorpayPaymentId: response.razorpay_payment_id,
              }),
            });

            if (confirmRes.ok) {
              toast.success("Balance paid successfully!");
              fetchOrders();
            } else {
              throw new Error("Failed to confirm balance payment");
            }
          } catch (error) {
            console.error("Balance confirmation error:", error);
            toast.error("Payment successful but failed to update status. Please contact support.");
          }
        },
        prefill: {
          name: order.customerName,
          email: order.customerEmail,
          contact: order.customerPhone,
        },
        theme: { color: "#CCFF00" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Balance payment error:", error);
      toast.error("Failed to initiate balance payment.");
    } finally {
      setPayingBalance(null);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-parrot/20 text-parrot';
      case 'rejected': return 'bg-red-500/20 text-red-500';
      case 'refunded': return 'bg-orange-500/20 text-orange-500';
      case 'pending': return 'bg-yellow-500/20 text-yellow-500';
      case 'processing': return 'bg-blue-500/20 text-blue-500';
      case 'completed': return 'bg-green-500/20 text-green-500';
      case 'delivered': return 'bg-purple-500/20 text-purple-500';
      case 'cancelled': return 'bg-white/10 text-white/40';
      default: return 'bg-white/10 text-white/40';
    }
  };

  const getPaymentStatusStyles = (status: string) => {
    switch (status) {
      case 'fully_paid': return 'bg-green-500/20 text-green-500';
      case 'advance_paid': return 'bg-blue-500/20 text-blue-500';
      case 'refunded': return 'bg-orange-500/20 text-orange-500';
      default: return 'bg-white/10 text-white/40';
    }
  };

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4">
          CHECK <span className="text-parrot">STATUS.</span>
        </h1>
        <p className="text-white/60">Enter your email to track your orders and access your work.</p>
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
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Order #{order.id?.slice(-6)}</span>
                      <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyles(order.status)}`}>
                        {order.status === 'pending' && <Clock size={10} />}
                        {order.status === 'approved' && <CheckCircle size={10} />}
                        {order.status === 'rejected' && <XCircle size={10} />}
                        {order.status === 'refunded' && <RefreshCcw size={10} />}
                        <span>{order.status}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getPaymentStatusStyles(order.paymentStatus)}`}>
                        {order.paymentStatus.replace('_', ' ')}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold">{order.channelName || "Direct Order"}</h3>
                    <p className="text-sm text-white/60 line-clamp-1">{order.projectDetails}</p>

                    {/* Delivery Section */}
                    {order.status === 'delivered' && (
                      <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                        {order.paymentStatus === 'fully_paid' ? (
                          <div className="space-y-3">
                            <p className="text-sm font-bold text-parrot flex items-center gap-2">
                              <CheckCircle size={14} /> Your work is ready!
                            </p>
                            <div className="flex flex-wrap gap-3">
                              {order.deliveryLink && (
                                <a 
                                  href={order.deliveryLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all"
                                >
                                  <ExternalLink size={14} />
                                  <span>Open Link</span>
                                </a>
                              )}
                              {order.deliveryFileUrl && (
                                <a 
                                  href={order.deliveryFileUrl} 
                                  download
                                  className="flex items-center space-x-2 px-4 py-2 bg-parrot text-black hover:bg-white rounded-xl text-sm font-bold transition-all"
                                >
                                  <Download size={14} />
                                  <span>Download File</span>
                                </a>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm font-bold text-yellow-500 flex items-center gap-2">
                              <Lock size={14} /> Payment Pending
                            </p>
                            <p className="text-xs text-white/40">Please pay the remaining balance to access your files.</p>
                            <button
                              onClick={() => handlePayBalance(order)}
                              disabled={payingBalance === order.id}
                              className="flex items-center space-x-2 px-6 py-2 bg-parrot text-black font-bold rounded-xl hover:bg-white transition-all disabled:opacity-50"
                            >
                              {payingBalance === order.id ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />}
                              <span>Pay Balance (₹{order.amount - order.advancePaid})</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Balance Payment for Completed but not Delivered */}
                    {order.status === 'completed' && order.paymentStatus !== 'fully_paid' && (
                      <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <p className="text-sm font-bold text-white mb-3">Work Completed! Pay balance to receive files.</p>
                        <button
                          onClick={() => handlePayBalance(order)}
                          disabled={payingBalance === order.id}
                          className="flex items-center space-x-2 px-6 py-2 bg-parrot text-black font-bold rounded-xl hover:bg-white transition-all disabled:opacity-50"
                        >
                          {payingBalance === order.id ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />}
                          <span>Pay Balance (₹{order.amount - order.advancePaid})</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-8">
                    <div className="text-right">
                      <span className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Paid</span>
                      <span className="text-xl font-black text-white">₹{order.paymentStatus === 'fully_paid' ? order.amount : order.advancePaid}</span>
                    </div>

                    <div className="text-right">
                      <span className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Total</span>
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
