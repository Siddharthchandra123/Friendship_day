import "./Hero.css";

interface HeroCardProps {
  image: string;
  title: string;
}

const HeroCard: React.FC<HeroCardProps> = ({ image, title }) => {
  return (
    <div className="hero-card">
      <img src={image} alt={title} />
      <div className="hero-card-title">{title}</div>
    </div>
  );
};

export default HeroCard;