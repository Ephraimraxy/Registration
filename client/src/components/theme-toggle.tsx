import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial theme
    const htmlElement = document.documentElement;
    const isDarkMode = htmlElement.classList.contains("dark");
    setIsDark(isDarkMode);

    // Watch for changes (e.g., from other components)
    const observer = new MutationObserver(() => {
      setIsDark(htmlElement.classList.contains("dark"));
    });

    observer.observe(htmlElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const htmlElement = document.documentElement;
    if (htmlElement.classList.contains("dark")) {
      htmlElement.classList.remove("dark");
      setIsDark(false);
      localStorage.setItem("theme", "light");
    } else {
      htmlElement.classList.add("dark");
      setIsDark(true);
      localStorage.setItem("theme", "dark");
    }
  };

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const htmlElement = document.documentElement;
    
    if (savedTheme === "dark") {
      htmlElement.classList.add("dark");
      setIsDark(true);
    } else if (savedTheme === "light") {
      htmlElement.classList.remove("dark");
      setIsDark(false);
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        htmlElement.classList.add("dark");
        setIsDark(true);
      } else {
        htmlElement.classList.remove("dark");
        setIsDark(false);
      }
    }
  }, []);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="w-10 h-10 rounded-full bg-white/20 dark:bg-white/10 text-white hover:bg-white/30 dark:hover:bg-white/20 border-white/30 dark:border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 shadow-lg"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-white" />
      ) : (
        <Moon className="h-5 w-5 text-white" />
      )}
    </Button>
  );
}

