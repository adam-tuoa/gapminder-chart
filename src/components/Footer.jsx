import { FaGithub, FaHome } from "react-icons/fa";
import "./Footer.css";

export default function Footer({ attribution, links }) {
  const isEmbedded =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("embed") === "1";

  if (isEmbedded) return null;

  const iconMap = {
    github: <FaGithub size={20} />,
    home: <FaHome size={20} />,
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-attribution">
          Built as part of{" "}
          <a href={attribution.href} target="_blank" rel="noopener noreferrer">
            {attribution.text}
          </a>
        </div>
        <div className="footer-links">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              title={link.label}
            >
              {iconMap[link.icon] || link.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
