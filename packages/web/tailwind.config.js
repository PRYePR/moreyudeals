/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Moreyu v3.1 配色方案
        // 主色系 - 天空蓝
        brand: {
          primary: '#0EA5E9',   // 主色：Logo、导航、标题、主按钮
          hover: '#0284C7',     // hover态、页脚、选中态
          light: '#E0F2FE',     // 浅蓝：背景衬色、高亮区
          DEFAULT: '#0EA5E9',
        },
        // 功能色 - 珊瑚橙（折扣、价格）
        action: {
          primary: '#FF6B3D',   // 折扣徽章、优惠价格
          hover: '#E45E2F',     // hover态
          DEFAULT: '#FF6B3D',
        },
        // 辅助色
        support: {
          green: '#2FC9A8',     // 攻略标签、成功状态
          yellow: '#FFA928',    // 警示、提示
          red: '#E9443D',       // 错误、重要提醒
        },
        // 中性色
        neutral: {
          bg: '#F8F9FB',        // 全站背景
          card: '#FFFFFF',      // 卡片背景
          border: '#E3E8EF',    // 边框
          text: {
            primary: '#222222',   // 正文
            secondary: '#666666', // 副标题、时间
            tertiary: '#999999',  // 标签、注释
          },
        },
        // 兼容旧配置
        primary: {
          50: '#E0F2FE',
          100: '#E0F2FE',
          500: '#0EA5E9',
          600: '#0EA5E9',
          700: '#0284C7',
          900: '#0284C7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}