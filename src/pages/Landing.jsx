import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState("en");
  const [activeSlide, setActiveSlide] = useState(0);
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
      if (menuRef.current && !menuRef.current.contains(e.target)) closeMenu();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const heroSlides = [
    "/images/slide1.jpg",
    "/images/slide2.jpg",
    "/images/slide3.jpg",
    "/images/slide4.jpg",
  ];

  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((p) => (p + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(id);
  }, [heroSlides.length]);

  const content = {
    en: {
      navAbout: "About",
      navServices: "Services",
      navBenefits: "Benefits",
      navLeadership: "Leadership",
      navContact: "Contact",
      badge: "Official Trade Union Portal",
      title: "Protecting Workers’ Rights",
      title2: "Through Unity, Representation and Action",
      subtitle:
        "FIBUCA supports workers in financial, industrial, banking, utilities, commercial and agro-processing sectors.",
      btnForm: "Submit Union Form",
      btnLogin: "Member Login",
      btnContact: "Contact Union Office",
      aboutTitle: "About FIBUCA",
      aboutText1:
        "FIBUCA is an independent trade union established by workers to defend and advance social and economic interests.",
      aboutText2:
        "We advocate fair treatment at work, stronger labour protection and practical support.",
      servicesTitle: "Our Core Services",
      services: [
        {
          title: "Collective Bargaining",
          text: "Negotiation on pay, conditions and workplace fairness.",
        },
        {
          title: "Legal & Labour Advice",
          text: "Guidance on labour matters, disputes and workplace rights.",
        },
        {
          title: "Welfare & Education",
          text: "Support services, education opportunities and union awareness.",
        },
      ],
      benefitsTitle: "Why Workers Join FIBUCA",
      benefits: [
        "Stronger voice through collective action",
        "Protection of workers’ rights and interests",
        "Guidance on disputes and employer relations",
        "Support on terms and workplace concerns",
      ],
      leadershipTitle: "Professional Union Leadership",
      leadershipText:
        "A professional team focused on defending workers’ social and economic rights.",
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
      title: "Kulinda Haki za Wafanyakazi",
      title2: "Kupitia Umoja, Uwakilishi na Hatua",
      subtitle:
        "FIBUCA inasaidia wafanyakazi wa sekta za kifedha, viwanda, benki, huduma, biashara na usindikaji wa mazao.",
      btnForm: "Wasilisha Fomu ya Chama",
      btnLogin: "Ingia kwa Mwanachama",
      btnContact: "Wasiliana na Ofisi ya Chama",
      aboutTitle: "Kuhusu FIBUCA",
      aboutText1:
        "FIBUCA ni chama huru cha wafanyakazi kilichoanzishwa kulinda maslahi ya kijamii na kiuchumi.",
      aboutText2:
        "Tunatetea haki kazini, ulinzi bora wa wafanyakazi na msaada wa vitendo.",
      servicesTitle: "Huduma Kuu za Chama",
      services: [
        {
          title: "Majadiliano ya Pamoja",
          text: "Mazungumzo kuhusu mishahara na mazingira ya kazi.",
        },
        {
          title: "Ushauri wa Kisheria na Kazi",
          text: "Mwongozo kuhusu haki za wafanyakazi na migogoro.",
        },
        {
          title: "Ustawi na Elimu",
          text: "Huduma za msaada, elimu na uhamasishaji wa chama.",
        },
      ],
      benefitsTitle: "Kwa Nini Wafanyakazi Hujiunga na FIBUCA",
      benefits: [
        "Sauti yenye nguvu kupitia umoja",
        "Ulinzi wa haki na maslahi ya wafanyakazi",
        "Mwongozo kwenye migogoro ya kazi",
        "Msaada kuhusu masharti na mazingira ya kazi",
      ],
      leadershipTitle: "Uongozi wa Kitaalamu wa Chama",
      leadershipText:
        "Timu ya wataalamu tayari kusaidia kulinda haki za kijamii na kiuchumi za wafanyakazi.",
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
          ? "Open the exact submission link received from union staff."
          : "Fungua kiungo maalum cha uwasilishaji ulichopewa na staff wa chama.",
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 text-slate-900">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-blue-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/images/newFibucaLogo.png" alt="FIBUCA logo" className="h-10 w-10 object-contain" />
            <h1 className="text-lg font-bold text-blue-700">FIBUCA</h1>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-700">
            <a href="#about" className="hover:text-blue-600">{t.navAbout}</a>
            <a href="#services" className="hover:text-blue-600">{t.navServices}</a>
            <a href="#benefits" className="hover:text-blue-600">{t.navBenefits}</a>
            <a href="#leadership" className="hover:text-blue-600">{t.navLeadership}</a>
            <a href="#contact" className="hover:text-blue-600">{t.navContact}</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="rounded-md border border-blue-300 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
            >
              {lang === "en" ? "SW" : "EN"}
            </button>
            <button
              onClick={toggleMenu}
              className="md:hidden rounded p-2 border border-blue-200 text-slate-700"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            className="fixed top-16 left-0 right-0 z-40 border-b border-blue-200 bg-white/95 px-6 py-6 md:hidden"
          >
            <nav className="flex flex-col gap-4 text-slate-700">
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

      <section className="relative">
        <div className="relative h-[70vh] min-h-[480px] w-full overflow-hidden rounded-b-3xl">
          <AnimatePresence mode="wait">
            <motion.img
              key={heroSlides[activeSlide]}
              src={heroSlides[activeSlide]}
              alt={`slide-${activeSlide + 1}`}
              initial={{ scale: 1.06, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/35 via-blue-700/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-950/35 via-transparent to-transparent" />

          <div className="relative mx-auto flex h-full max-w-7xl items-end px-4 pb-10 sm:px-6 sm:pb-14">
            <div className="max-w-3xl">
              <p className="mb-3 inline-block rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-blue-700">
                {t.badge}
              </p>
              <h2 className="text-3xl font-black leading-tight text-white drop-shadow sm:text-5xl">{t.title}</h2>
              <p className="mt-2 text-xl sm:text-2xl text-blue-100">{t.title2}</p>
              <p className="mt-4 max-w-2xl text-sm sm:text-base text-blue-50">{t.subtitle}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="rounded-xl bg-blue-600 px-7 py-3 text-base font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500"
                >
                  {t.btnLogin}
                </Link>
                <Link
                  to="/client-form"
                  onClick={handleClientFormClick}
                  className={`rounded-xl px-6 py-3 font-semibold ${
                    isClientFormAccessible()
                      ? "bg-white/80 text-blue-700 hover:bg-white"
                      : "cursor-not-allowed bg-white/60 text-slate-400"
                  }`}
                >
                  {t.btnForm}
                </Link>
                <button
                  onClick={handleContactClick}
                  className="rounded-xl border border-emerald-500/50 bg-emerald-100/80 px-6 py-3 font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  {t.btnContact}
                </button>
              </div>

              <div className="mt-6 flex items-center gap-2">
                {heroSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`h-2.5 rounded-full transition-all ${
                      i === activeSlide ? "w-8 bg-white" : "w-2.5 bg-white/65"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveSlide((p) => (p - 1 + heroSlides.length) % heroSlides.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/75 px-3 py-2 text-blue-700 hover:bg-white"
          >
            ‹
          </button>
          <button
            onClick={() => setActiveSlide((p) => (p + 1) % heroSlides.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/75 px-3 py-2 text-blue-700 hover:bg-white"
          >
            ›
          </button>
        </div>
      </section>

      <section id="about" className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-3xl border border-blue-100 bg-white/85 p-6 shadow-sm sm:p-10">
          <h3 className="text-2xl font-bold text-blue-700">{t.aboutTitle}</h3>
          <p className="mt-4 text-slate-700">{t.aboutText1}</p>
          <p className="mt-2 text-slate-600">{t.aboutText2}</p>
        </div>
      </section>

      <section id="services" className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h3 className="mb-6 text-2xl font-bold text-blue-700">{t.servicesTitle}</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {t.services.map((service, i) => (
              <div key={i} className="rounded-2xl border border-blue-100 bg-white/85 p-6 shadow-sm">
                <h4 className="font-bold text-slate-900">{service.title}</h4>
                <p className="mt-2 text-slate-600">{service.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="benefits" className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h3 className="mb-6 text-2xl font-bold text-blue-700">{t.benefitsTitle}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {t.benefits.map((b, i) => (
              <div key={i} className="rounded-xl border border-blue-100 bg-white/85 px-4 py-3 text-slate-700 shadow-sm">
                ✓ {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="leadership" className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-3xl border border-blue-200 bg-blue-100/70 p-8 text-center">
          <h3 className="text-2xl font-bold text-blue-700">{t.leadershipTitle}</h3>
          <p className="mt-3 text-slate-700">{t.leadershipText}</p>
        </div>
      </section>

      <section id="contact" className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h3 className="mb-5 text-2xl font-bold text-blue-700">{t.contactTitle}</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {t.contactItems.map((item, i) => (
              <div key={i} className="rounded-2xl border border-blue-100 bg-white/85 p-4 text-slate-700 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-10 border-t border-blue-100 bg-white/70 px-4 py-5 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} {t.footer}
      </footer>
    </div>
  );
}