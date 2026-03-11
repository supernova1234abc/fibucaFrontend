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
  ];

  const content = {
    en: {
      navAbout: "About",
      navServices: "Services",
      navBenefits: "Benefits",
      navLeadership: "Leadership",
      navContact: "Contact",

      badge: "Official Trade Union Portal",
      title: "Protecting Workers’ Rights Through Unity",
      titleAccent: "Representation and Action",
      subtitle:
        "FIBUCA supports workers in financial, industrial, banking, utilities, commercial and agro-processing sectors through representation, negotiation and member services.",

      heroPoints: [
        "Collective bargaining",
        "Legal labour support",
        "Member welfare services",
      ],

      stats: [
        { value: "Workers", label: "United Voice" },
        { value: "Support", label: "Legal & Welfare" },
        { value: "Action", label: "Representation" },
      ],

      btnForm: "Submit Union Form",
      btnLogin: "Member Login",
      btnContact: "Contact Office",

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
        "Support on terms and conditions of work",
        "Organized union representation",
        "Access to member support and communication",
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
      title: "Kulinda Haki za Wafanyakazi Kupitia Umoja",
      titleAccent: "Uwakilishi na Hatua",
      subtitle:
        "FIBUCA inasaidia wafanyakazi wa sekta za kifedha, viwanda, benki, huduma, biashara na usindikaji wa mazao kupitia uwakilishi, majadiliano na huduma za wanachama.",

      heroPoints: [
        "Majadiliano ya pamoja",
        "Msaada wa kisheria wa kazi",
        "Huduma za ustawi wa wanachama",
      ],

      stats: [
        { value: "Wafanyakazi", label: "Sauti ya Pamoja" },
        { value: "Msaada", label: "Kisheria na Ustawi" },
        { value: "Hatua", label: "Uwakilishi" },
      ],

      btnForm: "Wasilisha Fomu ya Chama",
      btnLogin: "Ingia kwa Mwanachama",
      btnContact: "Wasiliana na Ofisi",

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
        "Mwongozo kwenye migogoro ya kazi",
        "Msaada kuhusu masharti ya kazi",
        "Uwakilishi wa chama ulioratibiwa",
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-100 text-slate-800">
      <style>{`
        @keyframes fibuca-slide-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
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

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/images/newFibucaLogo.png"
              alt="FIBUCA logo"
              className="h-10 w-10 object-contain shrink-0"
            />
            <div className="min-w-0">
              <h1 className="truncate text-lg sm:text-xl font-bold text-blue-700">FIBUCA</h1>
              <p className="hidden sm:block text-[11px] text-slate-500">
                Official Trade Union Portal
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-blue-800">
            <a href="#about" className="hover:text-blue-600">{t.navAbout}</a>
            <a href="#services" className="hover:text-blue-600">{t.navServices}</a>
            <a href="#benefits" className="hover:text-blue-600">{t.navBenefits}</a>
            <a href="#leadership" className="hover:text-blue-600">{t.navLeadership}</a>
            <a href="#contact" className="hover:text-blue-600">{t.navContact}</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleLang}
              className="rounded-lg border border-blue-500 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
            >
              {lang === "en" ? "Swahili" : "English"}
            </button>
          </div>

          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={toggleLang}
              className="rounded border border-blue-500 px-2 py-1 text-sm text-blue-700"
            >
              {lang === "en" ? "SW" : "EN"}
            </button>

            <button
              onClick={toggleMenu}
              className="relative flex h-8 w-8 flex-col items-center justify-center"
              aria-label="Toggle menu"
            >
              <span
                className={`block h-0.5 w-6 bg-blue-700 transition ${
                  menuOpen ? "translate-y-1.5 rotate-45" : ""
                }`}
              />
              <span
                className={`my-1 block h-0.5 w-6 bg-blue-700 transition ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-6 bg-blue-700 transition ${
                  menuOpen ? "-translate-y-1.5 -rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ y: -14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 border-b border-slate-200 bg-white shadow-lg md:hidden"
          >
            <nav className="flex flex-col gap-4 px-6 py-6 text-blue-800 font-medium">
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

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="order-2 lg:order-1">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-xs sm:text-sm font-semibold text-blue-800">
                {t.badge}
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-bold leading-tight text-slate-900">
                {t.title}
                <span className="mt-2 block text-blue-700">{t.titleAccent}</span>
              </h2>

              <p className="mt-5 max-w-2xl text-base sm:text-lg leading-7 text-slate-600">
                {t.subtitle}
              </p>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
                <div className="fibuca-slide-track py-3">
                  {[...heroSlides, ...heroSlides].map((src, index) => (
                    <div
                      key={`${src}-${index}`}
                      className="mx-2 sm:mx-3 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <img
                        src={src}
                        alt={`FIBUCA activity ${index + 1}`}
                        className="h-24 w-36 sm:h-28 sm:w-44 md:h-32 md:w-52 object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {t.heroPoints.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-700 shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  to="/client-form"
                  onClick={handleClientFormClick}
                  className={`rounded-xl px-6 py-3 text-center font-semibold shadow transition ${
                    isClientFormAccessible()
                      ? "bg-blue-700 text-white hover:bg-blue-800"
                      : "cursor-not-allowed bg-slate-300 text-slate-500"
                  }`}
                >
                  {t.btnForm}
                </Link>

                <Link
                  to="/login"
                  className="rounded-xl border border-blue-700 px-6 py-3 text-center font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  {t.btnLogin}
                </Link>

                <button
                  onClick={handleContactClick}
                  className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
                >
                  {t.btnContact}
                </button>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6 shadow-xl">
                <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-800 via-blue-600 to-sky-400 p-5 sm:p-6 text-white">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_35%),radial-gradient(circle_at_bottom_left,white,transparent_30%)]" />

                  <div className="relative">
                    <img
                      src="/images/newFibucaLogo.png"
                      alt="FIBUCA emblem"
                      className="mb-4 h-14 w-14 sm:h-16 sm:w-16 object-contain"
                    />

                    <h3 className="text-2xl sm:text-3xl font-bold">FIBUCA</h3>
                    <p className="mt-3 max-w-md text-sm sm:text-base leading-7 text-blue-50">
                      Financial, Industrial, Banking, Utilities, Commercial and Agro-Processing Industries Trade Union.
                    </p>

                    <div className="mt-6 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3">
                      {t.stats.map((item, i) => (
                        <div key={i} className="rounded-2xl bg-white/12 px-4 py-4 backdrop-blur-sm">
                          <p className="text-sm font-semibold text-white">{item.value}</p>
                          <p className="mt-1 text-xs text-blue-100">{item.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-2xl bg-white/10 p-4">
                      <p className="text-sm leading-7 text-blue-50">
                        A clear digital entry point for union information, member access and worker support.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="bg-white px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              {t.navAbout}
            </p>
            <h3 className="mb-5 text-3xl md:text-4xl font-bold text-slate-900">
              {t.aboutTitle}
            </h3>
            <p className="mb-4 leading-8 text-slate-600">{t.aboutText1}</p>
            <p className="leading-8 text-slate-600">{t.aboutText2}</p>
          </div>

          <div className="grid gap-4">
            <InfoCard
              title="Representation"
              text="We help workers organize and strengthen their position through collective voice and formal union structures."
              tone="blue"
            />
            <InfoCard
              title="Protection"
              text="We support members on rights, fairness, labour relations and work-related concerns."
              tone="slate"
            />
            <InfoCard
              title="Coordination"
              text="We connect members, staff and union processes through structured submission and communication systems."
              tone="green"
            />
          </div>
        </div>
      </section>

      <section id="services" className="bg-slate-50 px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              {t.navServices}
            </p>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900">
              {t.servicesTitle}
            </h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {t.services.map((service, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -4 }}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700">
                  {i + 1}
                </div>
                <h4 className="mb-3 text-xl font-bold text-slate-900">{service.title}</h4>
                <p className="leading-7 text-slate-600">{service.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="benefits" className="bg-white px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              {t.navBenefits}
            </p>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900">
              {t.benefitsTitle}
            </h3>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {t.benefits.map((b, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
              >
                <h4 className="font-semibold leading-7 text-blue-700">✓ {b}</h4>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="leadership" className="bg-blue-50 px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            {t.navLeadership}
          </p>
          <h3 className="mb-5 text-3xl md:text-4xl font-bold text-slate-900">
            {t.leadershipTitle}
          </h3>
          <p className="mx-auto max-w-3xl leading-8 text-slate-600">
            {t.leadershipText}
          </p>
        </div>
      </section>

      <section className="bg-slate-900 px-4 sm:px-6 py-16 sm:py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h3 className="mb-4 text-3xl md:text-4xl font-bold">{t.ctaTitle}</h3>
          <p className="mb-8 leading-8 text-slate-300">{t.ctaText}</p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/login"
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700"
            >
              {t.btnLogin}
            </Link>
            <button
              onClick={handleContactClick}
              className="rounded-xl border border-slate-500 px-6 py-3 font-semibold transition hover:border-white hover:bg-white hover:text-slate-900"
            >
              {t.btnContact}
            </button>
          </div>
        </div>
      </section>

      <section id="contact" className="bg-white px-4 sm:px-6 py-16 text-center">
        <h3 className="mb-6 text-2xl font-bold text-slate-900">{t.contactTitle}</h3>

        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
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

      <footer className="bg-blue-800 px-6 py-5 text-center text-sm text-white">
        © {new Date().getFullYear()} {t.footer}
      </footer>
    </div>
  );
}

function InfoCard({ title, text, tone = "blue" }) {
  const toneMap = {
    blue: "bg-blue-50 border-blue-100 text-blue-900",
    slate: "bg-slate-50 border-slate-200 text-slate-900",
    green: "bg-emerald-50 border-emerald-100 text-emerald-900",
  };

  return (
    <div className={`rounded-2xl border p-6 ${toneMap[tone]}`}>
      <h4 className="mb-2 font-bold">{title}</h4>
      <p className="text-slate-600">{text}</p>
    </div>
  );
}