import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState("en");
  const menuRef = useRef(null);

  const toggleMenu = () => setMenuOpen((p) => !p);
  const closeMenu = () => setMenuOpen(false);
  const toggleLang = () => setLang((p) => (p === "en" ? "sw" : "en"));

  /* 🔒 Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "auto";
  }, [menuOpen]);

  /* 👆 Close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const content = {
    en: {
      title: "Empowering Workers Through Unity",
      subtitle: "Submit your union agreement form or log in to manage submissions.",
      about:
        "FIBUCA is a registered trade union dedicated to protecting and advancing workers’ rights.",
      benefits: [
        "Legal support for labor issues",
        "Negotiated working conditions",
        "Collective bargaining power",
      ],
      btnForm: "Submit Union Form",
      btnLogin: "Login",
      contact: "Contact Us",
    },
    sw: {
      title: "Kuwawezesha Wafanyakazi Kupitia Umoja",
      subtitle: "Wasilisha fomu au ingia kudhibiti taarifa.",
      about:
        "FIBUCA ni chama cha wafanyakazi kinachotetea haki za wafanyakazi.",
      benefits: [
        "Msaada wa kisheria",
        "Masharti bora ya kazi",
        "Nguvu ya pamoja",
      ],
      btnForm: "Wasilisha Fomu",
      btnLogin: "Ingia",
      contact: "Wasiliana Nasi",
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-50">
      {/* NAVBAR */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-md h-16 px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <img
            src="/images/newFibucaLogo.png"
            alt="Fibuca Logo"
            className="h-10 w-10"
          />
          <h1 className="text-xl font-bold text-blue-700">FIBUCA</h1>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex space-x-6 text-blue-700 font-medium">
          <a href="#about">About</a>
          <a href="#benefits">Benefits</a>
          <a href="#contact">Contact</a>
        </nav>

        <button
          onClick={toggleLang}
          className="hidden md:block text-sm px-3 py-1 border border-blue-500 rounded text-blue-600"
        >
          {lang === "en" ? "Swahili" : "English"}
        </button>

        {/* Mobile Controls */}
        <div className="md:hidden flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="text-sm px-2 py-1 border border-blue-500 rounded text-blue-600"
          >
            {lang === "en" ? "SW" : "EN"}
          </button>

          {/* Hamburger */}
          <button
            onClick={toggleMenu}
            className="relative w-8 h-8 flex flex-col justify-center items-center"
          >
            <span
              className={`block h-0.5 w-6 bg-blue-700 transition ${
                menuOpen ? "rotate-45 translate-y-1.5" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-blue-700 my-1 transition ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-blue-700 transition ${
                menuOpen ? "-rotate-45 -translate-y-1.5" : ""
              }`}
            />
          </button>
        </div>
      </header>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-16 left-0 right-0 bg-white shadow-lg z-40 md:hidden"
          >
            <nav className="flex flex-col px-6 py-6 space-y-4 text-blue-700 font-medium">
              <a href="#about" onClick={closeMenu}>About</a>
              <a href="#benefits" onClick={closeMenu}>Benefits</a>
              <a href="#contact" onClick={closeMenu}>Contact</a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offset */}
      <div className="h-16" />

      {/* HERO */}
      <section className="text-center py-20 px-6">
        <h2 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">
          {content[lang].title}
        </h2>
        <p className="text-lg text-gray-700 mb-8">
          {content[lang].subtitle}
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link
            to="/client-form"
            className="bg-blue-600 text-white px-6 py-3 rounded-md shadow hover:bg-blue-700 transition"
          >
            {content[lang].btnForm}
          </Link>
          <Link
            to="/login"
            className="border border-blue-600 text-blue-600 px-6 py-3 rounded-md hover:bg-blue-50 transition"
          >
            {content[lang].btnLogin}
          </Link>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-16 px-6 bg-white">
        <h3 className="text-2xl font-bold text-center mb-6">About FIBUCA</h3>
        <p className="max-w-3xl mx-auto text-center text-gray-600">
          {content[lang].about}
        </p>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="py-16 px-6 bg-blue-50">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {content[lang].benefits.map((b, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03 }}
              className="bg-white p-6 rounded-lg shadow"
            >
              <h4 className="text-blue-700 font-semibold">✓ {b}</h4>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-12 px-6 text-center bg-white">
        <h3 className="text-xl font-bold mb-2">{content[lang].contact}</h3>
        <p>📧 info@fibuca.com</p>
        <p>📞 +255 712 345 678</p>
        <p>developed by <a href="yehoshaphatij@gmail.com" target="_blank" rel="noopener noreferrer">YEHOSHAPHATI</a></p>
      </section>

      {/* FOOTER */}
      <footer className="bg-blue-700 text-white py-4 text-center text-sm">
        © {new Date().getFullYear()} FIBUCA Union
      </footer>
    </div>
  );
}
