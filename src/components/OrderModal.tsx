import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Upload, CheckCircle2, Loader2, CreditCard } from "lucide-react";
import { Product, Order } from "../types";
import { useAuth } from "../context/AuthContext";
import { db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";

interface OrderModalProps {
  product: Product;
  onClose: () => void;
}

export default function OrderModal({ product, onClose }: OrderModalProps) {
  const { user, login } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: user?.email || "",
    channelName: "",
    niche: "",
    projectDetails: "",
    budget: "",
  });

  React.useEffect(() => {
    if (user?.email && !formData.customerEmail) {
      setFormData(prev => ({ ...prev, customerEmail: user.email || "" }));
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const uploadFiles = async () => {
    const urls = [];
    for (const file of files) {
      const storageRef = ref(storage, `orders/${user?.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      urls.push(url);
    }
    return urls;
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error("Please login to place an order");
      login();
      return;
    }

    setLoading(true);
    try {
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        toast.error("Razorpay Key ID is missing. Please configure it in settings.");
        setLoading(false);
        return;
      }

      const advanceAmount = Math.round(product.price * 0.5);
      
      // Create Razorpay order on backend
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: advanceAmount }),
      });

      if (!response.ok) throw new Error('Failed to create order');
      const order = await response.json();

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: "INR",
        name: "XONN",
        description: `Advance Payment for ${product.name}`,
        order_id: order.id,
        handler: async (response: any) => {
          // Payment successful
          await finalizeOrder(response.razorpay_payment_id, advanceAmount);
        },
        prefill: {
          name: formData.customerName,
          email: formData.customerEmail,
        },
        theme: {
          color: "#A7FC00",
        },
      };

      if (!(window as any).Razorpay) {
        toast.error("Razorpay SDK failed to load. Please check your internet connection.");
        setLoading(false);
        return;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const finalizeOrder = async (paymentId: string, advancePaid: number) => {
    setLoading(true);
    try {
      const imageUrls = await uploadFiles();
      
      const orderData: Order = {
        userId: user!.uid,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        channelName: formData.channelName,
        niche: formData.niche,
        projectDetails: formData.projectDetails,
        budget: formData.budget,
        referenceImages: imageUrls,
        productId: product.id,
        status: 'pending',
        createdAt: serverTimestamp(),
        amount: product.price,
        advancePaid: advancePaid,
        paymentStatus: 'partial',
        razorpayPaymentId: paymentId,
      };

      await addDoc(collection(db, "orders"), orderData);
      setStep(4);
      toast.success("Your order has been successfully placed.");
    } catch (error) {
      console.error("Order error:", error);
      toast.error("Failed to save order. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-white/40 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-xs font-bold text-parrot uppercase tracking-widest mb-2">
              <span>Step {step} of 4</span>
              <div className="h-px flex-grow bg-white/10" />
            </div>
            <h2 className="text-2xl font-black tracking-tighter">
              {step === 1 && "ORDER DETAILS"}
              {step === 2 && "PROJECT INFO"}
              {step === 3 && "PAYMENT"}
              {step === 4 && "ORDER PLACED"}
            </h2>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Your Name"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2">Channel Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.channelName}
                    onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
                    placeholder="e.g. MrBeast"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all"
                  />
                </div>
                <button
                  onClick={nextStep}
                  disabled={!formData.customerName || !formData.customerEmail}
                  className="w-full py-4 bg-parrot text-black font-bold rounded-xl hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <span>Continue</span>
                  <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2">Project Details</label>
                  <textarea
                    value={formData.projectDetails}
                    onChange={(e) => setFormData({ ...formData, projectDetails: e.target.value })}
                    placeholder="Describe your project requirements..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2">Budget (Optional)</label>
                  <input
                    type="text"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="e.g. ₹500 - ₹1000"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2">Reference Images</label>
                  <div className="relative group">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full px-4 py-6 bg-white/5 border border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center group-hover:border-parrot transition-colors">
                      <Upload size={24} className="text-white/40 group-hover:text-parrot transition-colors mb-2" />
                      <span className="text-sm text-white/40 group-hover:text-white transition-colors">
                        {files.length > 0 ? `${files.length} files selected` : "Click or drag to upload"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={prevStep}
                    className="flex-1 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center space-x-2"
                  >
                    <ChevronLeft size={18} />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={!formData.projectDetails}
                    className="flex-[2] py-4 bg-parrot text-black font-bold rounded-xl hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <span>Review Order</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-white/40">Service</span>
                    <span className="font-bold">{product.name}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-white/40">Total Price</span>
                    <span className="font-bold">₹{product.price}</span>
                  </div>
                  <div className="h-px bg-white/10 my-4" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/40">50% Advance Now</span>
                    <span className="text-xl font-black text-parrot">₹{Math.round(product.price * 0.5)}</span>
                  </div>
                </div>

                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-parrot/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CreditCard size={24} className="text-parrot" />
                  </div>
                  <p className="text-xs text-white/40">Secure payment via Razorpay / UPI</p>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={prevStep}
                    className="flex-1 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center space-x-2"
                  >
                    <ChevronLeft size={18} />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={loading}
                    className="flex-[2] py-4 bg-parrot text-black font-bold rounded-xl hover:bg-white transition-all flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <span>Pay Advance</span>
                        <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-parrot/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={48} className="text-parrot" />
                </div>
                <h3 className="text-3xl font-black tracking-tighter mb-4 text-parrot">ORDER PLACED.</h3>
                <p className="text-white/60 mb-8">
                  Your order has been successfully placed. We'll contact you at 
                  <span className="text-white font-bold ml-1">{formData.customerEmail}</span> to discuss further details.
                </p>
                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white hover:text-black transition-all"
                >
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
