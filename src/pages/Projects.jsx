import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Projects from "../components/Projects"; // ✅ use new component

const ProjectsPage = () => {
  return (
    <>
      <Navbar />
      <Projects />
      <Footer />
    </>
  );
};

export default ProjectsPage;
