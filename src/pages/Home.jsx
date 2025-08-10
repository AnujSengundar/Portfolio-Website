import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Projects from "../components/Projects";
import WorkExperience from "../components/WorkExperience";
import Footer from "../components/Footer";
import "../styles/WorkExperience.css";
import "../styles/Navbar.css";
const Home = () => {
  return (
    <>
      <Navbar />
      <Hero />
      <Projects />
      <WorkExperience />
      <Footer />
    </>
  );
};

export default Home;
