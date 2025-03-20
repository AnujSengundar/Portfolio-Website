const AboutMe = () => {
  return (
    <section className="about-section">
      <div className="container">
        <h2>About Me</h2>
        <p className="about-text">
          I'm <strong>Anuj Sengundar</strong>, a passionate Data Scientist &
          Backend Developer with expertise in Python, Django, FastAPI, and
          AI-powered solutions. I have experience in building AI applications,
          real-time data processing, and chatbot development.
        </p>

        <p className="about-text">
          My interest lies in Machine Learning, Data Engineering, and NLP
          models. I enjoy solving complex problems using{" "}
          <strong>AI & Data Science</strong>
          and love contributing to <strong>open-source projects</strong>.
        </p>

        <div className="skills">
          <h3>My Skills</h3>
          <ul>
            <li>Python & Django</li>
            <li>FastAPI & REST APIs</li>
            <li>Data Engineering (Kafka, Spark, Redis)</li>
            <li>Machine Learning & NLP</li>
            <li>React & Frontend Basics</li>
            <li>PostgreSQL & MongoDB</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default AboutMe;
