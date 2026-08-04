import { motion } from "framer-motion";

import Navbar from "../parts/navbar";
import HeroCard from "../parts/HeroCard";

import memory1 from "../assets/images/1.jpg";
import memory2 from "../assets/images/2.jpg";
import memory3 from "../assets/images/3.jpg";

import "./LandingPage.css";

const LandingPage1 = () => {
  return (
    <>
      <Navbar />

      <main className="landing-page">
        <section className="hero">

          <div className="hero-overlay" />

          <div className="hero-content">

            {/* Left Section */}

            <motion.div
              className="hero-left"
              initial={{ opacity: 0, x: -80 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              <span className="subtitle">
                A small gift made with ❤️
              </span>

              <h1>
                HAPPY
                <br />
                <span>FRIENDSHIP</span>
                <br />
                DAY
              </h1>

              <p>
                Every friendship has a story.
                <br />
                This is ours.
              </p>

              <button className="hero-btn">
                Begin the Journey →
              </button>
            </motion.div>

            {/* Right Cards */}

            <motion.div
              className="hero-right"
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              <HeroCard
                image={memory1}
                title="Where It All Began"
              />

              <HeroCard
                image={memory2}
                title="Our Best Memories"
              />

              <HeroCard
                image={memory3}
                title="Forever Friends ❤️"
              />
            </motion.div>

          </div>

          {/* Scroll */}

          <motion.div
            className="scroll-indicator"
            animate={{
              y: [0, 12, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
            }}
          >
            SCROLL
          </motion.div>

        </section>
      </main>
    </>
  );
};

export default LandingPage1;