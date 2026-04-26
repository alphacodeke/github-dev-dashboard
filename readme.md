# GitHub Developer Intelligence Dashboard

A modern, responsive SaaS dashboard that provides deep analytics and insights for any GitHub developer using the GitHub REST API.

## Live Demo

Visit the live dashboard: [GitHub DevIQ Dashboard](#)

## Features

### 🔍 User Search
- Search any GitHub username with search button or Enter key
- Loading states with skeleton UI
- Toast notifications for errors (user not found, rate limits)

### 👤 Profile Overview
- Avatar, name, username, bio
- Followers / Following count
- Public repositories count
- Account creation date with account age calculation

### 📦 Repository Analysis
- Fetches latest 50 repos for performance
- For each repo: name, stars, forks, language, last updated, open issues
- Auto-categorization:
  - Active (updated in last 30 days)
  - Maintained (updated in last 6 months)
  - Abandoned (older than 6 months)

### 🧠 Language Intelligence
- Aggregates all repository languages
- Percentage distribution calculation
- Visual doughnut chart using Chart.js
- Primary stack insight text

### 📊 Activity Insights
- Counts push events from user activity
- Activity frequency classification
- Insights: "Highly active", "Moderately active", "Occasionally active"

### 🏆 Top Projects
- Most starred repository
- Most recently updated repository
- Hidden gem (low stars but high recent activity)

### 📈 Developer Score System
Custom scoring formula:
```
Score = (Total Stars × 2) + (Followers × 1.5) + (Recent Activity × 1)
```
Level badges:
- Beginner (0-249)
- Intermediate (250-799)
- Advanced (800-1999)
- Elite (2000+)

### ⚔️ Compare Developers
- Input two usernames
- Side-by-side comparison of:
  - Followers
  - Total Stars
  - Primary language stack
  - Developer scores

### 💾 Export Feature
- Generate shareable developer card as PNG
- Canvas-based rendering
- One-click download

## Tech Stack

- **HTML5** - Semantic structure
- **Tailwind CSS** - Utility-first styling with dark mode
- **Vanilla JavaScript** - No frameworks, pure JS
- **Chart.js** - Interactive language distribution charts
- **Font Awesome** - Premium icons
- **GitHub REST API** - Real developer data

## API Endpoints Used

```
GET https://api.github.com/users/{username}
GET https://api.github.com/users/{username}/repos?per_page=50&sort=updated
GET https://api.github.com/users/{username}/events?per_page=100
```

## Performance Optimizations

- **LocalStorage Caching** - Previous searches cached for 1 hour
- **Rate Limit Handling** - Graceful error messages when API limits exceeded
- **Lazy Rendering** - Components render progressively
- **Fetch Limiting** - Max 50 repos per request

## Installation & Usage

### Option 1: Direct Download

1. Clone the repository:
```bash
git clone https://github.com/alphacodeke/github-dev-dashboard.git
```

2. Open `index.html` in your browser

### Option 2: Local Server (Recommended)

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx serve .
```

Then navigate to `http://localhost:8000`

### Option 3: Deploy to Netlify/Vercel

Simply drag and drop the folder to Netlify drop zone or connect your GitHub repository.

## Usage Guide

1. **Search a Developer**
   - Enter any GitHub username (e.g., `octocat`, `gaearon`)
   - Click "Analyze" or press Enter

2. **View Dashboard**
   - Profile section shows basic info
   - Score card displays developer ranking
   - Language chart shows tech stack composition
   - Repository grid shows categorized repos

3. **Compare Developers**
   - Click "Compare" button in navbar
   - Enter two usernames
   - View side-by-side comparison

4. **Export Report**
   - Click "Export as PNG" button
   - Developer card downloads automatically

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

## Project Structure

```
github-dev-dashboard/
├── index.html          # Main application file
├── README.md           # Documentation
└── assets/             # (Optional) External assets
```

## Error Handling

- **404 User Not Found** - Toast notification with clear message
- **Rate Limit Exceeded** - User-friendly error with wait suggestion
- **Network Errors** - Graceful fallback messages
- **Empty Searches** - Validation before API calls

## Customization

### Change Color Scheme

Edit Tailwind classes in `index.html`:

```html
<!-- Change primary gradient -->
class="bg-gradient-to-r from-blue-600 to-purple-600"

<!-- Modify card styling -->
class="bg-gray-800/50 backdrop-blur-sm"
```

### Adjust Scoring Formula

Locate in JavaScript:

```javascript
const score = (totalStars * 2) + (user.followers * 1.5) + (recentActivity * 1);
```

### Modify Cache Duration

```javascript
// Change 3600000 (1 hour) to desired milliseconds
expiry: Date.now() + 3600000
```

## Rate Limiting Notes

- Unauthenticated GitHub API: 60 requests per hour
- Each user search consumes 3 requests (user, repos, events)
- Cache reduces repeated requests
- Consider adding GitHub token for higher limits

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## Development Team

**Lead Developer:** Anthony Karanja

- Portfolio: [https://anthonyke.netlify.app/](https://anthonyke.netlify.app/)
- GitHub: [@anthonykaranja](https://github.com/alphacodeke)

## License

MIT License - Free for personal and commercial use.

## Acknowledgments

- GitHub API for providing developer data
- Tailwind CSS team for amazing styling framework
- Chart.js for beautiful visualizations
- Font Awesome for icon set

## Support

For issues, feature requests, or questions:

- Open an issue on GitHub
- Contact via [portfolio website](https://anthonyke.netlify.app/)

---

**Built with HTML, Tailwind CSS, and Vanilla JavaScript** | Data powered by GitHub REST API