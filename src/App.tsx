import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black text-white selection:bg-parrot selection:text-black">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
        <Toaster position="top-center" theme="dark" />
      </div>
    </Router>
  );
}
