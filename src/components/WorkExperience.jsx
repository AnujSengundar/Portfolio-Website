const WorkExperience = () => {
  return (
    <section className="work-experience">
      <h2>Work Experience</h2>

      <div className="experience-card">
        <h3>Junior Python Developer</h3>
        <p>Infusion Analysts | December 2024 - Present</p>
        <p>
          Working Data Science and Data Engineering projects using Spark and
          Kafka
        </p>
      </div>

      <div className="experience-card">
        <h3>Junior Software Developer</h3>
        <p>TechTic Technolab Pvt Ltd | February 2024 - December 2024</p>
        <p>
          Developed AI-powered applications using Python, Django, LangChain, and
          vector databases.
        </p>
        <>
          <p>
            Built an <strong>image-to-neon converter</strong> (Python, OpenCV)
            for creative campaigns.
          </p>
          <p>
            Maintained and optimized a <strong>full-stack project</strong>{" "}
            (React, Django, Grafana).
          </p>
          <p>
            Developed a <strong>Unity-based AR measurement app</strong> (ARCore
            SDK).
          </p>
        </>
      </div>

      <div className="experience-card">
        <h3>Software Developer Intern</h3>
        <p>Techmicra IT Solutions | September 2023 - November 2023</p>
        <p>
          Developed a <strong>Quiz Application</strong> using Django and React.
        </p>
      </div>

      <div className="experience-card">
        <h3>Software Developer Intern</h3>
        <p>Q-Spiders Training | June 2023 - September 2023</p>
        <p>
          Acquired hands-on experience in{" "}
          <strong>Web Development & Software Lifecycles</strong>.
        </p>
      </div>
    </section>
  );
};

export default WorkExperience;
