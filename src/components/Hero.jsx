const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-content">
        <img
          src="/assets/profile.jpg"
          alt="Anuj Sengundar"
          className="profile-pic"
        />
        <h1>
          Designing AI Solutions: <br />{" "}
          <span className="highlight">Building Data-Driven Systems.</span>
        </h1>
        <p>
          {" "}
          I am a <strong>Jr Python Developer & Data Scientist</strong>
        </p>
        <p>
          With Experience In
          <strong>
            {" "}
            Python, Django, React, NLP models, and AI-powered solutions.
          </strong>
        </p>
        <p>
          Passionate about{" "}
          <strong>machine learning & backend development</strong>.
        </p>

        <div className="social-links">
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
          <a href="mailto:anujsengundar@gmail.com">Email</a>
        </div>

        <div className="cta-buttons">
          <a href="src/assets/resume.pdf" className="btn">
            Download Resume
          </a>
          <a href="#contact" className="btn btn-outline">
            Say Hello 👋
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
