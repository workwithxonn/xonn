import { motion } from "framer-motion";
import { Instagram, Twitter, Youtube, ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24">
          <div>
            <h2 className="text-4xl md:text-7xl font-black tracking-tighter mb-8 leading-none">
              YOU DON'T NEED MORE VIDEOS. <br />
              <span className="text-parrot glow-parrot">YOU NEED BETTER THUMBNAILS.</span>
            </h2>
            <a
              href="#products"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-parrot text-black font-bold rounded-full hover:bg-white transition-all transform hover:scale-105"
            >
              <span>Order Now</span>
              <ArrowUpRight size={20} />
            </a>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Navigation</h4>
              <ul className="space-y-2">
                <li><a href="#products" className="text-white/60 hover:text-parrot transition-colors">Products</a></li>
                <li><a href="#portfolio" className="text-white/60 hover:text-parrot transition-colors">Portfolio</a></li>
                <li><a href="#faq" className="text-white/60 hover:text-parrot transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Social</h4>
              <ul className="space-y-2">
                <li><a href="https://x.com/xonngfx" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-white/60 hover:text-parrot transition-colors"><Twitter size={16} /> <span>Twitter</span></a></li>
                <li><a href="https://www.instagram.com/xonn.gfx" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-white/60 hover:text-parrot transition-colors"><Instagram size={16} /> <span>Instagram</span></a></li>
                <li><a href="https://www.youtube.com/@XONN.V" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-white/60 hover:text-parrot transition-colors"><Youtube size={16} /> <span>YouTube</span></a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-white/10">
          <span className="text-2xl font-bold tracking-tighter text-parrot mb-4 md:mb-0">XONN</span>
          <p className="text-sm text-white/40">© 2026 XONN. All rights reserved. Premium Visuals for Serious Creators.</p>
        </div>
      </div>
    </footer>
  );
}
