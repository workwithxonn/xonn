import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-tighter text-parrot glow-parrot">XONN</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#products" className="text-sm font-medium text-white/70 hover:text-parrot transition-colors">Products</a>
            <Link to="/status" className="text-sm font-medium text-white/70 hover:text-parrot transition-colors">Check Status</Link>
            <a href="#faq" className="text-sm font-medium text-white/70 hover:text-parrot transition-colors">FAQ</a>
          </div>

          <div className="flex items-center space-x-4">
            {/* Admin link hidden */}
          </div>
        </div>
      </div>
    </nav>
  );
}
