/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dual-tone system: light neutral backgrounds + dark text
        neutral: {
          dark: '#1e293b',      // slate-800 - text color
          darker: '#0f172a',    // slate-900 - heading text
          muted: '#64748b',     // slate-500 - muted text
        },
        light: {
          base: '#ffffff',      // white - primary background
          surface: '#f8fafc',   // slate-50 - secondary background
          muted: '#f1f5f9',     // slate-100 - subtle background
          border: '#e2e8f0',    // slate-200 - border color
          hover: '#f1f5f9',     // slate-100 - hover state
        },
        // System state colors only
        success: {
          DEFAULT: '#22c55e',  // green-500
          light: '#dcfce7',    // green-100
          dark: '#16a34a',      // green-600
        },
        warning: {
          DEFAULT: '#f59e0b',  // amber-500
          light: '#fef3c7',    // amber-100
          dark: '#d97706',      // amber-600
        },
        error: {
          DEFAULT: '#ef4444',  // red-500
          light: '#fee2e2',    // red-100
          dark: '#dc2626',      // red-600
        },
        info: {
          DEFAULT: '#3b82f6',  // blue-500
          light: '#dbeafe',    // blue-100
          dark: '#2563eb',      // blue-600
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}

