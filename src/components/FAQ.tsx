import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    question: "What is the delivery time?",
    answer: "Standard delivery is 24-48 hours. For urgent orders, we have a priority delivery option that gets your thumbnail ready in under 12 hours."
  },
  {
    question: "How many revisions do I get?",
    answer: "We offer unlimited revisions for our packs and 2 revisions for single thumbnails. We work until you are 100% satisfied with the result."
  },
  {
    question: "Do you provide source files?",
    answer: "Yes, source files (PSD) are included in our 5-pack and 10-pack options. For single thumbnails, they can be added as an extra."
  },
  {
    question: "What is your refund policy?",
    answer: "If we haven't started working on your order, we offer a full refund. Once work has begun, we offer revisions to ensure you get what you need."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-black">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">
            GOT <span className="text-parrot">QUESTIONS?</span>
          </h2>
          <p className="text-white/60">Everything you need to know about working with XONN.</p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => (
            <div
              key={index}
              className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-bold text-lg">{faq.question}</span>
                {openIndex === index ? (
                  <Minus size={20} className="text-parrot" />
                ) : (
                  <Plus size={20} className="text-white/40" />
                )}
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-white/60 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
