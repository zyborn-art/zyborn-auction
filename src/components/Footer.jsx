import React from "react";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="zyborn-footer">
      <div className="container d-flex flex-wrap justify-content-between align-items-center py-3">
        <div className="d-flex align-items-center">
          <span className="text-muted">© {year} ZYBORN ART. All rights reserved.</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <a href="https://zyborn.com" className="footer-link">zyborn.com</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
