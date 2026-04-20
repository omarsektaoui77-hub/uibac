"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const languages = [
  { code: "en", name: "English", flag: "🌍" },
  { code: "ar", name: "العربية", flag: "🇲🇦" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "esp", name: "Español", flag: "🇪🇸" },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (newLocale: string) => {
    // Standard next-intl logic: replace the locale in the pathname
    if (!pathname) return;
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPathname);
    setIsOpen(false);
  };

  const currentLang = languages.find((l) => l.code === locale) || languages[0];

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/10 transition-colors text-sm font-medium"
      >
        <span>{currentLang.flag}</span>
        <span className="uppercase">{currentLang.code}</span>
        <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            className="text-[10px] opacity-50"
        >
            ▼
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-48 bg-[#1a133f] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
            >
              <div className="p-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      locale === lang.code 
                        ? "bg-white/10 text-yellow-400 font-bold" 
                        : "hover:bg-white/5 text-gray-300"
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.name}</span>
                    {locale === lang.code && (
                        <span className="ml-auto text-yellow-400 text-xs text-end">●</span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
