import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState('en'); // 'en' or 'sw'

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const toggleLang = () => setLang(prev => (prev === 'en' ? 'sw' : 'en'));

  const content = {
    en: {
      title: 'Empowering Workers Through Unity',
      subtitle: 'Submit your union agreement form or log in to manage submissions.',
      about: 'FIBUCA is a registered trade union dedicated to protecting and advancing workers’ rights in the financial sector. Our streamlined system allows easy digital form submission and secure access to union services.',
      benefits: [
        'Legal support for labor issues',
        'Negotiated working conditions',
        'Collective bargaining power'
      ],
      btnForm: 'Submit Union Form',
      btnLogin: 'Login',
      contact: 'Contact Us',
    },
    sw: {
      title: 'Kuwawezesha Wafanyakazi Kupitia Umoja',
      subtitle: 'Wasilisha fomu ya makubaliano ya chama au ingia kudhibiti taarifa.',
      about: 'FIBUCA ni chama cha wafanyakazi kilichosajiliwa ambacho kinatetea haki za wafanyakazi katika sekta ya kifedha. Mfumo wetu wa kidijitali hurahisisha usambazaji wa fomu na huduma salama za kijumuiya.',
      benefits: [
        'Msaada wa kisheria kwa matatizo ya kazi',
        'Mazungumzo ya masharti bora ya kazi',
        'Nguvu ya pamoja ya majadiliano'
      ],
      btnForm: 'Wasilisha Fomu ya Umoja',
      btnLogin: 'Ingia',
      contact: 'Wasiliana Nasi',
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-white to-blue-50">
      {/* NAVBAR */}
      <header className="bg-white shadow-md py-4 px-6 flex justify-between items-center sticky top-0 z-10">
        <div className="flex justify-center mb-0">
<img
  src="/images/newFibucaLogo.png"
  alt="Fibuca Logo"
  className="h-12 w-12 opacity-90 "

/>

</div>
        <h1 className="text-2xl font-bold text-blue-700">FIBUCA</h1>

        {/* Desktop Nav */}
        <nav className="space-x-6 text-blue-700 font-medium hidden md:flex">
          <a href="#about" className="hover:text-blue-500">About</a>
          <a href="#benefits" className="hover:text-blue-500">Benefits</a>
          <a href="#contact" className="hover:text-blue-500">Contact</a>
        </nav>

        {/* Lang toggle */}
        <button onClick={toggleLang} className="text-sm px-3 py-1 border border-blue-500 rounded text-blue-600 hover:bg-blue-100 mr-3 hidden md:block">
          {lang === 'en' ? 'Swahili' : 'English'}
        </button>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-3">
          <button onClick={toggleLang} className="text-sm px-2 py-1 border border-blue-500 rounded text-blue-600 hover:bg-blue-100">
            {lang === 'en' ? 'SW' : 'EN'}
          </button>
          <button onClick={toggleMenu} className="text-2xl text-blue-700 focus:outline-none">
            ☰
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white shadow-md py-4 px-6 space-y-2 text-blue-700 font-medium">
          <a href="#about" className="block hover:text-blue-500">About</a>
          <a href="#benefits" className="block hover:text-blue-500">Benefits</a>
          <a href="#contact" className="block hover:text-blue-500">Contact</a>
        </div>
      )}

      {/* HERO */}
      <section className="text-center py-20 px-6">
        <h2 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">
          {content[lang].title}
        </h2>
        <p className="text-lg text-gray-700 mb-8">{content[lang].subtitle}</p>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link
            to="/client-form"
            className="bg-blue-600 text-white px-6 py-3 rounded-md shadow hover:bg-blue-700 transition"
          >
            {content[lang].btnForm}
          </Link>
          <Link
            to="/login"
            className="bg-white border border-blue-600 text-blue-600 px-6 py-3 rounded-md hover:bg-blue-50 transition"
          >
            {content[lang].btnLogin}
          </Link>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-16 px-6 bg-white">
        <h3 className="text-2xl font-bold text-center mb-6">About FIBUCA</h3>
        <p className="max-w-3xl mx-auto text-center text-gray-600">{content[lang].about}</p>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="py-16 px-6 bg-blue-50">
        <h3 className="text-2xl font-bold text-center mb-6 text-blue-800">
          {lang === 'en' ? 'Benefits of Joining' : 'Faida za Kujiunga'}
        </h3>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {content[lang].benefits.map((benefit, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
              <h4 className="text-blue-700 font-semibold text-lg mb-2">✓ {benefit}</h4>
              <p className="text-gray-600 text-sm">
                {lang === 'en'
                  ? 'Experience strong representation that amplifies your voice.'
                  : 'Pata uwakilishi madhubuti unaoimarisha sauti yako.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-12 px-6 text-center bg-white">
        <h3 className="text-xl font-bold mb-2">{content[lang].contact}</h3>
        <p className="text-gray-600 mb-1">📧 info@fibuca.com</p>
        <p className="text-gray-600">📞 +255 712 345 678</p>
      </section>

      {/* FOOTER */}
      <footer className="bg-blue-700 text-white py-4 text-center text-sm">
        © {new Date().getFullYear()} FIBUCA Union. All rights reserved.
      </footer>
    </div>
  );
}
