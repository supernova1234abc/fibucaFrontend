import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useLanguage } from "../context/LanguageContext";

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);
  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);
  const { lang } = useLanguage();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [menuOpen]);

  useEffect(() => {
    const handler = (e) => {
      const clickedInsideMenu = menuRef.current?.contains(e.target);
      const clickedMenuButton = menuButtonRef.current?.contains(e.target);
      if (!clickedInsideMenu && !clickedMenuButton) closeMenu();
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const content = {
    en: {
      navHome: "Home",
      navAbout: "About",
      navServices: "Services",
      navBenefits: "Benefits",
      navGallery: "Gallery",
      navLeadership: "Leadership",
      navContact: "Contact",
      btnForm: "Submit Union Form",
      btnLogin: "Member Login",
      btnContact: "Contact Union Office",
      heroBadge: "Official Trade Union Portal",
      aboutTitle: "About FIBUCA",
      aboutText1:
        "FIBUCA is an independent trade union established by workers to defend and advance social and economic interests.",
      aboutText2:
        "We advocate fair treatment at work, stronger labour protection and practical support for workers across multiple sectors.",
      aboutCards: [
        {
          title: "Worker Representation",
          text: "Strong representation for employees across finance, industry, banking and utilities.",
        },
        {
          title: "Reliable Support",
          text: "Clear guidance, practical assistance and modern access to union services.",
        },
      ],
      servicesTitle: "Our Core Services",
      services: [
        { title: "Collective Bargaining", text: "Negotiation on pay, conditions and workplace fairness." },
        { title: "Legal & Labour Advice", text: "Guidance on labour matters, disputes and workplace rights." },
        { title: "Welfare & Education", text: "Support services, education opportunities and union awareness." },
      ],
      benefitsTitle: "Why Workers Join FIBUCA",
      benefits: [
        "Stronger voice through collective action",
        "Protection of workers’ rights and interests",
        "Guidance on disputes and employer relations",
        "Support on terms and workplace concerns",
      ],
      galleryTitle: "Company Gallery",
      gallerySubtitle: "Moments from union activities, meetings, field visits and community engagement.",
      galleryPhotos: [
        { src: "/images/gallery1.jpg", title: "Union Meeting" },
        { src: "/images/gallery2.jpg", title: "Workplace Visit" },
        { src: "/images/gallery3.jpg", title: "Member Training" },
        { src: "/images/gallery4.jpg", title: "Community Engagement" },
        { src: "/images/gallery5.jpg", title: "Labour Awareness Session" },
        { src: "/images/gallery6.jpg", title: "Leadership Forum" },
      ],
      leadershipTitle: "Professional Union Leadership",
      leadershipText:
        "A professional team focused on defending workers’ social and economic rights through unity, guidance and representation.",
      leadershipPoints: [
        "Transparent worker-focused leadership",
        "Organized support and representation",
        "Practical action on labour matters",
      ],
      contactTitle: "Contact Us",
      contactItems: [
        { title: "Email", value: "fibucatradeunion@gmail.com" },
        { title: "Phone", value: "+255 784 475 333" },
        { title: "Address", value: "Mahiwa/Lumumba Street, Plot No. 17 Block 73" },
      ],
      highlightsTitle: "Union Highlights",
      highlights: [
        "Clear worker representation across key sectors.",
        "Fast access to login, support and union contact.",
        "Modern responsive experience for all devices.",
      ],
      stats: [
        { value: "4+", label: "Key Service Areas" },
        { value: "24/7", label: "Easy Access to Information" },
        { value: "100%", label: "Worker-Focused Vision" },
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
      navHome: "Nyumbani",
      navAbout: "Kuhusu",
      navServices: "Huduma",
      navBenefits: "Faida",
      navGallery: "Picha",
      navLeadership: "Uongozi",
      navContact: "Mawasiliano",
      btnForm: "Wasilisha Fomu ya Chama",
      btnLogin: "Ingia kwa Mwanachama",
      btnContact: "Wasiliana na Ofisi ya Chama",
      heroBadge: "Tovuti Rasmi ya Chama",
      aboutTitle: "Kuhusu FIBUCA",
      aboutText1:
        "FIBUCA ni chama huru cha wafanyakazi kilichoanzishwa kulinda na kuendeleza maslahi ya kijamii na kiuchumi.",
      aboutText2:
        "Tunatetea haki kazini, ulinzi bora wa wafanyakazi na msaada wa vitendo kwa sekta mbalimbali.",
      aboutCards: [
        {
          title: "Uwakilishi wa Wafanyakazi",
          text: "Uwakilishi imara kwa wafanyakazi wa sekta za fedha, viwanda, benki na huduma.",
        },
        {
          title: "Msaada wa Kuaminika",
          text: "Mwongozo wazi, msaada wa vitendo na ufikiaji wa kisasa wa huduma za chama.",
        },
      ],
      servicesTitle: "Huduma Kuu za Chama",
      services: [
        { title: "Majadiliano ya Pamoja", text: "Mazungumzo kuhusu mishahara, mazingira na haki za kazi." },
        { title: "Ushauri wa Kisheria na Kazi", text: "Mwongozo kuhusu migogoro, haki za kazi na masuala ya ajira." },
        { title: "Ustawi na Elimu", text: "Huduma za msaada, elimu na uhamasishaji wa chama." },
      ],
      benefitsTitle: "Kwa Nini Wafanyakazi Hujiunga na FIBUCA",
      benefits: [
        "Sauti yenye nguvu kupitia umoja",
        "Ulinzi wa haki na maslahi ya wafanyakazi",
        "Mwongozo kwenye migogoro ya kazi",
        "Msaada kuhusu masharti na mazingira ya kazi",
      ],
      galleryTitle: "Galari ya Kampuni",
      gallerySubtitle: "Matukio ya chama, mikutano, ziara za kazini na ushirikiano wa jamii.",
      galleryPhotos: [
        { src: "/images/gallery1.jpg", title: "Mkutano wa Chama" },
        { src: "/images/gallery2.jpg", title: "Ziara Kazini" },
        { src: "/images/gallery3.jpg", title: "Mafunzo ya Wanachama" },
        { src: "/images/gallery4.jpg", title: "Ushirikiano wa Jamii" },
        { src: "/images/gallery5.jpg", title: "Kikao cha Uhamasishaji wa Kazi" },
        { src: "/images/gallery6.jpg", title: "Jukwaa la Uongozi" },
      ],
      leadershipTitle: "Uongozi wa Kitaalamu wa Chama",
      leadershipText:
        "Timu ya wataalamu inayolenga kulinda haki za kijamii na kiuchumi za wafanyakazi kupitia umoja na uwakilishi.",
      leadershipPoints: [
        "Uongozi wa wazi unaoweka wafanyakazi mbele",
        "Msaada na uwakilishi uliopangwa vizuri",
        "Hatua za vitendo kwenye masuala ya kazi",
      ],
      contactTitle: "Wasiliana Nasi",
      contactItems: [
        { title: "Barua Pepe", value: "info@fibucatradeunion.or.tz" },
        { title: "Simu", value: "+255 784 475 333" },
        { title: "Anwani", value: "Mahiwa/Lumumba Street, Plot No. 17 Block 73" },
      ],
      highlightsTitle: "Mambo Muhimu ya Chama",
      highlights: [
        "Uwakilishi wazi wa wafanyakazi katika sekta muhimu.",
        "Ufikiaji wa haraka wa kuingia, msaada na mawasiliano.",
        "Muonekano wa kisasa unaofanya vizuri kwenye vifaa vyote.",
      ],
      stats: [
        { value: "4+", label: "Maeneo Makuu ya Huduma" },
        { value: "24/7", label: "Ufikiaji Rahisi wa Taarifa" },
        { value: "100%", label: "Dira ya Wafanyakazi" },
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

  // Use context for language selection
  // (already imported and used at top)
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.45),transparent_24%),linear-gradient(135deg,#f7fbff_0%,#eef6ff_45%,#e9f2ff_100%)] text-slate-900">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-blue-200/70 bg-white/85 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <a href="#home" className="flex items-center gap-3">
            <img src="/images/logo-watermark.png" alt="FIBUCA logo" className="h-10 w-10 object-contain" />
            <div>
              <p className="text-lg font-bold tracking-tight text-blue-700">FIBUCA</p>
              <p className="hidden text-[11px] text-slate-500 sm:block">Trade Union Portal</p>
            </div>
          </a>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 lg:flex">
            <a href="#home" className="hover:text-blue-600">{t.navHome}</a>
            <a href="#about" className="hover:text-blue-600">{t.navAbout}</a>
            <a href="#services" className="hover:text-blue-600">{t.navServices}</a>
            <a href="#benefits" className="hover:text-blue-600">{t.navBenefits}</a>
            <a href="#gallery" className="hover:text-blue-600">{t.navGallery}</a>
            <a href="#leadership" className="hover:text-blue-600">{t.navLeadership}</a>
            <a href="#contact" className="hover:text-blue-600">{t.navContact}</a>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <Link
              to="/login"
              className="hidden rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-500 sm:inline-flex"
            >
              {t.btnLogin}
            </Link>
            <button
              ref={menuButtonRef}
              onClick={toggleMenu}
              className="rounded-lg border border-blue-200 p-2 text-slate-700 lg:hidden"
              aria-label="Open menu"
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
            className="fixed left-0 right-0 top-16 z-40 border-b border-blue-200 bg-white/95 px-6 py-6 shadow-lg backdrop-blur-xl lg:hidden"
          >
            <nav className="flex flex-col gap-4 text-slate-700">
              <a href="#home" onClick={closeMenu}>{t.navHome}</a>
              <a href="#about" onClick={closeMenu}>{t.navAbout}</a>
              <a href="#services" onClick={closeMenu}>{t.navServices}</a>
              <a href="#benefits" onClick={closeMenu}>{t.navBenefits}</a>
              <a href="#gallery" onClick={closeMenu}>{t.navGallery}</a>
              <a href="#leadership" onClick={closeMenu}>{t.navLeadership}</a>
              <a href="#contact" onClick={closeMenu}>{t.navContact}</a>

              <Link
                to="/login"
                onClick={closeMenu}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-bold text-white"
              >
                {t.btnLogin}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-16" />

      <section id="home" className="relative">
        <div className="relative h-[78vh] min-h-[560px] w-full overflow-hidden rounded-b-[2.25rem] bg-[#0b1f4d] lg:h-[90vh]">
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

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.22),transparent_28%),linear-gradient(90deg,rgba(7,19,53,0.88)_0%,rgba(10,34,88,0.62)_40%,rgba(10,34,88,0.16)_70%,rgba(10,34,88,0.06)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#081736]/85 via-transparent to-transparent" />

          <div className="relative mx-auto grid h-full max-w-7xl items-end gap-8 px-4 pb-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-10">
            <div className="max-w-3xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`hero-text-${activeSlide}`}
                  initial={{ opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 3, ease: "easeOut" }}
                >
                  <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100 backdrop-blur-md">
                    {t.heroBadge} • {heroSlides[activeSlide].eyebrow}
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
                </motion.div>
              </AnimatePresence>

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
                      ? "bg-white/88 text-blue-800 hover:bg-white"
                      : "cursor-not-allowed bg-white/60 text-slate-500"
                  }`}
                >
                  {t.btnForm}
                </Link>

                <button
                  onClick={handleContactClick}
                  className="rounded-xl border border-white/30 bg-[#0d2d70]/60 px-6 py-3 font-semibold text-white hover:bg-[#123987]/75"
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
            </div>

            <div className="hidden lg:flex lg:justify-end">
              <div className="w-full max-w-md rounded-[1.75rem] border border-white/15 bg-white/10 p-5 text-white shadow-2xl backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-100">{t.highlightsTitle}</p>

                <div className="mt-5 space-y-4">
                  {t.highlights.map((item, index) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <p className="text-2xl font-black text-white">{String(index + 1).padStart(2, "0")}</p>
                      <p className="mt-1 text-sm leading-6 text-blue-100">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {t.stats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl bg-white/10 p-3 text-center">
                      <p className="text-xl font-black text-white">{stat.value}</p>
                      <p className="mt-1 text-[11px] leading-4 text-blue-100">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-white/75 px-3 py-2 text-blue-800 backdrop-blur hover:bg-white"
            aria-label="Previous slide"
          >
            ‹
          </button>

          <button
            onClick={() => setActiveSlide((prev) => (prev + 1) % heroSlides.length)}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-white/75 px-3 py-2 text-blue-800 backdrop-blur hover:bg-white"
            aria-label="Next slide"
          >
            ›
          </button>
        </div>
      </section>

      <section id="about" className="px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-blue-100 bg-white/90 p-7 shadow-[0_20px_60px_rgba(37,99,235,0.08)] sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">{t.navAbout}</p>
            <h3 className="mt-3 text-3xl font-black tracking-tight text-blue-900">{t.aboutTitle}</h3>
            <p className="mt-5 text-slate-700">{t.aboutText1}</p>
            <p className="mt-3 text-slate-600">{t.aboutText2}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {t.stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-2xl font-black text-blue-700">{stat.value}</p>
                  <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            {t.aboutCards.map((card, index) => (
              <div
                key={card.title}
                className="rounded-[1.75rem] border border-blue-100 bg-white/85 p-6 shadow-[0_18px_40px_rgba(59,130,246,0.08)]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-lg font-black text-white">
                    {index + 1}
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">{card.title}</h4>
                </div>
                <p className="mt-4 text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">{t.navServices}</p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-blue-900">{t.servicesTitle}</h3>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {t.services.map((service, index) => (
              <div
                key={service.title}
                className="group rounded-[1.75rem] border border-blue-100 bg-white/90 p-7 shadow-[0_18px_40px_rgba(59,130,246,0.08)] transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-700">
                  0{index + 1}
                </div>
                <h4 className="mt-5 text-xl font-bold text-slate-900">{service.title}</h4>
                <p className="mt-3 leading-7 text-slate-600">{service.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="benefits" className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white to-blue-50/80 p-7 shadow-[0_18px_50px_rgba(59,130,246,0.08)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">{t.navBenefits}</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-blue-900">{t.benefitsTitle}</h3>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {t.benefits.map((benefit, index) => (
              <div key={benefit} className="flex items-start gap-4 rounded-2xl border border-blue-100 bg-white/90 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-black text-white">
                  {index + 1}
                </div>
                <p className="text-slate-700">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="gallery" className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">{t.navGallery}</p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-blue-900">{t.galleryTitle}</h3>
            <p className="mt-2 text-slate-600">{t.gallerySubtitle}</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {t.galleryPhotos.map((photo, i) => (
              <article
                key={`${photo.src}-${i}`}
                className="group overflow-hidden rounded-[1.5rem] border border-blue-100 bg-white shadow-[0_18px_40px_rgba(59,130,246,0.08)]"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={photo.src}
                    alt={photo.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-950/45 via-transparent to-transparent" />
                </div>
                <div className="p-4">
                  <h4 className="text-base font-bold text-slate-900">{photo.title}</h4>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="leadership" className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 p-8 text-white shadow-[0_25px_60px_rgba(8,47,73,0.3)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">{t.navLeadership}</p>
              <h3 className="mt-2 text-3xl font-black tracking-tight">{t.leadershipTitle}</h3>
              <p className="mt-4 max-w-2xl text-blue-100">{t.leadershipText}</p>
            </div>

            <div className="grid gap-4">
              {t.leadershipPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-white/10 bg-white/10 p-4 text-blue-50 backdrop-blur-sm"
                >
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">{t.navContact}</p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-blue-900">{t.contactTitle}</h3>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {t.contactItems.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] border border-blue-100 bg-white/90 p-6 shadow-[0_18px_40px_rgba(59,130,246,0.08)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">{item.title}</p>
                <p className="mt-3 text-slate-700">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-500">
              {t.btnLogin}
            </Link>
            <Link
              to="/client-form"
              onClick={handleClientFormClick}
              className={`rounded-xl px-6 py-3 font-semibold ${
                isClientFormAccessible()
                  ? "bg-white text-blue-800 shadow-sm ring-1 ring-blue-200 hover:bg-blue-50"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
              }`}
            >
              {t.btnForm}
            </Link>
            <button
              onClick={handleContactClick}
              className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-3 font-semibold text-blue-700 hover:bg-blue-100"
            >
              {t.btnContact}
            </button>
          </div>
        </div>
      </section>

      <footer className="mt-10 border-t border-blue-950 bg-blue-950 px-4 py-6 text-center text-xs text-white">
        © {new Date().getFullYear()} {t.footer}
      </footer>
    </div>
  );
}