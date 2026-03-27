import { motion } from "framer-motion";
import { Check, ShoppingCart } from "lucide-react";
import { Product } from "../types";
import { useState } from "react";
import OrderModal from "./OrderModal";

const PRODUCTS: Product[] = [
  {
    id: "custom-gaming-thumbnail",
    name: "Custom Gaming Thumbnail",
    price: 230,
    description: "High-converting gaming thumbnail designed for maximum CTR.",
    features: ["1-2 Days Delivery", "2 Revisions", "Full HD Quality", "Custom Design"],
    type: "thumbnail"
  },
  {
    id: "stream-overlay-non-animated",
    name: "Stream Overlay (Non-Animated)",
    price: 350,
    description: "Professional static stream overlay to enhance your broadcast.",
    features: ["3-4 Days Delivery", "Static Design", "High Resolution", "Custom Branding"],
    type: "gfx"
  },
  {
    id: "stream-overlay-animated",
    name: "Stream Overlay (Animated)",
    price: 500,
    description: "Dynamic animated stream overlay for a premium look.",
    features: ["3-4 Days Delivery", "Motion Graphics", "Smooth Animations", "Custom Branding"],
    type: "gfx",
    popular: true
  },
  {
    id: "gaming-logo",
    name: "Gaming Logo",
    price: 350,
    description: "Unique and aggressive gaming logo for your brand.",
    features: ["3-4 Days Delivery", "Vector Files", "Multiple Formats", "Unique Concept"],
    type: "gfx"
  },
  {
    id: "channel-banner",
    name: "Channel Banner",
    price: 300,
    description: "Stunning banner for your YouTube or Twitch channel.",
    features: ["2-3 Days Delivery", "Platform Optimized", "High Quality", "Custom Style"],
    type: "gfx"
  },
  {
    id: "stream-screens",
    name: "Stream Screens",
    price: 600,
    description: "Starting, Ending, and Paused overlays for your stream.",
    features: ["2-3 Days Delivery", "Full Set", "Cohesive Design", "High Resolution"],
    type: "gfx"
  }
];

export default function Products() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <section id="products" className="py-24 bg-black relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">
            CHOOSE YOUR <span className="text-parrot">WEAPON.</span>
          </h2>
          <p className="text-white/60">Premium visuals for serious creators. Lock your slot now.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PRODUCTS.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative p-8 rounded-3xl border ${
                product.popular ? "border-parrot bg-parrot/5" : "border-white/10 bg-white/5"
              } flex flex-col`}
            >
              {product.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-parrot text-black text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}

              <h3 className="text-xl font-bold mb-2">{product.name}</h3>
              <div className="flex items-baseline space-x-1 mb-4">
                <span className="text-3xl font-black text-parrot">₹{product.price}</span>
                <span className="text-white/40 text-sm">/service</span>
              </div>
              <p className="text-sm text-white/60 mb-6 flex-grow">{product.description}</p>

              <ul className="space-y-3 mb-8">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-center space-x-2 text-sm text-white/80">
                    <Check size={16} className="text-parrot" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedProduct(product)}
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 ${
                  product.popular
                    ? "bg-parrot text-black hover:bg-white"
                    : "bg-white/10 text-white hover:bg-white hover:text-black"
                }`}
              >
                <ShoppingCart size={18} />
                <span>Order Now</span>
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {selectedProduct && (
        <OrderModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </section>
  );
}
