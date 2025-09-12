# Contributing to Mobile IM Components

Thank you for your interest in contributing to Mobile IM Components! We welcome contributions from everyone, whether you're fixing bugs, adding features, improving documentation, or helping with testing.

## 🌟 Ways to Contribute

- 🐛 **Report bugs** - Help us identify and fix issues
- 💡 **Suggest features** - Share ideas for new functionality
- 📝 **Improve documentation** - Make our docs clearer and more comprehensive
- 🧪 **Write tests** - Help us maintain code quality
- 🎨 **Create themes** - Design beautiful new themes
- 🔧 **Fix issues** - Submit pull requests for open issues
- 📖 **Write examples** - Create helpful usage examples

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm 8.0 or higher (or yarn 1.22+)
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/mobile-im-components.git
   cd mobile-im-components
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development servers**
   ```bash
   # Start component development server
   npm run dev
   
   # Start Storybook (in another terminal)
   npm run storybook
   
   # Start documentation (in another terminal)
   npm run docs:dev
   ```

4. **Run tests**
   ```bash
   npm test
   ```

### Project Structure

```
mobile-im-components/
├── src/                    # Source code
│   ├── components/         # React components
│   │   ├── chat/          # Chat-specific components
│   │   ├── layout/        # Layout components
│   │   ├── shared/        # Shared/utility components
│   │   └── webgl/         # WebGL components
│   ├── styles/            # CSS and theme files
│   ├── utils/             # Utility functions
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript type definitions
├── docs/                   # VitePress documentation
├── .storybook/            # Storybook configuration
├── tests/                 # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
└── scripts/               # Build and utility scripts
```

## 📋 Development Guidelines

### Code Style

We use ESLint and Prettier to maintain consistent code style:

```bash
# Check code style
npm run lint

# Fix code style issues
npm run lint:fix

# Format code
npm run format
```

**Key conventions:**
- Use TypeScript for all new code
- Follow React best practices
- Use functional components with hooks
- Prefer explicit exports over default exports
- Use descriptive variable and function names
- Add JSDoc comments for public APIs

### Component Development

When creating new components:

1. **Create component files**
   ```
   src/components/category/ComponentName/
   ├── ComponentName.tsx      # Main component
   ├── ComponentName.test.tsx # Unit tests
   ├── ComponentName.stories.tsx # Storybook stories
   ├── index.ts              # Exports
   └── styles.css            # Component styles (if needed)
   ```

2. **Follow naming conventions**
   - Use PascalCase for component names
   - Use camelCase for props and functions
   - Use kebab-case for CSS classes
   - Prefix interfaces with the component name

3. **TypeScript interfaces**
   ```typescript
   interface ComponentNameProps {
     // Required props first
     children: React.ReactNode
     
     // Optional props with default values documented
     variant?: 'primary' | 'secondary'
     size?: 'small' | 'medium' | 'large'
     disabled?: boolean
     
     // Event handlers
     onClick?: (event: MouseEvent) => void
     
     // Style overrides
     className?: string
     style?: React.CSSProperties
   }
   ```

4. **Component structure**
   ```typescript
   export const ComponentName: React.FC<ComponentNameProps> = ({
     children,
     variant = 'primary',
     size = 'medium',
     disabled = false,
     onClick,
     className,
     style,
     ...rest
   }) => {
     // Hooks
     const [state, setState] = useState()
     
     // Event handlers
     const handleClick = useCallback((event: MouseEvent) => {
       if (disabled) return
       onClick?.(event)
     }, [disabled, onClick])
     
     // Render
     return (
       <div
         className={clsx('component-name', `variant-${variant}`, className)}
         style={style}
         onClick={handleClick}
         {...rest}
       >
         {children}
       </div>
     )
   }
   ```

### Testing

We use Vitest for unit testing and Playwright for e2e testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e
```

**Testing guidelines:**
- Write tests for all public components
- Test both happy path and edge cases
- Use React Testing Library for component tests
- Mock external dependencies
- Achieve >90% test coverage for new code

**Test structure:**
```typescript
describe('ComponentName', () => {
  it('renders correctly with required props', () => {
    render(<ComponentName>{children}</ComponentName>)
    expect(screen.getByRole('...')).toBeInTheDocument()
  })
  
  it('handles user interactions', async () => {
    const handleClick = jest.fn()
    render(<ComponentName onClick={handleClick} />)
    
    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledWith(expect.any(Object))
  })
  
  it('applies custom className and styles', () => {
    const customClass = 'custom-class'
    const customStyle = { color: 'red' }
    
    render(
      <ComponentName className={customClass} style={customStyle} />
    )
    
    const element = screen.getByRole('...')
    expect(element).toHaveClass(customClass)
    expect(element).toHaveStyle(customStyle)
  })
})
```

### Documentation

1. **Component documentation**
   - Add JSDoc comments to all props
   - Include usage examples
   - Document accessibility features
   - Mention mobile-specific behavior

2. **Storybook stories**
   ```typescript
   export default {
     title: 'Components/Category/ComponentName',
     component: ComponentName,
     parameters: {
       docs: {
         description: {
           component: 'Component description with features and usage.'
         }
       }
     }
   }
   
   export const Default: Story = {
     args: {
       // Default props
     }
   }
   
   export const Variant: Story = {
     args: {
       variant: 'secondary'
     },
     parameters: {
       docs: {
         description: {
           story: 'Description of this story/variant.'
         }
       }
     }
   }
   ```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear description** - What you expected vs what happened
2. **Steps to reproduce** - Detailed steps to reproduce the issue
3. **Environment details** - OS, browser, device, screen size
4. **Code example** - Minimal reproducible example
5. **Screenshots/videos** - Visual evidence if applicable

Use our bug report template:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected behavior**
A clear description of what you expected to happen.

**Environment:**
- Device: [e.g. iPhone 12, Samsung Galaxy S21]
- OS: [e.g. iOS 15, Android 11]
- Browser: [e.g. Safari, Chrome]
- Component version: [e.g. 1.0.0]

**Additional context**
Add any other context about the problem here.
```

## 💡 Feature Requests

When suggesting features:

1. **Use case** - Explain the problem you're trying to solve
2. **Proposed solution** - Describe your ideal solution
3. **Alternatives** - Mention any workarounds you've considered
4. **Additional context** - Provide mockups, examples, or references

## 🔄 Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes**
   - Follow the coding standards
   - Add/update tests
   - Update documentation
   - Add changeset if needed

3. **Test your changes**
   ```bash
   npm run lint
   npm run type-check
   npm test
   npm run test:e2e
   npm run build
   ```

4. **Commit your changes**
   We use Conventional Commits:
   ```bash
   git commit -m "feat: add amazing new feature"
   git commit -m "fix: resolve mobile touch issue"
   git commit -m "docs: update installation guide"
   ```

   **Commit types:**
   - `feat`: New features
   - `fix`: Bug fixes
   - `docs`: Documentation changes
   - `style`: Code style changes
   - `refactor`: Code refactoring
   - `test`: Test updates
   - `chore`: Build process or tooling changes

5. **Push and create PR**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes made.
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Unit tests pass
   - [ ] E2E tests pass
   - [ ] Manual testing completed
   - [ ] Mobile testing completed
   
   ## Screenshots/GIFs
   (if applicable)
   
   ## Checklist
   - [ ] Code follows project style guidelines
   - [ ] Self-review completed
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] Changeset added (if needed)
   ```

## 📱 Mobile Testing

Given our mobile-first approach, please test on actual devices:

**Minimum testing requirements:**
- Test on at least 2 different mobile devices
- Test in both portrait and landscape orientations
- Test touch interactions (tap, long press, swipe, pinch)
- Verify performance on lower-end devices
- Test with poor network conditions

**Recommended test devices:**
- iPhone (iOS Safari)
- Android phone (Chrome)
- iPad (Safari)
- Android tablet (Chrome)

## 🎨 Theme Development

When creating new themes:

1. **Follow the theme structure**
   ```typescript
   export const customTheme: Theme = {
     name: 'custom-theme',
     colors: {
       glass: {
         primary: 'rgba(255, 255, 255, 0.1)',
         secondary: 'rgba(255, 255, 255, 0.05)'
       },
       brand: {
         primary: '#646cff',
         secondary: '#747bff'
       }
     },
     effects: {
       blur: '12px',
       shadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
     }
   }
   ```

2. **Test across components**
   - Ensure theme works with all components
   - Test light and dark variants
   - Verify accessibility (contrast ratios)
   - Test on different screen sizes

## 🚢 Release Process

Releases are automated using semantic-release:

1. **Changesets** - Add changeset for significant changes:
   ```bash
   npx changeset add
   ```

2. **Versioning** - Follows semantic versioning:
   - PATCH: Bug fixes
   - MINOR: New features (backwards compatible)
   - MAJOR: Breaking changes

3. **Release** - Automatic on merge to main branch

## ❓ Questions and Support

- 💬 **Discussions** - [GitHub Discussions](https://github.com/mobile-im/components/discussions)
- 🐛 **Issues** - [GitHub Issues](https://github.com/mobile-im/components/issues)
- 📧 **Email** - team@mobile-im-components.com

## 🏆 Recognition

Contributors who make significant contributions will be:
- Added to the contributors list
- Mentioned in release notes
- Invited to the core team (for long-term contributors)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Mobile IM Components! 🎉