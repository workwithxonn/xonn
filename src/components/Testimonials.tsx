import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Alex Rivers",
    role: "Gaming Creator",
    text: "CTR doubled within the first week of using XONN thumbnails. The quality is unmatched.",
    rating: 5
  },
  {
    name: "Sarah Chen",
    role: "Tech Reviewer",
    text: "Finally found a designer who understands my niche. The visuals are aggressive and clean.",
    rating: 5
  },
  {
    name: "Marcus Vlogs",
    role: "Lifestyle Influencer",
    text: "Views increased by 40% on my latest series. XONN is now my go-to for all my graphics.",
    rating: 5
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">
            REAL <span className="text-parrot">RESULTS.</span>
          </h2>
          <p className="text-white/60">Don't take our word for it. Listen to our clients.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, index) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-8 rounded-3xl bg-white/5 border border-white/10 relative"
            >
              <Quote size={40} className="text-parrot/10 absolute top-6 right-6" />
              <div className="flex space-x-1 mb-6">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} size={16} className="fill-parrot text-parrot" />
                ))}
              </div>
              <p className="text-lg text-white/80 mb-8 italic">"{t.text}"</p>
              <div>
                <h4 className="font-bold text-white">{t.name}</h4>
                <span className="text-sm text-white/40">{t.role}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
