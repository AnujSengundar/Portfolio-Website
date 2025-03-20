import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Contact = () => {
  return (
    <>
      <Navbar />
      <section className="contact-page">
        <h1>Let's Work Together</h1>
        <p>
          Feel free to reach out for collaborations or just a friendly hello.
        </p>
        {/* Add Contact Form */}
      </section>
      <Footer />
    </>
  );
};

export default Contact;
