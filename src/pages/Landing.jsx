import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState('en');

  const toggleMenu = () => setMenuOpen(prev => !prev);
  const toggleLang = () => setLang(prev => (prev === 'en' ? 'sw' : 'en'));

  // 🔒 close menu on scroll (important UX fix)
  useEffect(() => {
    const closeMenuOnScroll = () => setMenuOpen(false);
    window.addEventListener('scroll', closeMenuOnScroll);
    return () => window.removeEventListener('scroll', closeMenuOnScroll);
  }, []);

  const content = {
    en: {
      title: 'Empowering Workers Through Unity',
      subtitle: 'Submit your union agreement form or log in to manage submissions.',
      about:
        'FIBUCA is a registered trade union dedicated to protecting and advancing workers’ rights in the financial sector.',
      benefits: [
        'Legal support for labor issues',
        'Negotiated working conditions',
        'Collective bargaining power'
      ],
      btnForm: 'Submit Union Form',
      btnLogin: 'Login',
      contact: 'Contact Us'
    },
    sw: {
      title: 'Kuwawezesha Wafanyakazi Kupitia Umoja',
      subtitle: 'Wasilisha fomu ya makubaliano ya chama au ingia kudhibiti taarifa.',
      about:
        'FIBUCA ni chama cha wafanyakazi kilichosajiliwa kinachotetea haki za wafanyakazi.',
      benefits: [
        'Msaada wa kisheria',
        'Masharti bora ya kazi',
        'Nguvu ya pamoja'
      ],
      btnForm: 'Wasilisha Fomu',
      btnLogin: 'Ingia',
      contact: 'Wasiliana Nasi'
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-white to-blue-50">
      {/* NAVBAR (FIXED) */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <div className="flex justify-between items-center px-6 py-4">
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

          {/* Desktop Lang */}
          <button
            onClick={toggleLang}
            className="hidden md:block text-sm px-3 py-1 border border-blue-500 rounded text-blue-600"
          >
            {lang === 'en' ? 'Swahili' : 'English'}
          </button>

          {/* Mobile Controls */}
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={toggleLang}
              className="text-sm px-2 py-1 border border-blue-500 rounded text-blue-600"
            >
              {lang === 'en' ? 'SW' : 'EN'}
            </button>
            <button
              onClick={toggleMenu}
              className="text-2xl text-blue-700"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE MENU (FIXED) */}
      {menuOpen && (
        <div className="fixed top-[72px] left-0 right-0 bg-white shadow-md z-40 md:hidden">
          <nav className="flex flex-col px-6 py-4 space-y-3 text-blue-700 font-medium">
            <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
            <a href="#benefits" onClick={() => setMenuOpen(false)}>Benefits</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          </nav>
        </div>
      )}

      {/* PAGE CONTENT (offset for fixed navbar) */}
      <main className="pt-24">
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
              className="bg-blue-600 text-white px-6 py-3 rounded-md shadow hover:bg-blue-700"
            >
              {content[lang].btnForm}
            </Link>
            <Link
              to="/login"
              className="border border-blue-600 text-blue-600 px-6 py-3 rounded-md"
            >
              {content[lang].btnLogin}
            </Link>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="py-16 px-6 bg-white">
          <h3 className="text-2xl font-bold text-center mb-6">
            About FIBUCA
          </h3>
          <p className="max-w-3xl mx-auto text-center text-gray-600">
            {content[lang].about}
          </p>
        </section>

        {/* BENEFITS */}
        <section id="benefits" className="py-16 px-6 bg-blue-50">
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {content[lang].benefits.map((b, i) => (
              <div key={i} className="bg-white p-6 rounded shadow">
                ✓ {b}
              </div>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="py-12 px-6 text-center bg-white">
          <h3 className="text-xl font-bold mb-2">
            {content[lang].contact}
          </h3>
          <p>📧 info@fibuca.com</p>
          <p>📞 +255 712 345 678</p>
        <p>developed by <a href="yehoshaphatij@gmail.com" className="text-blue-600 hover:underline">Coder</a></p>
        </section>
      </main>

      <footer className="bg-blue-700 text-white py-4 text-center text-sm">
        © {new Date().getFullYear()} FIBUCA Union
      </footer>
    </div>
  );
}
