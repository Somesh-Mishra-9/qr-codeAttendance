import React, { useEffect, useState } from "react";

interface LoadingSpinnerProps {
  message?: string;
}

const quotes = [
  "It's not a bug, it's a feature.",
  "Works on my machine!",
  "My code works. I have no idea why.",
];

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Searching MIT IT WG records 🔍",
}) => {
  const [currentQuote, setCurrentQuote] = useState("");
  const [shown, setShown] = useState<string[]>([]);

  const getQuote = () => {
    if (shown.length === quotes.length) {
      setShown([]);
      return quotes[Math.floor(Math.random() * quotes.length)];
    }
    let q: string;
    do {
      q = quotes[Math.floor(Math.random() * quotes.length)];
    } while (shown.includes(q));
    setShown((prev) => [...prev, q]);
    return q;
  };

  useEffect(() => {
    setCurrentQuote(getQuote());
    const interval = setInterval(() => {
      setCurrentQuote(getQuote());
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="modern-loading-container">
      <div className="modern-spinner"></div>
      <div className="quote-container">
        <span className="typewriter-text">{currentQuote}</span>
      </div>
      <div className="loading-tagline">{message}</div>
    </div>
  );
};

export default LoadingSpinner;
