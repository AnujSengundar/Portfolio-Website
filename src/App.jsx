import { useState } from "react";
import { FiArrowDownRight, FiArrowUpRight, FiGithub, FiLinkedin, FiMenu, FiMessageSquare, FiX } from "react-icons/fi";
import resume from "./assets/resume.pdf";

const projects = [
  { number: "01", category: "AI / REAL ESTATE ANALYTICS", title: "SARA Chatbot", description: "A structured RAG and natural-language-to-SQL pipeline that translates portfolio questions into grounded SQL Server queries, with KPI matching, entity resolution, and safeguards against duplicate totals and join fan-out.", tools: ["Python", "Structured RAG", "SQL Server"], visual: "QUERY → CONTEXT → INSIGHT", featured: true },
  { number: "02", category: "DATA ENGINEERING", title: "Vidaa data platform", description: "Kafka and PySpark pipelines with AWS services and Airflow orchestration, including a multi-source aggregator and data quality validation.", tools: ["Kafka", "PySpark", "AWS", "Airflow"], visual: "INGEST / TRANSFORM / DELIVER" },
  { number: "03", category: "APPLIED AI", title: "AI quiz & document RAG", description: "LLM-assisted quiz generation with personalized learning, alongside semantic document retrieval using ChromaDB and FAISS.", tools: ["LangChain", "LangGraph", "FAISS", "FastAPI"], visual: "RETRIEVE / REASON / RESPOND" },
  { number: "04", category: "ANALYTICS", title: "ADB Sov-Ops", description: "Azure Data Factory integrations and Power BI reporting workflows that make enterprise data easier to explore and use.", tools: ["Azure Data Factory", "Power BI", "SQL"], visual: "CONNECT / MODEL / VISUALIZE" },
  { number: "05", category: "COMPUTER VISION", title: "Image-to-neon converter", description: "An image-processing workflow using OpenCV to transform images into neon-style visuals.", tools: ["Python", "OpenCV", "Computer vision"], visual: "IMAGE / EDGES / COLOR" },
  { number: "06", category: "GENERATIVE AI", title: "CreateBuzz", description: "An AI image-generation application combining Gemini-powered prompts with diffusion models.", tools: ["Gemini API", "Stable Diffusion", "FastAPI"], visual: "PROMPT / GENERATE / CREATE" },
];
const experience = [
  { period: "APR 2026 — PRESENT", role: "Software Developer", company: "Apex Group · TIGRE", detail: "Developing SARA’s structured-query module for real-estate analytics, including KPI matching, SQL safeguards, testing, and latency optimization." },
  { period: "JAN 2025 — APR 2026", role: "Software Development Engineer", company: "Infusion Analysts", detail: "Built Kafka and PySpark ETL pipelines, an Airflow aggregator, Azure reporting workflows, and AI image-generation features." },
  { period: "FEB 2024 — DEC 2024", role: "Software Development Engineer", company: "TechTic Technolab", detail: "Developed Django and FastAPI services, LLM-assisted quiz and document retrieval applications, and image-processing features." },
  { period: "JUN 2023 — DEC 2023", role: "Software Development Intern", company: "Techmicra IT Solutions", detail: "Built a Django and PostgreSQL quiz application with authentication, CRUD APIs, and Docker containerization." },
];
const skills = [
  { title: "Backend", items: "Python · SQL · FastAPI · Django · Flask · REST APIs" },
  { title: "AI & ML", items: "Structured RAG · LangChain · LangGraph · ChromaDB · FAISS · scikit-learn" },
  { title: "Data systems", items: "Kafka · PySpark · Airflow · SQL Server · PostgreSQL · DynamoDB" },
  { title: "Cloud & tools", items: "AWS · Azure Data Factory · Docker · Kubernetes · Git · Power BI" },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return <main>
    <header className="site-header">
      <a className="brand" href="#top" onClick={closeMenu} aria-label="Anuj Sengundar home">AS<span>.</span></a>
      <span className="header-caption">SOFTWARE DEVELOPER / AHMEDABAD</span>
      <button className="menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="navigation">{menuOpen ? <FiX /> : <FiMenu />}</button>
      <nav id="navigation" className={menuOpen ? "nav-links nav-links--open" : "nav-links"} aria-label="Primary navigation">
        <a href="#about" onClick={closeMenu}>About</a><a href="#projects" onClick={closeMenu}>Work</a><a href="#experience" onClick={closeMenu}>Experience</a><a className="nav-contact" href="#contact" onClick={closeMenu} aria-label="Go to contact section"><FiMessageSquare aria-hidden="true" /></a>
      </nav>
    </header>
    <section className="hero section-shell" id="top">
      <div className="hero-topline"><span>PORTFOLIO / 2026</span><span>PYTHON · AI · DATA</span></div>
      <div className="hero-main"><div><p className="eyebrow"><span /> Hello, I’m Anuj Sengundar</p><h1>Python, data<br />&amp; <em>thoughtful AI.</em></h1></div>
      <div className="hero-aside"><p>I build backend services, data pipelines, and AI applications.</p><a href="#projects">Explore selected work <FiArrowDownRight /></a></div></div>
      <div className="hero-bottom"><p>SOFTWARE DEVELOPER<br /><span>BASED IN AHMEDABAD, INDIA</span></p><a href={resume} download="Anuj-Sengundar-Resume.pdf">Download résumé <FiArrowDownRight /></a></div>
    </section>
    <section className="about section-shell" id="about"><div className="section-kicker"><span>01 / ABOUT</span><span>A LITTLE INTRODUCTION</span></div><div className="about-layout"><h2>A little about<br /><em>what I do.</em></h2><div><p className="about-lead">I’m a software developer based in Ahmedabad, working with Python, data, and AI.</p><p>At Apex Group, I work on real-estate analytics and structured RAG. Previously, I built data pipelines, APIs, and AI applications at Infusion Analysts and TechTic.</p><div className="about-meta"><span>EDUCATION</span><strong>B.E. Computer Science Engineering</strong><small>Gujarat Technological University · 2020–2024</small></div></div></div></section>
    <section className="projects section-shell" id="projects"><div className="section-kicker"><span>02 / SELECTED WORK</span><span>PROJECTS & CONTRIBUTIONS</span></div><div className="section-heading"><h2>Selected<br /><em>projects.</em></h2><p>A few projects and contributions across backend engineering, data, and AI.</p></div><div className="project-grid">{projects.map((project) => <article className={`project-card ${project.featured ? "project-card--featured" : ""}`} key={project.number}><div className="project-card-top"><span>{project.number} / {project.category}</span><FiArrowUpRight /></div><div className="project-art" aria-hidden="true"><div className="art-orbit art-orbit-one" /><div className="art-orbit art-orbit-two" /><span>{project.visual}</span></div><div className="project-content"><h3>{project.title}</h3><p>{project.description}</p><div className="tags">{project.tools.map((tool) => <span key={tool}>{tool}</span>)}</div></div></article>)}</div><a className="github-link" href="https://github.com/AnujSengundar" target="_blank" rel="noreferrer">Explore more on GitHub <FiArrowUpRight /></a></section>
    <section className="experience section-shell" id="experience"><div className="section-kicker"><span>03 / EXPERIENCE</span><span>WORK HISTORY</span></div><div className="section-heading"><h2>Where I’ve<br /><em>worked.</em></h2><p>My experience across software development, analytics, and data engineering.</p></div><div className="timeline">{experience.map((item) => <article className="timeline-item" key={item.company}><p className="timeline-period">{item.period}</p><div><h3>{item.role}</h3><p className="timeline-company">{item.company}</p></div><p className="timeline-detail">{item.detail}</p></article>)}</div></section>
    <section className="toolkit section-shell"><div className="section-kicker"><span>04 / TOOLKIT</span><span>HOW I WORK</span></div><div className="toolkit-layout"><h2>Tools I<br /><em>work with.</em></h2><div className="skills-grid">{skills.map((skill) => <div className="skill" key={skill.title}><h3>{skill.title}</h3><p>{skill.items}</p></div>)}</div></div><p className="certification">ALSO: SUPERVISED MACHINE LEARNING SPECIALIZATION · DEEPLEARNING.AI</p></section>
    <section className="contact section-shell" id="contact"><div className="section-kicker"><span>05 / GET IN TOUCH</span><span>SAY HELLO</span></div><h2>Let’s build<br /><em>something useful.</em></h2><div className="contact-bottom"><a className="contact-email" href="mailto:sengundaranuj@gmail.com">sengundaranuj@gmail.com <FiArrowUpRight /></a><p>Have a project or opportunity in mind? Get in touch.</p></div></section>
    <footer className="site-footer"><span>© {new Date().getFullYear()} ANUJ SENGUNDAR</span><span>AHMEDABAD, INDIA</span><div><a href="https://github.com/AnujSengundar" target="_blank" rel="noreferrer"><FiGithub /> GitHub</a><a href="https://www.linkedin.com/in/anuj-sengundar-7101b2228/" target="_blank" rel="noreferrer"><FiLinkedin /> LinkedIn</a></div></footer>
  </main>;
}
export default App;
