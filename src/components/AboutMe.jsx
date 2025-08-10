import {
  FaPython,
  FaDatabase,
  FaCloud,
  FaBrain,
  FaChartLine,
} from "react-icons/fa";
import {
  SiDjango,
  SiFastapi,
  SiApachekafka,
  SiLangchain,
} from "react-icons/si";
import { TbTopologyStar3 } from "react-icons/tb"; // For LangGraph
import { PiCubeTransparentFill } from "react-icons/pi"; // For Ollama

const skills = [
  { icon: <FaPython />, label: "Advanced Python Programming" },
  { icon: <SiDjango />, label: "Backend Development (Django & FastAPI)" },
  { icon: <FaBrain />, label: "Data Science & Machine Learning" },
  {
    icon: <FaChartLine />,
    label:
      "Data Analysis & Visualization (Pandas, NumPy, Matplotlib, Tableau, Power BI)",
  },
  {
    icon: <SiApachekafka />,
    label: "Data Engineering (Apache Kafka, Spark, Airflow, ETL Pipelines)",
  },
  {
    icon: <FaDatabase />,
    label: "Database Design & Optimization (PostgreSQL, MySQL, MongoDB)",
  },
  { icon: <SiLangchain />, label: "LLM Application Development (LangChain)" },
  { icon: <TbTopologyStar3 />, label: "AI Workflow Orchestration (LangGraph)" },
  { icon: <PiCubeTransparentFill />, label: "Local AI Deployment (Ollama)" },
  { icon: <FaCloud />, label: "Cloud Platforms (AWS, Google Cloud, Azure)" },
];

const certifications = [
  "Supervised Machine Learning (DeepLearning.ai)",
  "OCR Masterclass in Python (Udemy)",
  "Google Cloud Fundamentals (Coursera)",
];

const AboutMe = () => {
  return (
    <section className="about-section">
      <h2 className="section-title">About Me</h2>
      <p className="intro-text">
        I'm <strong>Anuj Sengundar</strong>, a Backend & Data Specialist with a
        proven ability to design, build, and deploy intelligent, data-driven
        systems. My expertise spans{" "}
        <strong>
          Data Analysis, Data Science, LLM Application Development, Data
          Engineering, and High-Performance Backend Solutions
        </strong>
        . I focus on delivering production-ready, scalable, and future-proof
        applications that seamlessly bridge the gap between complex data
        pipelines and real-world business impact.
      </p>

      <div className="about-grid">
        {/* Skills */}
        <article className="about-card">
          <h3>Core Expertise</h3>
          <ul>
            {skills.map((skill, index) => (
              <li key={index}>
                {skill.icon} {skill.label}
              </li>
            ))}
          </ul>
        </article>

        {/* Certifications */}
        <article className="about-card">
          <h3>Certifications</h3>
          <ul>
            {certifications.map((cert, index) => (
              <li key={index}>{cert}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
};

export default AboutMe;
