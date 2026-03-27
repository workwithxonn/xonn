import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogIn, LogOut, LayoutDashboard, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

export default function Navbar() {
  const { user, profile, login, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-tighter text-parrot glow-parrot">XONN</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#products" className="text-sm font-medium text-white/70 hover:text-parrot transition-colors">Products</a>
            <a href="#faq" className="text-sm font-medium text-white/70 hover:text-parrot transition-colors">FAQ</a>
          </div>

          <div className="flex items-center space-x-4">
            {profile?.role === 'admin' && (
              <Link to="/admin" className="p-2 text-white/70 hover:text-parrot transition-colors">
                <LayoutDashboard size={20} />
              </Link>
            )}
            
            {user ? (
              <button 
                onClick={logout}
                className="flex items-center space-x-2 text-sm font-medium text-white/70 hover:text-parrot transition-colors"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            ) : (
              <button 
                onClick={login}
                className="flex items-center space-x-2 px-4 py-2 bg-parrot text-black font-bold rounded-full hover:bg-white transition-all transform hover:scale-105"
              >
                <LogIn size={18} />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
