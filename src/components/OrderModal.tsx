import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Upload, CheckCircle2, Loader2, CreditCard, Clock } from "lucide-react";
import { Product, Order } from "../types";
import { db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";

interface OrderModalProps {
  product: Product;
  onClose: () => void;
}

export default function OrderModal({ product, onClose }: OrderModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerUpiId: "",
    channelName: "",
    niche: "",
    projectDetails: "",
    budget: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const uploadFiles = async () => {
    const urls = [];
    for (const file of files) {
      const storageRef = ref(storage, `orders/${formData.customerEmail}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      urls.push(url);
    }
    return urls;
  };

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const validateUpi = (upi: string) => {
    return upi.includes("@") && upi.length > 3;
  };

  const handlePayment = async () => {
    if (!validateEmail(formData.customerEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!validateUpi(formData.customerUpiId)) {
      toast.error("Please enter a valid UPI ID.");
      return;
    }

    // Ensure Razorpay script is loaded
    if (!(window as any).Razorpay) {
      toast.error("Razorpay script not loaded. Please check your internet connection and refresh.");
      return;
    }

    const finalKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    
    if (!finalKey) {
      toast.error("Razorpay API Key is missing. Please contact support.");
      return;
    }

    setLoading(true);
    try {
      const advanceAmount = Math.round(product.price * 0.5);
      
      // Create Razorpay Order via backend
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: advanceAmount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create payment order");
      }
      
      const rzpOrder = await response.json();

      const options = {
        key: finalKey,
        amount: rzpOrder.amount,
        currency: "INR",
        name: "XONN",
        description: `50% Advance for ${product.name}`,
        order_id: rzpOrder.id,
        handler: async (response: any) => {
          try {
            setLoading(true);
            const imageUrls = await uploadFiles();
            
            const orderData: Omit<Order, 'id'> = {
              userId: formData.customerEmail,
              customerName: formData.customerName,
              customerEmail: formData.customerEmail,
              customerPhone: formData.customerPhone,
              customerUpiId: formData.customerUpiId,
              channelName: formData.channelName,
              niche: formData.niche,
              projectDetails: formData.projectDetails,
              budget: formData.budget,
              referenceImages: imageUrls,
              productId: product.id,
              status: 'pending',
              createdAt: serverTimestamp(),
              amount: product.price,
              advancePaid: advanceAmount,
              paymentStatus: 'paid',
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
            };

            await addDoc(collection(db, "orders"), orderData);
            setStep(4);
            toast.success("Payment successful! Order submitted for review.");
          } catch (error) {
            console.error("Order save error:", error);
            toast.error("Payment successful but failed to save order. Please contact support.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: formData.customerName,
          email: formData.customerEmail,
          contact: formData.customerPhone,
        },
        theme: { color: "#CCFF00" },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error("Payment failed:", response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      
      rzp.open();
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      toast.error(error.message || "Failed to initiate payment. Please try again.");
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
              {step === 3 && "PAY ADVANCE"}
              {step === 4 && "SUCCESS"}
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
                <div className="grid grid-cols-2 gap-4">
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
                    <label className="block text-xs font-bold text-white/40 uppercase mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      placeholder="+91 00000 00000"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all"
                    />
                  </div>
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
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2 text-parrot">UPI ID (For Refunds)</label>
                  <input
                    type="text"
                    value={formData.customerUpiId}
                    onChange={(e) => setFormData({ ...formData, customerUpiId: e.target.value })}
                    placeholder="username@upi"
                    className="w-full px-4 py-3 bg-white/5 border border-parrot/30 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all"
                  />
                </div>
                <button
                  onClick={nextStep}
                  disabled={!formData.customerName || !validateEmail(formData.customerEmail) || !validateUpi(formData.customerUpiId) || !formData.customerPhone}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase mb-2">Channel Name</label>
                    <input
                      type="text"
                      value={formData.channelName}
                      onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
                      placeholder="e.g. MrBeast"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase mb-2">Budget</label>
                    <input
                      type="text"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="e.g. ₹1000"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-parrot focus:ring-1 focus:ring-parrot outline-none transition-all"
                    />
                  </div>
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
                    <span>Review & Pay</span>
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

                <div className="p-4 bg-parrot/5 rounded-xl border border-parrot/20">
                  <div className="flex items-start space-x-3">
                    <CreditCard className="text-parrot mt-1" size={18} />
                    <div>
                      <p className="text-sm font-bold text-white">Secure Payment</p>
                      <p className="text-xs text-white/40">Pay 50% advance to submit your order for review. Refundable if rejected.</p>
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
                    onClick={handlePayment}
                    disabled={loading}
                    className="flex-[2] py-4 bg-parrot text-black font-bold rounded-xl hover:bg-white transition-all flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <CreditCard size={18} />
                        <span>Pay & Submit</span>
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
                <h3 className="text-3xl font-black tracking-tighter mb-4 text-parrot">PAYMENT SUCCESS!</h3>
                <p className="text-white/60 mb-8">
                  Your order has been submitted for review. We'll notify you at 
                  <span className="text-white font-bold ml-1">{formData.customerEmail}</span> once it's approved.
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
