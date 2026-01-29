# React Learning ROI Dashboard

A modern React/Next.js dashboard for analyzing GitHub Learning ROI metrics. This is a complete rewrite of the [Streamlit-based dashboard](https://github.com/kbergholtz11/github-learning-roi-analysis) with a modern tech stack.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### Dashboard Pages (20+)
- **Executive Summary** - High-level KPIs and trends
- **Health Check** - System status and data quality
- **Learner Explorer** - Search and filter learners
- **Learner Profile** - Individual learner details
- **Journey Overview** - Learning path visualization
- **Journey Funnel** - Conversion funnel analysis
- **Skills Matrix** - Skill proficiency breakdown
- **Progression Tracking** - Learning progress over time
- **Product Alignment** - Feature adoption metrics
- **Certification ROI** - Certification impact analysis
- **Copilot Analytics** - GitHub Copilot usage metrics
- **Insights ROI** - Return on learning investment
- **Events Dashboard** - Activity and engagement tracking
- **Compare Cohorts** - Group comparison analysis
- **NLP Query** - Natural language data exploration
- **Reports** - Exportable reports
- **Alerts** - Configurable alert management
- **Performance** - System performance metrics
- **Settings** - Application configuration

### UI/UX Features
- 🌙 **Dark Mode** - Full dark mode support with system preference detection
- 🔍 **Global Search** - Cmd/Ctrl+K search palette
- ⌨️ **Keyboard Shortcuts** - Power user shortcuts (Shift+?)
- 📱 **Responsive Design** - Mobile-friendly sidebar and layouts
- 🎨 **Loading Skeletons** - Smooth loading states
- 📊 **Interactive Charts** - Recharts with dark mode support
- 📤 **Export Options** - PDF, Excel, and CSV exports
- 🖨️ **Print Optimized** - Clean print styles
- 🔔 **Toast Notifications** - Non-intrusive feedback
- 🛡️ **Error Boundaries** - Graceful error handling

## 🚀 Quick Start

### Prerequisites
- Node.js 18.17 or later
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/kbergholtz11/react-github-learning-roi-analysis.git
cd react-github-learning-roi-analysis

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Build for Production

```bash
# Create production build
npm run build

# Start production server
npm start
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 16](https://nextjs.org/) with App Router |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Components | [shadcn/ui](https://ui.shadcn.com/) |
| Charts | [Recharts](https://recharts.org/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Data Fetching | [TanStack Query](https://tanstack.com/query) |
| Data Tables | [TanStack Table](https://tanstack.com/table) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Theme | [next-themes](https://github.com/pacocoursey/next-themes) |
| Notifications | [Sonner](https://sonner.emilkowal.ski/) |
| Exports | jspdf, xlsx, file-saver |

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Admin pages (alerts, performance, settings)
│   ├── analytics/          # Analytics pages (certification, copilot, insights)
│   ├── executive/          # Executive pages (summary, health)
│   ├── journey/            # Journey pages (explorer, funnel, overview, profile)
│   └── ...                 # Other pages
├── components/
│   ├── dashboard/          # Dashboard-specific components
│   ├── ui/                 # shadcn/ui components
│   ├── animations.tsx      # Framer Motion wrappers
│   ├── breadcrumbs.tsx     # Navigation breadcrumbs
│   ├── empty-state.tsx     # Empty/error state components
│   ├── error-boundary.tsx  # React error boundary
│   ├── export-button.tsx   # PDF/Excel/CSV export
│   ├── global-search.tsx   # Cmd+K search palette
│   └── ...
├── hooks/
│   ├── use-mobile.ts       # Mobile detection hook
│   └── use-queries.ts      # React Query hooks
├── lib/
│   ├── api.ts              # API service layer
│   ├── export.ts           # Export utilities
│   └── utils.ts            # Helper functions
└── types/
    └── index.ts            # TypeScript type definitions
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open global search |
| `Shift + ?` | Show keyboard shortcuts |
| `G then H` | Go to Home |
| `G then E` | Go to Executive Summary |
| `G then L` | Go to Learner Explorer |
| `G then J` | Go to Journey Overview |
| `G then S` | Go to Settings |

## 🔌 API Integration

The dashboard is designed to work with a backend API. Configure the API endpoint:

```typescript
// src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🧪 Development

```bash
# Run development server with Turbopack
npm run dev

# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Format code (if prettier is configured)
npx prettier --write .
```

## 📦 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kbergholtz11/react-github-learning-roi-analysis)

### Docker

```bash
# Build image
docker build -t learning-roi-dashboard .

# Run container
docker run -p 3000:3000 learning-roi-dashboard
```

## 🔗 Related Projects

- [github-learning-roi-analysis](https://github.com/kbergholtz11/github-learning-roi-analysis) - Original Streamlit dashboard (Python)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
