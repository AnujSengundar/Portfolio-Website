import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const projects = [
  {
    title: "AI-Based Quiz Platform",
    description: "An AI-powered quiz generator using LangChain & Django.",
    image: "/assets/quiz-app.jpg",
    link: "https://github.com/AnujSengundar/ai-quiz-app",
  },
  {
    title: "Movie Recommender System",
    description: "ML-based personalized movie recommendations.",
    image: "/assets/movie-recommender.jpg",
    link: "https://github.com/AnujSengundar/movie-recommender",
  },
  {
    title: "Netflix Dashboard",
    description: "Interactive Tableau dashboard for Netflix analytics.",
    image: "/assets/netflix-dashboard.jpg",
    link: "https://github.com/AnujSengundar/netflix-dashboard",
  },
  {
    title: "Real-Time Sentiment Analysis",
    description: "Twitter & Reddit sentiment analysis using Kafka & Spark.",
    image: "/assets/sentiment-analysis.jpg",
    link: "https://github.com/AnujSengundar/sentiment-analysis",
  },
  {
    title: "Freelancer Recommendation System",
    description: "ML-based system to match freelancers with clients.",
    image: "/assets/freelancer-recommendation.jpg",
    link: "https://github.com/AnujSengundar/freelancer-recommendation",
  },
  {
    title: "Tic Tac Toe AI",
    description: "Python game with Minimax Algorithm AI.",
    image: "/assets/tic-tac-toe.jpg",
    link: "https://github.com/AnujSengundar/tic-tac-toe",
  },
];

const Projects = () => {
  return (
    <>
      <Navbar />
      <section className="projects-page">
        <h1>My Projects</h1>
        <p>Here are some of my best works.</p>

        <div className="projects-grid">
          {projects.map((project, index) => (
            <div key={index} className="project-card">
              <img src={project.image} alt={project.title} />
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <a href={project.link} target="_blank" className="btn">
                View Project
              </a>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </>
  );
};

export default Projects;
