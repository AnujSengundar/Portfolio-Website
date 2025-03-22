import { motion } from "framer-motion";

const projectVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

const Projects = () => {
  return (
    <section className="projects">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        Selected Projects
      </motion.h2>

      <motion.div
        className="projects-list"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.2 } } }}
      >
        {[
          {
            title: "AI-Based Quiz Platform",
            description: "AI-powered quiz generator with LangChain & Django.",
            link: "https://github.com/AnujSengundar/ai-quiz-app",
          },
          {
            title: "Movie Recommender System",
            description: "Personalized movie recommendations using ML models.",
            link: "https://github.com/AnujSengundar/movie-recommender",
          },
          {
            title: "Netflix Dashboard",
            description: "Tableau dashboard for analyzing Netflix trends.",
            link: "https://github.com/AnujSengundar/netflix-dashboard",
          },
        ].map((project, index) => (
          <motion.div
            key={index}
            className="project-card"
            variants={projectVariants}
          >
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <a href={project.link} target="_blank">
              View Project
            </a>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default Projects;
