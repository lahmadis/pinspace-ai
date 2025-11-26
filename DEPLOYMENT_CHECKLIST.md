# Pre-Deployment Checklist

Use this checklist before merging to main or deploying to production.

## 🔍 Code Quality

### Linting & Formatting
- [ ] Run `npm run lint` - No errors
- [ ] Run `npm run lint:fix` - Auto-fix issues
- [ ] Run `npm run format` - Format all code
- [ ] Run `npm run format:check` - Verify formatting
- [ ] Run `npm run type-check` - No TypeScript errors

### Testing
- [ ] Run `npm test` - All tests pass
- [ ] Run `npm run test:coverage` - Coverage ≥ 70%
- [ ] Run `npm run test:a11y` - Accessibility tests pass
- [ ] Run `npm run test:i18n` - i18n tests pass
- [ ] Manual testing in development mode

## 📱 Cross-Platform Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Devices
- [ ] iOS Safari (iPhone)
- [ ] iOS Safari (iPad)
- [ ] Android Chrome
- [ ] Mobile viewport (375px, 414px, 768px)

### Responsive Breakpoints
- [ ] Mobile (< 640px)
- [ ] Tablet (640px - 1024px)
- [ ] Desktop (1024px+)
- [ ] Large desktop (1280px+)

## ♿ Accessibility (a11y)

### Automated Testing
- [ ] Run `npm run test:a11y` - All tests pass
- [ ] Run Lighthouse accessibility audit - Score ≥ 90
- [ ] Use axe DevTools - No violations

### Manual Testing
- [ ] Keyboard navigation (Tab, Enter, Space, Arrow keys)
- [ ] Screen reader (NVDA/VoiceOver) - All content announced
- [ ] Focus indicators visible on all interactive elements
- [ ] Color contrast meets WCAG AA (use audit script)
- [ ] ARIA labels present on all interactive elements
- [ ] Form labels properly associated
- [ ] Error messages accessible

### Tools
- [ ] axe DevTools browser extension
- [ ] WAVE browser extension
- [ ] Lighthouse accessibility audit
- [ ] Color contrast checker

## 🌍 Internationalization (i18n)

### Translation Coverage
- [ ] All user-facing strings use `t()` function
- [ ] English translations complete
- [ ] Spanish translations complete
- [ ] No hardcoded strings in components
- [ ] Pluralization works correctly
- [ ] Parameters work correctly

### Testing
- [ ] Switch to Spanish locale - All text translated
- [ ] Switch back to English - All text correct
- [ ] Test pluralization with different counts
- [ ] Test parameter substitution
- [ ] Locale persists in localStorage

## ⚡ Performance

### Metrics
- [ ] Lighthouse Performance Score ≥ 90
- [ ] First Contentful Paint (FCP) < 1.8s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Time to Interactive (TTI) < 3.8s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Total Blocking Time (TBT) < 200ms

### Optimization
- [ ] Images optimized (next/image, WebP/AVIF)
- [ ] Code splitting implemented (lazy loading)
- [ ] Bundle size analyzed (no large chunks)
- [ ] API requests optimized (caching, deduplication)
- [ ] No unnecessary re-renders (React.memo where needed)

### Tools
- [ ] Lighthouse audit
- [ ] Bundle analyzer
- [ ] React DevTools Profiler
- [ ] Network tab (check request sizes)

## 🔒 Security

### Environment Variables
- [ ] No secrets in `NEXT_PUBLIC_*` variables
- [ ] `.env.local` in `.gitignore`
- [ ] `.env.example` documented
- [ ] Production env vars set in deployment platform

### API Security
- [ ] API endpoints validate input
- [ ] CORS configured correctly
- [ ] Rate limiting implemented (if needed)
- [ ] Authentication/authorization in place

### Dependencies
- [ ] Run `npm audit` - No critical vulnerabilities
- [ ] Dependencies up to date
- [ ] No known security issues

## 🐛 Error Handling

### Error States
- [ ] API errors handled gracefully
- [ ] Network errors show user-friendly messages
- [ ] Empty states display correctly
- [ ] Loading states show appropriate UI
- [ ] Error boundaries implemented (if needed)

### Fallbacks
- [ ] Mock data fallback disabled in production (`ENABLE_MOCK_FALLBACK=false`)
- [ ] Fallback messages are helpful
- [ ] Retry mechanisms work correctly

## 📊 Analytics & Monitoring

### Setup (If Applicable)
- [ ] Analytics configured (if using)
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Performance monitoring set up
- [ ] User feedback mechanism (if needed)

## 🌐 Browser Compatibility

### Features
- [ ] CSS Grid works (all modern browsers)
- [ ] Flexbox works (all modern browsers)
- [ ] ES6+ JavaScript works (transpiled correctly)
- [ ] Fetch API works (polyfill if needed)

### Polyfills
- [ ] Check for required polyfills
- [ ] Test in older browsers (if supporting)

## 📝 Documentation

### Code Documentation
- [ ] JSDoc comments on exported functions
- [ ] README files updated
- [ ] Component documentation complete
- [ ] API documentation (if applicable)

### Deployment Documentation
- [ ] Environment variables documented
- [ ] Deployment steps documented
- [ ] Rollback procedure documented
- [ ] Monitoring/alerting set up

## 🔄 Pre-Deployment Steps

### Build & Test
- [ ] Run `npm run build` - Build succeeds
- [ ] Run `npm start` - Production build works
- [ ] Test production build locally
- [ ] Check for console errors/warnings

### Git
- [ ] All changes committed
- [ ] Commit messages descriptive
- [ ] Branch up to date with main
- [ ] No merge conflicts

### Code Review
- [ ] Code reviewed by team member
- [ ] All review comments addressed
- [ ] Tests reviewed
- [ ] Documentation reviewed

## 🚀 Deployment

### Pre-Deployment
- [ ] Environment variables set in deployment platform
- [ ] Feature flags configured
- [ ] Database migrations run (if applicable)
- [ ] CDN/cache cleared (if applicable)

### Post-Deployment
- [ ] Smoke test production site
- [ ] Check error logs
- [ ] Monitor performance metrics
- [ ] Verify analytics tracking
- [ ] Test critical user flows

## 📋 Feature-Specific Checks

### Explore Page
- [ ] Search works correctly
- [ ] Filters work correctly
- [ ] Sort works correctly
- [ ] Board cards display correctly
- [ ] Modal opens/closes correctly
- [ ] Favorite functionality works
- [ ] Loading states display
- [ ] Empty states display
- [ ] Error states display
- [ ] Responsive on mobile

### Board Components
- [ ] BoardCard renders correctly
- [ ] BoardList renders correctly
- [ ] BoardGrid responsive
- [ ] BoardDetailsModal accessible
- [ ] All components keyboard accessible

## 🎯 Production Readiness

### Checklist
- [ ] All above items checked
- [ ] No console errors in production
- [ ] No console warnings in production
- [ ] Performance metrics acceptable
- [ ] Accessibility standards met
- [ ] i18n working correctly
- [ ] Error handling robust
- [ ] Security measures in place

## 🆘 Rollback Plan

### If Issues Found
- [ ] Know how to rollback deployment
- [ ] Have previous version tagged
- [ ] Database rollback procedure (if applicable)
- [ ] Communication plan for users

## 📞 Support

### Contact Information
- [ ] Support email/chat configured
- [ ] Error reporting mechanism in place
- [ ] Monitoring alerts configured
- [ ] On-call rotation set up (if applicable)

---

## Quick Command Reference

```bash
# Run all checks
npm run pre-commit

# Individual checks
npm run lint
npm run format:check
npm run type-check
npm test
npm run test:coverage

# Build and test production
npm run build
npm start

# Audit
npm audit
npm run audit:colors
```

---

**Last Updated**: [Current Date]
**Next Review**: Before each deployment







