import React, { useEffect } from "react";
import { motion } from "framer-motion";
import logo from "@/assets/smartbooks-logo.png";

export default function LandingSplash({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 2600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#13293D]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Logo lock-up */}
      <motion.img
        src={logo}
        alt="Smart Books"
        className="mb-7 h-[76px] w-auto max-w-[78vw] object-contain sm:h-[96px]"
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />

      {/* Tagline */}
      <motion.p
        className="text-[13px] sm:text-[15px] font-medium uppercase tracking-[0.25em] text-white/80 mt-3"
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
      >
        Accounting Made Simple
      </motion.p>

      {/* Footer line */}
      <motion.div
        className="flex items-center gap-4 mt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        <div className="w-10 sm:w-16 h-[2px] bg-[#27A54C]" />
        <p className="text-[11px] sm:text-[13px] font-medium text-[#A8C9BC] whitespace-nowrap">
          For Accountants &bull; For Bookkeepers &bull; For Your Clients
        </p>
        <div className="w-10 sm:w-16 h-[2px] bg-[#27A54C]" />
      </motion.div>
    </motion.div>
  );
}