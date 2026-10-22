import React, { useEffect } from "react";
import { motion } from "framer-motion";

const LOGO_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/media/site/favicon.svg`;

export default function LandingSplash({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 2600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Logo icon */}
      <motion.img
        src={LOGO_URL}
        alt="SmartBooks SA"
        className="object-contain mb-6"
        style={{ width: 110, height: 110 }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />

      {/* Brand name */}
      <motion.h1
        className="text-[44px] sm:text-[52px] font-bold tracking-tight"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
      >
        <span
          className="bg-gradient-to-r from-[#0A3D2E] to-[#34A835] bg-clip-text text-transparent"
        >
          SmartBooks
        </span>
      </motion.h1>

      {/* Tagline */}
      <motion.p
        className="text-[13px] sm:text-[15px] font-medium uppercase tracking-[0.25em] text-[#1A1A1A] mt-3"
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
        <div className="w-10 sm:w-16 h-[2px] bg-[#34A835]" />
        <p className="text-[11px] sm:text-[13px] font-medium text-[#0A3D2E] whitespace-nowrap">
          For Accountants &bull; For Bookkeepers &bull; For Your Clients
        </p>
        <div className="w-10 sm:w-16 h-[2px] bg-[#34A835]" />
      </motion.div>
    </motion.div>
  );
}