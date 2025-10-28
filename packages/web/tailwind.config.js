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
        // 主色系 - 海洋蓝
        brand: {
          primary: '#1E4E8C',   // 主色：Logo、导航、标题、主按钮
          hover: '#173B6C',     // hover态、页脚、选中态
          light: '#E8F1FB',     // 浅蓝：背景衬色、高亮区
          DEFAULT: '#1E4E8C',
        },
        // 功能色 - 珊瑚橙（CTA）
        action: {
          primary: '#FF6B3D',   // CTA按钮、优惠价签
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
          50: '#E8F1FB',
          100: '#E8F1FB',
          500: '#1E4E8C',
          600: '#1E4E8C',
          700: '#173B6C',
          900: '#173B6C',
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