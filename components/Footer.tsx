import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-line">
      <div className="max-w-7xl mx-auto px-4 lg:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <img src="/LOGO.png" alt="Zebra" className="logo h-4 w-auto" />
        <span className="label">Transcripción con IA de Google Gemini</span>
      </div>
    </footer>
  );
}
