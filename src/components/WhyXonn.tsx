import { motion } from "framer-motion";
import { Zap, Target, Clock, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: Target,
    title: "Designed for CTR",
    description: "We don't just make pretty pictures. We design visuals that psychologically trigger clicks."
  },
  {
    icon: Zap,
    title: "Premium Quality",
    description: "No cheap Fiverr vibes. We provide high-end, professional-grade graphics for serious brands."
  },
  {
    icon: Clock,
    title: "Fast Delivery",
    description: "Time is views. Get your thumbnails within 24-48 hours without compromising on quality."
  },
  {
    icon: ShieldCheck,
    title: "Unlimited Revisions",
    description: "Not satisfied? We revise until you are. Your satisfaction is our only metric."
  }
];

export default function WhyXonn() {
  return (
    <section className="py-24 bg-black relative overflow-hidden">
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[400px] h-[400px] bg-parrot/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 leading-none">
              WHY <span className="text-parrot">XONN?</span>
            </h2>
            <p className="text-xl text-white/60 mb-12">
              You don't need more videos. You need better thumbnails. 
              In a sea of content, your visual is your only chance to stand out.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="space-y-3"
                >
                  <div className="w-12 h-12 bg-parrot/10 rounded-xl flex items-center justify-center">
                    <feature.icon size={24} className="text-parrot" />
                  </div>
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 bg-white/5"
          >
            <img
              src="https://picsum.photos/seed/xonn-premium/1000/1000"
              alt="Premium Design"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl max-w-xs">
                <span className="text-5xl font-black text-parrot mb-2 block">+142%</span>
                <span className="text-sm font-bold text-white/60 uppercase tracking-widest">Average CTR Increase</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
