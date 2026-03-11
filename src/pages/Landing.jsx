import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState("en");
  const menuRef = useRef(null);

  const toggleMenu = () => setMenuOpen((p) => !p);
  const closeMenu = () => setMenuOpen(false);
  const toggleLang = () => setLang((p) => (p === "en" ? "sw" : "en"));

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [menuOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const heroSlides = [
    "/images/slide1.jpg",
    "/images/slide2.jpg",
    "/images/slide3.jpg",
    "/images/slide4.jpg",
    "/images/slide5.jpg",
  ];

  const content = {
    en: {
      navAbout: "About",
      navServices: "Services",
      navBenefits: "Benefits",
      navLeadership: "Leadership",
      navContact: "Contact",

      badge: "Official Trade Union Portal",
      title: "Protecting Workers’ Rights Through Unity, Representation and Action",
      subtitle:
        "FIBUCA supports workers in financial, industrial, banking, utilities, commercial and agro-processing sectors through representation, negotiation and member services.",

      heroPoints: [
        "Collective bargaining and representation",
        "Legal and labour-rights support",
        "Member welfare and education services",
      ],

      btnForm: "Submit Union Form",
      btnLogin: "Member Login",
      btnContact: "Contact Union Office",

      aboutTitle: "About FIBUCA",
      aboutText1:
        "FIBUCA is a bona fide, independent trade union established by workers to defend and advance their social and economic interests.",
      aboutText2:
        "The union advocates for fair treatment at work, stronger labour protection and practical member support across key employment sectors.",

      servicesTitle: "Our Core Services",
      services: [
        {
          title: "Collective Bargaining",
          text: "We negotiate with employers on pay, working conditions and workplace fairness.",
        },
        {
          title: "Legal & Labour Advice",
          text: "Members receive guidance and support on labour matters, disputes and workplace rights.",
        },
        {
          title: "Welfare & Education",
          text: "FIBUCA promotes member welfare through support services, education opportunities and union awareness.",
        },
      ],

      benefitsTitle: "Why Workers Join FIBUCA",
      benefits: [
        "Stronger voice through collective action",
        "Protection of workers’ rights and interests",
        "Guidance on labour disputes and employer relations",
        "Support on terms, conditions and workplace concerns",
        "Union identity, coordination and organized representation",
        "Access to union communication and member support",
      ],

      leadershipTitle: "Professional Union Leadership",
      leadershipText:
        "FIBUCA presents its team as professionals ready to help, with a mission centered on defending workers’ social and economic rights.",

      ctaTitle: "Ready to Connect With FIBUCA?",
      ctaText:
        "Log in if you are already registered, or contact the union office if you need assistance, onboarding or a valid staff submission link.",

      contactTitle: "Contact Us",
      contactItems: [
        "Email: info@fibucatradeunion.or.tz",
        "Phone: +255 784 475 333",
        "Address: Mahiwa/Lumumba Street, Plot No. 17 Block 73",
      ],

      footer:
        "FIBUCA — Financial, Industrial, Banking, Utilities, Commercial and Agro-Processing Industries Trade Union",
    },

    sw: {
      navAbout: "Kuhusu",
      navServices: "Huduma",
      navBenefits: "Faida",
      navLeadership: "Uongozi",
      navContact: "Mawasiliano",

      badge: "Tovuti Rasmi ya Chama",
      title: "Kulinda Haki za Wafanyakazi Kupitia Umoja, Uwakilishi na Hatua",
      subtitle:
        "FIBUCA inasaidia wafanyakazi wa sekta za kifedha, viwanda, benki, huduma, biashara na usindikaji wa mazao kupitia uwakilishi, majadiliano na huduma za wanachama.",

      heroPoints: [
        "Majadiliano ya pamoja na uwakilishi",
        "Msaada wa kisheria na haki za kazi",
        "Huduma za ustawi na elimu kwa wanachama",
      ],

      btnForm: "Wasilisha Fomu ya Chama",
      btnLogin: "Ingia kwa Mwanachama",
      btnContact: "Wasiliana na Ofisi ya Chama",

      aboutTitle: "Kuhusu FIBUCA",
      aboutText1:
        "FIBUCA ni chama halali na huru cha wafanyakazi kilichoanzishwa na wafanyakazi wenyewe kulinda na kuendeleza maslahi yao ya kijamii na kiuchumi.",
      aboutText2:
        "Chama kinatetea haki mahali pa kazi, ulinzi bora wa wafanyakazi na msaada wa vitendo kwa wanachama katika sekta mbalimbali za ajira.",

      servicesTitle: "Huduma Kuu za Chama",
      services: [
        {
          title: "Majadiliano ya Pamoja",
          text: "Tunafanya mazungumzo na waajiri kuhusu mishahara, mazingira ya kazi na haki kazini.",
        },
        {
          title: "Ushauri wa Kisheria na Kazi",
          text: "Wanachama hupata mwongozo na msaada kwenye migogoro ya kazi na haki za wafanyakazi.",
        },
        {
          title: "Ustawi na Elimu",
          text: "FIBUCA inaendeleza ustawi wa wanachama kupitia huduma za msaada, elimu na uhamasishaji wa chama.",
        },
      ],

      benefitsTitle: "Kwa Nini Wafanyakazi Hujiunga na FIBUCA",
      benefits: [
        "Sauti yenye nguvu kupitia umoja",
        "Ulinzi wa haki na maslahi ya wafanyakazi",
        "Mwongozo kwenye migogoro ya kazi na mahusiano na waajiri",
        "Msaada kuhusu masharti na mazingira ya kazi",
        "Utambulisho wa chama na uwakilishi ulioratibiwa",
        "Mawasiliano na msaada kwa wanachama",
      ],

      leadershipTitle: "Uongozi wa Kitaalamu wa Chama",
      leadershipText:
        "FIBUCA inaonyesha timu ya wataalamu walio tayari kusaidia kwa lengo la kutetea haki na maslahi ya kijamii na kiuchumi ya wafanyakazi.",

      ctaTitle: "Uko Tayari Kuunganishwa na FIBUCA?",
      ctaText:
        "Ingia kama tayari umesajiliwa, au wasiliana na ofisi ya chama kama unahitaji msaada, usajili au staff link halali.",

      contactTitle: "Wasiliana Nasi",
      contactItems: [
        "Barua Pepe: info@fibucatradeunion.or.tz",
        "Simu: +255 784 475 333",
        "Anwani: Mahiwa/Lumumba Street, Plot No. 17 Block 73",
      ],

      footer:
        "FIBUCA — Chama cha Wafanyakazi wa Sekta za Fedha, Viwanda, Benki, Huduma, Biashara na Usindikaji wa Mazao",
    },
  };

  const t = content[lang];

  const isClientFormAccessible = () => {
    const existingClient = localStorage.getItem("USER_ROLE") === "CLIENT";
    const newClientAllowed = localStorage.getItem("CLIENT_FORM_ACCESS") === "true";
    return existingClient || newClientAllowed;
  };

  const handleClientFormClick = (e) => {
    if (!isClientFormAccessible()) {
      e.preventDefault();
      Swal.fire({
        title: lang === "en" ? "Access Restricted" : "Ufikiaji Umezuiwa",
        text:
          lang === "en"
            ? "You need a valid staff link to submit the union form. Please contact the union office."
            : "Unahitaji staff link halali ili kuwasilisha fomu ya chama. Tafadhali wasiliana na ofisi ya chama.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    e.preventDefault();
    Swal.fire({
      title: lang === "en" ? "Use Your Staff Link" : "Tumia Staff Link Yako",
      text:
        lang === "en"
          ? "Open the exact submission link you received from union staff. This homepage button does not replace the tokenized submission URL."
          : "Fungua kiungo maalum cha uwasilishaji ulichopewa na staff wa chama. Kitufe hiki cha homepage hakibadilishi URL yenye token.",
      icon: "info",
      confirmButtonText: "OK",
    });
  };

  const handleContactClick = () => {
    const phone = "+255784475333";
    const message =
      lang === "en"
        ? "Hello FIBUCA, I would like assistance with union membership and submission."
        : "Habari FIBUCA, naomba msaada kuhusu uanachama na uwasilishaji wa fomu.";
    const url = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-sky-50 text-slate-800">
      <style>{`
        @keyframes fibuca-slide-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .fibuca-slide-track {
          display: flex;
          width: max-content;
          animation: fibuca-slide-left 28s linear infinite;
        }

        .fibuca-slide-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* NAVBAR */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur shadow-sm h-16 px-6 flex items-center justify-between z-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <img src="/images/newFibucaLogo.png" alt="FIBUCA logo" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-blue-700 leading-none">FIBUCA</h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">Official Trade Union Portal</p>
          </div>
        </div>

        <nav className="hidden md:flex space-x-6 text-blue-800 font-medium">
          <a href="#about" className="hover:text-blue-600">{t.navAbout}</a>
          <a href="#services" className="hover:text-blue-600">{t.navServices}</a>
          <a href="#benefits" className="hover:text-blue-600">{t.navBenefits}</a>
          <a href="#leadership" className="hover:text-blue-600">{t.navLeadership}</a>
          <a href="#contact" className="hover:text-blue-600">{t.navContact}</a>
        </nav>

        <button
          onClick={toggleLang}
          className="hidden md:block text-sm px-3 py-1.5 border border-blue-500 rounded-lg text-blue-700 hover:bg-blue-50"
        >
          {lang === "en" ? "Swahili" : "English"}
        </button>

        <div className="md:hidden flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="text-sm px-2 py-1 border border-blue-500 rounded text-blue-700"
          >
            {lang === "en" ? "SW" : "EN"}
          </button>

          <button
            onClick={toggleMenu}
            className="relative w-8 h-8 flex flex-col justify-center items-center"
            aria-label="Toggle menu"
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

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-16 left-0 right-0 bg-white shadow-lg z-40 md:hidden border-b border-slate-200"
          >
            <nav className="flex flex-col px-6 py-6 space-y-4 text-blue-800 font-medium">
              <a href="#about" onClick={closeMenu}>{t.navAbout}</a>
              <a href="#services" onClick={closeMenu}>{t.navServices}</a>
              <a href="#benefits" onClick={closeMenu}>{t.navBenefits}</a>
              <a href="#leadership" onClick={closeMenu}>{t.navLeadership}</a>
              <a href="#contact" onClick={closeMenu}>{t.navContact}</a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-16" />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.15),transparent_35%)]" />
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 relative">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold mb-5">
                {t.badge}
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-blue-900 leading-tight mb-5">
                {t.title}
              </h2>

              {/* MOVING PICTURES DIV */}
              <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm">
                <div className="fibuca-slide-track py-3">
                  {[...heroSlides, ...heroSlides].map((src, index) => (
                    <div
                      key={`${src}-${index}`}
                      className="mx-3 shrink-0 overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white"
                    >
                      <img
                        src={src}
                        alt={`FIBUCA activity ${index + 1}`}
                        className="h-28 w-44 md:h-32 md:w-52 object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-lg text-slate-600 mb-8 max-w-2xl">
                {t.subtitle}
              </p>

              <div className="grid sm:grid-cols-3 gap-3 mb-8">
                {t.heroPoints.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white border border-slate-200 rounded-2xl px-4 py-4 shadow-sm text-sm font-medium text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/client-form"
                  onClick={handleClientFormClick}
                  className={`px-6 py-3 rounded-xl shadow transition font-semibold text-center ${
                    isClientFormAccessible()
                      ? "bg-blue-700 text-white hover:bg-blue-800"
                      : "bg-slate-300 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {t.btnForm}
                </Link>

                <Link
                  to="/login"
                  className="border border-blue-700 text-blue-700 px-6 py-3 rounded-xl hover:bg-blue-50 transition font-semibold text-center"
                >
                  {t.btnLogin}
                </Link>

                <button
                  onClick={handleContactClick}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition font-semibold"
                >
                  {t.btnContact}
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 md:p-8">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-blue-700 via-blue-500 to-sky-400 p-6 text-white relative overflow-hidden">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top_right,white,transparent_35%),radial-gradient(circle_at_bottom_left,white,transparent_30%)]" />
                  <img
                    src="/images/newFibucaLogo.png"
                    alt="FIBUCA emblem"
                    className="h-16 w-16 object-contain mb-5"
                  />
                  <h3 className="text-2xl font-bold mb-3">FIBUCA</h3>
                  <p className="text-sm md:text-base text-blue-50 leading-relaxed">
                    Financial, Industrial, Banking, Utilities, Commercial and Agro-Processing Industries Trade Union.
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/10 rounded-xl p-3">
                      <p className="text-blue-100">Workers’ Rights</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3">
                      <p className="text-blue-100">Union Representation</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3">
                      <p className="text-blue-100">Collective Action</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3">
                      <p className="text-blue-100">Member Support</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-blue-700 uppercase mb-3">
              {t.navAbout}
            </p>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-5">
              {t.aboutTitle}
            </h3>
            <p className="text-slate-600 leading-8 mb-4">{t.aboutText1}</p>
            <p className="text-slate-600 leading-8">{t.aboutText2}</p>
          </div>

          <div className="grid gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <h4 className="font-bold text-blue-900 mb-2">Representation</h4>
              <p className="text-slate-600">
                We help workers organize and strengthen their position through collective voice and formal union structures.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h4 className="font-bold text-slate-900 mb-2">Protection</h4>
              <p className="text-slate-600">
                We support members on rights, fairness, labour relations and work-related concerns.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
              <h4 className="font-bold text-emerald-900 mb-2">Coordination</h4>
              <p className="text-slate-600">
                We connect members, staff and union processes through structured submission and communication systems.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-[0.18em] text-blue-700 uppercase mb-3">
              {t.navServices}
            </p>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {t.servicesTitle}
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {t.services.map((service, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -4 }}
                className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg mb-5">
                  {i + 1}
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">{service.title}</h4>
                <p className="text-slate-600 leading-7">{service.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-[0.18em] text-blue-700 uppercase mb-3">
              {t.navBenefits}
            </p>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {t.benefitsTitle}
            </h3>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {t.benefits.map((b, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02 }}
                className="bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-sm"
              >
                <h4 className="text-blue-700 font-semibold leading-7">✓ {b}</h4>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section id="leadership" className="py-20 px-6 bg-blue-50">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm font-semibold tracking-[0.18em] text-blue-700 uppercase mb-3">
            {t.navLeadership}
          </p>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-5">
            {t.leadershipTitle}
          </h3>
          <p className="text-slate-600 leading-8 max-w-3xl mx-auto">
            {t.leadershipText}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">{t.ctaTitle}</h3>
          <p className="text-slate-300 leading-8 mb-8">{t.ctaText}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold"
            >
              {t.btnLogin}
            </Link>
            <button
              onClick={handleContactClick}
              className="border border-slate-500 hover:border-white hover:bg-white hover:text-slate-900 px-6 py-3 rounded-xl font-semibold transition"
            >
              {t.btnContact}
            </button>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-16 px-6 text-center bg-white">
        <h3 className="text-2xl font-bold mb-6">{t.contactTitle}</h3>

        <div className="max-w-3xl mx-auto grid md:grid-cols-3 gap-4">
          {t.contactItems.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-blue-800 text-white py-5 text-center text-sm px-6">
        © {new Date().getFullYear()} {t.footer}
      </footer>
    </div>
  );
}