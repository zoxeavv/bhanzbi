/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Base colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Primary & Secondary - Modernize palette
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        
        // Semantic colors - Modernize palette
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        
        // Muted & Accent
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        
        // Popover & Card
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        // Modernize grey scale
        grey: {
          100: "hsl(var(--grey-100))",
          200: "hsl(var(--grey-200))",
          300: "hsl(var(--grey-300))",
          400: "hsl(var(--grey-400))",
          500: "hsl(var(--grey-500))",
          600: "hsl(var(--grey-600))",
        },
        
        // Sidebar colors
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
        },
      },
      borderRadius: {
        // Design system radii - Modernize 7px base
        lg: "var(--radius)", // 0.4375rem (7px)
        md: "calc(var(--radius) - 2px)", // 5px
        sm: "calc(var(--radius) - 4px)", // 3px
        // Additional radii tokens
        "2xl": "1rem", // 16px
        xl: "0.75rem", // 12px
        DEFAULT: "var(--radius)", // 7px
        full: "9999px",
      },
      spacing: {
        // Design system spacing tokens
        // Base spacing scale (4px increments)
        "0.5": "0.125rem", // 2px
        "1": "0.25rem", // 4px
        "1.5": "0.375rem", // 6px
        "2": "0.5rem", // 8px
        "2.5": "0.625rem", // 10px
        "3": "0.75rem", // 12px
        "3.5": "0.875rem", // 14px
        "4": "1rem", // 16px
        "5": "1.25rem", // 20px
        "6": "1.5rem", // 24px
        "7": "1.75rem", // 28px
        "8": "2rem", // 32px
        "9": "2.25rem", // 36px
        "10": "2.5rem", // 40px
        "11": "2.75rem", // 44px
        "12": "3rem", // 48px
        "14": "3.5rem", // 56px
        "16": "4rem", // 64px
        "20": "5rem", // 80px
        "24": "6rem", // 96px
        // Semantic spacing tokens
        "page-padding": "1.5rem", // 24px - padding standard des pages
        "section-gap": "1.5rem", // 24px - espacement entre sections
        "card-padding": "1.5rem", // 24px - padding standard des cards
      },
      fontSize: {
        // Design system typography scale - Modernize
        "h1": ["2.25rem", { lineHeight: "2.75rem", fontWeight: "600", letterSpacing: "-0.02em" }], // 36px / 44px
        "h2": ["1.875rem", { lineHeight: "2.25rem", fontWeight: "600", letterSpacing: "-0.01em" }], // 30px / 36px
        "h3": ["1.5rem", { lineHeight: "1.75rem", fontWeight: "600" }], // 24px / 28px
        "h4": ["1.3125rem", { lineHeight: "1.6rem", fontWeight: "600" }], // 21px / 25.6px
        "h5": ["1.125rem", { lineHeight: "1.6rem", fontWeight: "600" }], // 18px / 28.8px
        "h6": ["1rem", { lineHeight: "1.2rem", fontWeight: "600" }], // 16px / 19.2px
        // Body text
        "body1": ["0.875rem", { lineHeight: "1.334rem", fontWeight: "400" }], // 14px / 21.344px
        "body2": ["0.75rem", { lineHeight: "1rem", fontWeight: "400" }], // 12px / 16px
        // Labels & meta
        "label": ["0.875rem", { lineHeight: "1.25rem", fontWeight: "500" }], // 14px / 20px
        "meta": ["0.75rem", { lineHeight: "1rem", fontWeight: "400" }], // 12px / 16px
        // Display sizes
        "display-lg": ["3rem", { lineHeight: "3.5rem", fontWeight: "700", letterSpacing: "-0.03em" }], // 48px / 56px
        "display-md": ["2.5rem", { lineHeight: "3rem", fontWeight: "700", letterSpacing: "-0.02em" }], // 40px / 48px
        "display-sm": ["2rem", { lineHeight: "2.5rem", fontWeight: "700", letterSpacing: "-0.01em" }], // 32px / 40px
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Helvetica", "Arial", "sans-serif"],
      },
      lineHeight: {
        // Design system line heights
        "none": "1",
        "tight": "1.25",
        "snug": "1.375",
        "normal": "1.5",
        "relaxed": "1.625",
        "loose": "2",
      },
      fontWeight: {
        // Design system font weights
        "normal": "400",
        "medium": "500",
        "semibold": "600",
        "bold": "700",
      },
      boxShadow: {
        // Design system shadows
        "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        "xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        "card": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}


