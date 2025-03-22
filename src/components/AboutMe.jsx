const AboutMe = () => {
  return (
    <section className="about-section">
      <h2>About Me</h2>
      <p>
        I'm <strong>Anuj Sengundar</strong>, a Jr Python Developer & Data
        Scientist passionate about AI-powered solutions.
      </p>
      <p>
        With expertise in Python, Django, React, and NLP models, I specialize in
        building scalable AI applications.
      </p>

      <div className="skills">
        <h3>My Skills</h3>
        <ul>
          <li>Python & Django</li>
          <li>React & Next.js</li>
          <li>FastAPI & REST APIs</li>
          <li>Machine Learning & NLP</li>
          <li>Data Engineering (Kafka, Spark, Redis)</li>
          <li>PostgreSQL, MySQL, MongoDB</li>
          <li>LangChain & Vector Databases</li>
          <li>Tableau, AWS, Google Cloud</li>
        </ul>
      </div>

      <div className="skills">
        <h3>Certifications</h3>
        <ul>
          <li>Supervised Machine Learning (DeepLearning.ai)</li>
          <li>OCR Masterclass in Python (Udemy)</li>
          <li>Google Cloud Fundamentals (Coursera)</li>
        </ul>
      </div>
    </section>
  );
};

export default AboutMe;
