import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className="hero">
      <motion.h1
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Designing AI Solutions & Building Data-Driven Systems
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        Jr Python Developer | AI & Data Science Enthusiast
      </motion.p>

      <motion.div
        className="social-links"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <a href="https://github.com/AnujSengundar" target="_blank">
          GitHub
        </a>
        <a
          href="https://www.linkedin.com/in/anuj-sengundar-7101b2228/"
          target="_blank"
        >
          LinkedIn
        </a>
        <a href="mailto:sengundaranuj@gmail.com">Email</a>
      </motion.div>

      <motion.div
        className="cta-buttons"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <a href="/assets/AnujSengundarResume.pdf" className="btn">
          Download Resume
        </a>
        <a href="#contact" className="btn btn-outline">
          Say Hello 👋
        </a>
      </motion.div>
    </section>
  );
};

export default Hero;
