import { motion } from "framer-motion";

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};
const itemUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const Hero = () => {
  return (
    <section className="hero" aria-label="Hero section">
      <motion.div
        className="hero-inner"
        variants={container}
        initial="hidden"
        animate="visible"
        whileHover={{ scale: 1.01 }}
      >
        {/* Name */}
        <motion.h1 variants={itemUp}>Anuj Sengundar</motion.h1>

        <motion.h2 variants={itemUp}>
          Architecting AI Solutions • Engineering Data-Driven Backends
        </motion.h2>

        <motion.p variants={itemUp} className="intro-text">
          I’m <strong>Anuj Sengundar</strong>, a <strong>Backend</strong> &{" "}
          <strong>Data Specialist</strong> who builds scalable, production-ready
          systems. My work spans from robust ETL pipelines to intelligent,
          language-driven AI applications. I work with tools like{" "}
          <strong>LangChain</strong> for orchestration,{" "}
          <strong>LangGraph</strong> for stateful agent workflows,{" "}
          <strong>Ollama</strong> for local LLM hosting, and frameworks such as{" "}
          <strong>Django</strong> and <strong>FastAPI</strong>. My goal is to
          deliver high-performance AI solutions that are reliable, secure, and
          ready for real-world use — from data ingestion all the way to
          inference.
        </motion.p>

        {/* Social links */}
        <motion.div className="social-links" variants={itemUp}>
          <a
            href="https://github.com/AnujSengundar"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/anuj-sengundar-7101b2228/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a href="mailto:sengundaranuj@gmail.com">Email</a>
        </motion.div>

        {/* CTAs */}
        <motion.div className="cta-buttons" variants={itemUp}>
          <a href="/assets/AnujSengundarResume.pdf" className="btn" download>
            Download Resume
          </a>
          <a href="#contact" className="btn btn-outline">
            Say Hello 👋
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
