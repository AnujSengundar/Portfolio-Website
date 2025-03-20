import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Projects = () => {
  return (
    <>
      <Navbar />
      <section className="projects-page">
        <h1>My Projects</h1>
        <p>Here are some of my best works.</p>
        {/* Add project components here */}
      </section>
      <Footer />
    </>
  );
};

export default Projects;
