# Mobile Development Quick Reference

## 🎯 Mobile-First Principles Used

### 1. Touch Targets (Always 44px+)
```jsx
// ✅ Good
<button className="h-12 px-4 py-2">Touch Me</button>

// ❌ Bad
<button className="h-6 px-2">Small</button>
```

### 2. Font Sizes (Never < 14px on mobile)
```jsx
// ✅ Good - prevents auto-zoom on iOS
<input className="text-base" />  {/* 16px */}

// ❌ Bad - iOS auto-zooms
<input className="text-xs" />    {/* 12px */}
```

### 3. Safe Areas (For notches/Dynamic Island)
```jsx
// ✅ Good
<div className="safe-top safe-bottom">
  Content here respects notch
</div>

// ❌ Bad
<div>Content might go under notch</div>
```

### 4. Spacing (Mobile-First)
```jsx
// ✅ Good
<div className="space-y-4 sm:space-y-6 md:space-y-8">

// ❌ Bad
<div className="space-y-8">  {/* Too much on mobile */}
```

### 5. Touch Feedback
```jsx
// ✅ Good
<button className="active:scale-95 active:bg-blue-700">

// ❌ Bad
<button>No feedback on tap</button>
```

---

## 🛠️ Common Mobile Patterns

### Form Input
```jsx
<Input
  label="Phone Number"
  type="tel"
  placeholder="98765 43210"
  className="text-base"  // 16px to prevent zoom
/>

// Key CSS already included:
// - h-12 (48px)
// - px-4 py-3 (good spacing)
// - text-base (16px)
// - focus:ring-2 (visible focus)
```

### Select Dropdown
```jsx
<Select
  label="Choose an option"
  options={[
    { label: 'Option 1', value: 'opt1' },
    { label: 'Option 2', value: 'opt2' }
  ]}
/>

// Auto includes:
// - Custom arrow icon
// - 48px height
// - Better styling
```

### Button States
```jsx
<Button
  variant="primary"
  size="md"  // = 48px height
  onClick={handleClick}
>
  Touch Me
</Button>

// Sizes available:
// - sm: 32px (small secondary buttons)
// - md: 48px (primary actions)
// - lg: 56px (main CTAs)
```

### File Upload
```jsx
<input
  type="file"
  onChange={(e) => handleFileUpload(e, 'fieldName')}
  className="block w-full text-sm file:py-2.5 file:px-4 
             file:rounded-lg file:bg-blue-50 file:text-blue-700"
/>

// Already styled for mobile with:
// - Full width on mobile
// - Touch-friendly button
// - Clear visual feedback
```

---

## 🎨 Responsive Classes

### Display (Show/Hide by Screen)
```jsx
{/* Mobile only */}
<div className="sm:hidden">📱 Mobile View</div>

{/* Tablet+ */}
<div className="hidden sm:block md:hidden">📱 Tablet View</div>

{/* Desktop+ */}
<div className="hidden md:block">🖥️ Desktop View</div>
```

### Sizing
```jsx
// Responsive padding
<div className="p-3 sm:p-4 md:p-6 lg:p-8">
  {/* Mobile: 12px, Tablet: 16px, Desktop: 24px */}
</div>

// Responsive width
<button className="w-full sm:w-auto">
  {/* Full width on mobile, auto on tablet+ */}
</button>

// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
  {/* 1 col mobile, 2 cols tablet, 3 cols desktop */}
</div>
```

---

## 📱 Mobile Utilities

### Touch Classes
```jsx
// Prevent double-tap zoom
<a className="touch-manipulation">Link</a>

// Optimized for touch
<div className="touch-manipulation">Content</div>

// Smooth scrolling
<div className="overflow-y-auto -webkit-overflow-scrolling">
  Scroll me
</div>
```

### Mobile-Specific Styles
```jsx
// Hide on mobile, show on tablet+
<table className="hidden md:table">

// Full width on mobile, auto on desktop
<div className="w-full sm:w-auto">

// Stack on mobile, row on desktop
<div className="flex flex-col sm:flex-row">

// Safe area support
<div className="safe-top safe-bottom">
```

## ⚠️ Common Mobile Mistakes to Avoid

### ❌ DON'T
```jsx
// Buttons too small
<button className="h-6 px-2">Delete</button>

// Text too small
<p className="text-xs">Important info</p>

// Font size < 16px on input
<input style={{ fontSize: '12px' }} />

// No focus states
<button>Click me</button>

// Hover-only affordances
<button className="hover:text-red-500">Hidden on mobile</button>

// Horizontal scroll required
<table className="min-w-[1200px]">
```

### ✅ DO
```jsx
// Buttons mobile-friendly
<button className="h-12 px-4 py-2">Delete</button>

// Readable text
<p className="text-sm sm:text-xs">Important info</p>

// Prevents auto-zoom
<input className="text-base" />

// Always visible
<button className="active:bg-red-100 active:text-red-700">
  Click me
</button>

// Works with touch
<button className="active:scale-95">Action</button>

// Responsive width
<div className="overflow-x-auto">
  <table className="min-w-full">
```

---

## 🎯 Testing Mobile Features

### Browsers to Test
- iOS Safari (14+)
- Android Chrome (90+)
- Firefox Mobile
- Samsung Internet

### Devices to Test
- iPhone 12/13/14/15 (various sizes)
- iPad (portrait & landscape)
- Android phones (Samsung, Pixel, etc.)
- Older phones (iOS 12, Android 10)

### Orientations to Test
- Portrait ✅
- Landscape ✅

### Features to Test
- ✅ All buttons/inputs tap correctly
- ✅ Forms work on slow networks
- ✅ Keyboard doesn't cover input
- ✅ Safe areas (notch) are respected
- ✅ Touch feedback visible
- ✅ Text is readable (not too small)
- ✅ Images scale properly
- ✅ File uploads work

---

## 🚀 Performance Tips

### Mobile Performance Checklist
```
☐ Images optimized for screen size
☐ JavaScript code-split
☐ CSS not blocking render
☐ No render-blocking fonts
☐ Lazy load images/components
☐ Minimize touch event handlers
☐ Use passive event listeners
☐ GPU acceleration for animations
☐ Test on slow 3G
☐ Lighthouse score > 80
```

### Debugging Mobile Issues
```bash
# Remote debug Android with Chrome
chrome://inspect/#devices

# iOS with Safari
Safari → Develop → [device] › [app]

# Mobile DevTools simulation
Chrome F12 → Ctrl+Shift+M

# Network throttling
Chrome DevTools → Network tab → Throttle
```

---

## 📚 File Structure Reference

```
src/
├── components/
│   └── MultiStepClientForm.tsx    ← Main mobile form
├── ui/
│   ├── Input.tsx                   ← 48px tall, touch-optimized
│   ├── Select.tsx                  ← Custom dropdown
│   ├── Button.tsx                  ← Touch-friendly buttons
│   └── SlideOver.tsx               ← Mobile drawer
├── layout/
│   └── Layout.tsx                  ← Safe area support
├── index.css                        ← Mobile globals
└── pages/
    └── Clients.tsx                  ← Uses new form
```

---

## 🔄 Form Development Pattern

```jsx
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useForm } from 'react-hook-form';

export function MyForm() {
  const [step, setStep] = useState(0);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const steps = [
    {
      title: 'Step 1',
      content: (
        <div className="space-y-4">
          <Input
            label="Field 1"
            {...register('field1', { required: 'Required' })}
            error={errors.field1?.message}
          />
        </div>
      )
    },
    {
      title: 'Step 2',
      content: <div>Step 2 content</div>
    }
  ];

  return (
    <form className="space-y-4">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Current step */}
      {steps[step].content}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          variant="secondary"
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={() => setStep(step + 1)}
          disabled={step === steps.length - 1}
          className="flex-1"
        >
          Next
        </Button>
      </div>
    </form>
  );
}
```

---

## 🎓 Resources

### Learning
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Google Material Design - Mobile](https://material.io/design/platform-guidance/android-bars.html)
- [MDN Web Docs - Mobile](https://developer.mozilla.org/en-US/docs/web/css/Media_Queries)
- [Web.dev - Mobile UX](https://web.dev/lighthouse-performance/)

### Tools
- Chrome DevTools (F12)
- Safari Remote Debugging
- Lighthouse (Performance audit)
- Responsively App (Device testing)

---

*Last Updated: May 12, 2026*
*Mobile Framework Version: Tailwind CSS + React*
