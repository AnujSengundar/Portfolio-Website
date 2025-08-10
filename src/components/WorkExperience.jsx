const WorkExperience = () => {
  return (
    <section className="work-experience">
      <h2>Work Experience</h2>

      <div className="experience-card">
        <h3>Junior Python Developer</h3>
        <p>Infusion Analysts | December 2024 – Present</p>
        <p>
          Leading the development of <strong>data-intensive pipelines</strong>{" "}
          and
          <strong> AI-driven analytics</strong> powering enterprise-scale
          solutions.
        </p>
        <ul>
          <li>
            Engineered <strong>real-time streaming pipelines</strong> with
            <strong> Apache Spark</strong> and <strong>Kafka</strong>,
            processing billions of records with sub-second latency for
            mission-critical analytics.
          </li>
          <li>
            Designed and deployed{" "}
            <strong>modular data ingestion frameworks</strong> integrating REST
            APIs, SQL/NoSQL databases, and cloud storage, enabling seamless
            cross-platform data flow.
          </li>
          <li>
            Implemented <strong>scalable ML inference microservices</strong>{" "}
            using
            <strong> LangChain</strong> and <strong>FastAPI</strong>, reducing
            inference latency by 45%.
          </li>
        </ul>
      </div>

      <div className="experience-card">
        <h3>Junior Software Developer</h3>
        <p>TechTic Technolab Pvt Ltd | February 2024 – December 2024</p>
        <p>
          Delivered <strong>AI-powered applications</strong> and{" "}
          <strong>full-stack solutions</strong> with a focus on backend
          scalability, data engineering, and advanced analytics.
        </p>
        <ul>
          <li>
            Built <strong>context-aware conversational AI tools</strong>{" "}
            leveraging LangChain, vector databases, and custom embeddings to
            boost query accuracy by 30%.
          </li>
          <li>
            Created an <strong>Image-to-Neon Converter</strong> using Python and
            OpenCV, streamlining marketing content creation workflows.
          </li>
          <li>
            Optimized <strong>React–Django–Grafana</strong> dashboards,
            improving data visualization performance for real-time metrics
            tracking.
          </li>
          <li>
            Developed a <strong>Unity-based AR measurement application</strong>{" "}
            with ARCore SDK, achieving ±2mm measurement precision for industrial
            use cases.
          </li>
        </ul>
      </div>

      <div className="experience-card">
        <h3>Software Developer Intern</h3>
        <p>Techmicra IT Solutions | September 2023 – November 2023</p>
        <ul>
          <li>
            Developed a <strong>real-time quiz platform</strong> using Django
            and React, featuring live scoring and advanced analytics dashboards.
          </li>
          <li>
            Integrated REST APIs and WebSockets to deliver seamless, interactive
            user experiences.
          </li>
        </ul>
      </div>

      <div className="experience-card">
        <h3>Software Developer Intern</h3>
        <p>Q-Spiders Training | June 2023 – September 2023</p>
        <ul>
          <li>
            Gained hands-on experience in{" "}
            <strong>web development, software lifecycle management</strong>, and
            debugging enterprise-grade applications.
          </li>
          <li>
            Built small-scale <strong>full-stack projects</strong> in Python,
            JavaScript, and SQL as part of accelerated development training.
          </li>
        </ul>
      </div>
    </section>
  );
};

export default WorkExperience;
