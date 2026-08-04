import "./Hero.css";

import HeroCard from "./HeroCard";

import memory1 from "../../assets/images/1.jpg";
import memory2 from "../../assets/images/2.jpg";
import memory3 from "../../assets/images/3.jpg";

const Hero = () => {
  return (
    <section className="hero">

      <div className="overlay" />

      <div className="hero-content">

        <div className="hero-left">

          <h1>
            HAPPY
            <br />

            <span>FRIENDSHIP</span>

            <br />

            DAY
          </h1>

          <p>
            Some friendships are written in memories,
            others become a part of who we are.
          </p>

          <button>
            Open Our Story →
          </button>

        </div>

        <div className="hero-right">

          <HeroCard
            image={memory1}
            title="Our First Meeting"
          />

          <HeroCard
            image={memory2}
            title="Best Memory"
          />

          <HeroCard
            image={memory3}
            title="Forever ❤️"
          />

        </div>

      </div>

      <div className="scroll-indicator">
        SCROLL
      </div>

    </section>
  );
};

export default Hero;