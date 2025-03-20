const Projects = () => {
  return (
    <section className="projects">
      <h2>Selected Projects</h2>

      <div className="project-card">
        <h3>AI-Based Quiz Application</h3>
        <p>
          Built an AI-powered quiz app using React, Django, Langchain, and Groq.
        </p>
        <a href="https://github.com/AnujSengundar/ai-quiz-app" target="_blank">
          View Project
        </a>
      </div>

      <div className="project-card">
        <h3>Real-Time Sentiment Analysis</h3>
        <p>
          Implemented Kafka + Spark Streaming to analyze Twitter & Reddit
          sentiment in real-time.
        </p>
        <a
          href="https://github.com/AnujSengundar/sentiment-analysis"
          target="_blank"
        >
          View Project
        </a>
      </div>

      <div className="project-card">
        <h3>Freelancer Recommendation System</h3>
        <p>
          Developed an ML-based recommendation system to match freelancers with
          clients.
        </p>
        <a
          href="https://github.com/AnujSengundar/freelancer-recommendation"
          target="_blank"
        >
          View Project
        </a>
      </div>
    </section>
  );
};

export default Projects;
