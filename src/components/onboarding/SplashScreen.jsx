import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 500);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Replace the src below with your splash image once designed */}
          <img
            src="/splash.png"
            alt="Crete Walking Trails"
            className="w-full h-full object-cover"
            onError={e => {
              // Fallback if image not yet uploaded
              e.target.style.display = 'none';
              e.target.parentElement.classList.add('fallback-splash');
            }}
          />
          {/* Fallback shown until splash image is added */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 via-blue-800 to-amber-800 splash-fallback">
            <div className="text-center px-8">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/30">
                <span className="text-5xl">🥾</span>
              </div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-wide">Crete</h1>
              <h2 className="text-2xl font-light text-amber-300 mb-1">Walking Trails</h2>
              <p className="text-blue-200 text-sm mt-4">Discover the island's beauty</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}