import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState("en");
  const [activeSlide, setActiveSlide] = useState(0);
  const menuRef = useRef(null);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);
  const toggleLang = () => setLang((prev) => (prev === "en" ? "sw" : "en"));

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

  const content = {
    en: {
      navAbout: "About",
      navServices: "Services",
      navBenefits: "Benefits",
      navLeadership: "Leadership",
      navContact: "Contact",
      btnForm: "Submit Union Form",
      btnLogin: "Member Login",
      btnContact: "Contact Union Office",
      aboutTitle: "About FIBUCA",
      aboutText1:
        "FIBUCA is an independent trade union established by workers to defend and advance social and economic interests.",
      aboutText2:
        "We advocate fair treatment at work, stronger labour protection and practical support for workers across multiple sectors.",
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
        "A professional team focused on defending workers’ social and economic rights through unity, guidance and representation.",
      contactTitle: "Contact Us",
      contactItems: [
        "Email: info@fibucatradeunion.or.tz",
        "Phone: +255 784 475 333",
        "Address: Mahiwa/Lumumba Street, Plot No. 17 Block 73",
      ],
      highlightsTitle: "Union Highlights",
      highlights: [
        "Clear worker representation across key sectors.",
        "Fast access to login, support and union contact.",
        "Modern responsive experience for all devices.",
      ],
      heroSlides: [
        {
          image: "/images/slide1.jpg",
          eyebrow: "Workers First",
          title: "Protecting Workers’ Rights",
          subtitle: "Through Unity, Representation and Action",
          description:
            "FIBUCA supports workers in financial, industrial, banking, utilities, commercial and agro-processing sectors.",
        },
        {
          image: "/images/slide2.jpeg",
          eyebrow: "Legal Support",
          title: "Professional Labour Guidance",
          subtitle: "Advice for disputes, contracts and fairness",
          description:
            "Get practical support on labour relations, workplace conflicts and worker protection.",
        },
        {
          image: "/images/slide3.jpeg",
          eyebrow: "Collective Strength",
          title: "Stronger Voice Through Unity",
          subtitle: "Collective bargaining that delivers results",
          description:
            "We help improve pay, workplace conditions and long-term employee representation.",
        },
        {
          image: "/images/slide4.jpg",
          eyebrow: "Member Access",
          title: "Easy Login and Union Access",
          subtitle: "Simple access to forms, support and communication",
          description:
            "Login quickly, submit forms when allowed and contact the union office with ease.",
        },
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
      btnForm: "Wasilisha Fomu ya Chama",
      btnLogin: "Ingia kwa Mwanachama",
      btnContact: "Wasiliana na Ofisi ya Chama",
      aboutTitle: "Kuhusu FIBUCA",
      aboutText1:
        "FIBUCA ni chama huru cha wafanyakazi kilichoanzishwa kulinda na kuendeleza maslahi ya kijamii na kiuchumi.",
      aboutText2:
        "Tunatetea haki kazini, ulinzi bora wa wafanyakazi na msaada wa vitendo kwa sekta mbalimbali.",
      servicesTitle: "Huduma Kuu za Chama",
      services: [
        {
          title: "Majadiliano ya Pamoja",
          text: "Mazungumzo kuhusu mishahara, mazingira na haki za kazi.",
        },
        {
          title: "Ushauri wa Kisheria na Kazi",
          text: "Mwongozo kuhusu migogoro, haki za kazi na masuala ya ajira.",
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
        "Timu ya wataalamu inayolenga kulinda haki za kijamii na kiuchumi za wafanyakazi kupitia umoja na uwakilishi.",
      contactTitle: "Wasiliana Nasi",
      contactItems: [
        "Barua Pepe: info@fibucatradeunion.or.tz",
        "Simu: +255 784 475 333",
        "Anwani: Mahiwa/Lumumba Street, Plot No. 17 Block 73",
      ],
      highlightsTitle: "Mambo Muhimu ya Chama",
      highlights: [
        "Uwakilishi wazi wa wafanyakazi katika sekta muhimu.",
        "Ufikiaji wa haraka wa kuingia, msaada na mawasiliano.",
        "Muonekano wa kisasa unaofanya vizuri kwenye vifaa vyote.",
      ],
      heroSlides: [
        {
          image: "/images/slide1.jpg",
          eyebrow: "Wafanyakazi Kwanza",
          title: "Kulinda Haki za Wafanyakazi",
          subtitle: "Kupitia Umoja, Uwakilishi na Hatua",
          description:
            "FIBUCA inasaidia wafanyakazi wa sekta za kifedha, viwanda, benki, huduma, biashara na usindikaji wa mazao.",
        },
        {
          image: "/images/slide2.jpeg",
          eyebrow: "Msaada wa Kisheria",
          title: "Mwongozo wa Kitaalamu wa Kazi",
          subtitle: "Ushauri kuhusu migogoro, mikataba na haki",
          description:
            "Pata msaada wa vitendo kuhusu mahusiano ya kazi, migogoro ya kazini na ulinzi wa wafanyakazi.",
        },
        {
          image: "/images/slide3.jpeg",
          eyebrow: "Nguvu ya Umoja",
          title: "Sauti Yenye Nguvu Kupitia Umoja",
          subtitle: "Majadiliano ya pamoja yanayoleta matokeo",
          description:
            "Tunasaidia kuboresha mishahara, mazingira ya kazi na uwakilishi wa muda mrefu wa wafanyakazi.",
        },
        {
          image: "/images/slide4.jpg",
          eyebrow: "Huduma za Wanachama",
          title: "Ingia Kirahisi na Fikia Huduma za Chama",
          subtitle: "Ufikiaji rahisi wa fomu, msaada na mawasiliano",
          description:
            "Ingia haraka, wasilisha fomu unapokubaliwa na wasiliana kwa urahisi na ofisi ya chama.",
        },
      ],
      footer:
        "FIBUCA — Chama cha Wafanyakazi wa Sekta za Fedha, Viwanda, Benki, Huduma, Biashara na Usindikaji wa Mazao",
    },
  };

  const t = content[lang];
  const heroSlides = t.heroSlides;

  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4800);

    return () => clearInterval(id);
  }, [heroSlides.length]);

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
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-blue-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/images/newFibucaLogo.png"
              alt="FIBUCA logo"
              className="h-10 w-10 object-contain"
            />
            <h1 className="text-lg font-bold text-blue-700">FIBUCA</h1>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
            <a href="#about" className="hover:text-blue-600">
              {t.navAbout}
            </a>
            <a href="#services" className="hover:text-blue-600">
              {t.navServices}
            </a>
            <a href="#benefits" className="hover:text-blue-600">
              {t.navBenefits}
            </a>
            <a href="#leadership" className="hover:text-blue-600">
              {t.navLeadership}
            </a>
            <a href="#contact" className="hover:text-blue-600">
              {t.navContact}
            </a>
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
              className="rounded border border-blue-200 p-2 text-slate-700 md:hidden"
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
            className="fixed left-0 right-0 top-16 z-40 border-b border-blue-200 bg-white/95 px-6 py-6 md:hidden"
          >
            <nav className="flex flex-col gap-4 text-slate-700">
              <a href="#about" onClick={closeMenu}>
                {t.navAbout}
              </a>
              <a href="#services" onClick={closeMenu}>
                {t.navServices}
              </a>
              <a href="#benefits" onClick={closeMenu}>
                {t.navBenefits}
              </a>
              <a href="#leadership" onClick={closeMenu}>
                {t.navLeadership}
              </a>
              <a href="#contact" onClick={closeMenu}>
                {t.navContact}
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-16" />

      <section className="relative">
        <div className="relative h-[74vh] min-h-[520px] w-full overflow-hidden rounded-b-[2rem] bg-[#0b1f4d] lg:h-[86vh]">
          <AnimatePresence mode="wait">
            <motion.img
              key={heroSlides[activeSlide].image}
              src={heroSlides[activeSlide].image}
              alt={heroSlides[activeSlide].title}
              initial={{ scale: 1.04, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 h-full w-full object-cover object-center lg:object-contain"
            />
          </AnimatePresence>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.22),transparent_28%),linear-gradient(90deg,rgba(7,19,53,0.88)_0%,rgba(10,34,88,0.62)_40%,rgba(10,34,88,0.15)_70%,rgba(10,34,88,0.05)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#081736]/80 via-transparent to-transparent" />

          <div className="relative mx-auto grid h-full max-w-7xl items-end gap-8 px-4 pb-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`hero-text-${activeSlide}`}
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 3, ease: "easeOut" }}
                className="max-w-3xl"
              >
                <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100 backdrop-blur-md">
                  {heroSlides[activeSlide].eyebrow}
                </p>

                <h2 className="max-w-3xl text-3xl font-black leading-tight text-white drop-shadow sm:text-5xl lg:text-6xl">
                  {heroSlides[activeSlide].title}
                </h2>

                <p className="mt-3 text-lg font-semibold text-blue-100 sm:text-2xl">
                  {heroSlides[activeSlide].subtitle}
                </p>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-100 sm:text-base">
                  {heroSlides[activeSlide].description}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to="/login"
                    className="rounded-xl bg-blue-600 px-7 py-3 text-base font-bold text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500"
                  >
                    {t.btnLogin}
                  </Link>

                  <Link
                    to="/client-form"
                    onClick={handleClientFormClick}
                    className={`rounded-xl px-6 py-3 font-semibold backdrop-blur-sm ${
                      isClientFormAccessible()
                        ? "bg-white/85 text-blue-800 hover:bg-white"
                        : "cursor-not-allowed bg-white/60 text-slate-500"
                    }`}
                  >
                    {t.btnForm}
                  </Link>

                  <button
                    onClick={handleContactClick}
                    className="rounded-xl border border-white/30 bg-[#0d2d70]/50 px-6 py-3 font-semibold text-white hover:bg-[#123987]/70"
                  >
                    {t.btnContact}
                  </button>
                </div>

                <div className="mt-7 flex items-center gap-3">
                  {heroSlides.map((slide, i) => (
                    <button
                      key={slide.image}
                      onClick={() => setActiveSlide(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        i === activeSlide ? "w-10 bg-white" : "w-2.5 bg-white/45 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>

                <div className="mt-4 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    key={`progress-${activeSlide}`}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 4.8, ease: "linear" }}
                    className="h-full rounded-full bg-gradient-to-r from-sky-300 via-blue-400 to-blue-600"
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="hidden lg:flex lg:justify-end">
              <div className="w-full max-w-md rounded-[1.75rem] border border-white/15 bg-white/10 p-5 text-white shadow-2xl backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-100">
                  {t.highlightsTitle}
                </p>

                <div className="mt-5 space-y-4">
                  {t.highlights.map((item, index) => (
                    <div key={item} className="rounded-2xl bg-white/10 p-4">
                      <p className="text-2xl font-black text-white">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-1 text-sm text-blue-100">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-white/70 px-3 py-2 text-blue-800 backdrop-blur hover:bg-white"
          >
            ‹
          </button>

          <button
            onClick={() => setActiveSlide((prev) => (prev + 1) % heroSlides.length)}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-white/70 px-3 py-2 text-blue-800 backdrop-blur hover:bg-white"
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
            {t.services.map((service) => (
              <div
                key={service.title}
                className="rounded-2xl border border-blue-100 bg-white/85 p-6 shadow-sm"
              >
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
            {t.benefits.map((benefit) => (
              <div
                key={benefit}
                className="rounded-xl border border-blue-100 bg-white/85 px-4 py-3 text-slate-700 shadow-sm"
              >
                ✓ {benefit}
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
            {t.contactItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-blue-100 bg-white/85 p-4 text-slate-700 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-10 border-t border-blue-950 bg-blue-950 px-4 py-5 text-center text-xs text-white">
        © {new Date().getFullYear()} {t.footer}
      </footer>
    </div>
  );
}