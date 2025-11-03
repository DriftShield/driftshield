# Contributing to DriftShield Backend

Thank you for your interest in contributing to DriftShield! This document provides guidelines and instructions for contributing.

## Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing](#testing)
6. [Pull Request Process](#pull-request-process)

---

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment for all contributors

---

## Getting Started

### 1. Fork the Repository
```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/driftshield-backend.git
cd driftshield-backend

# Add upstream remote
git remote add upstream https://github.com/driftshield/driftshield-backend.git
```

### 2. Set Up Development Environment
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start services
docker-compose up -d postgres redis

# Run migrations
npm run migrate

# Start development server
npm run dev
```

---

## Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes
- Write clean, readable code
- Follow existing code style
- Add tests for new features
- Update documentation

### 3. Test Your Changes
```bash
# Run linter
npm run lint

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

### 4. Commit Changes
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature"
```

#### Commit Message Format
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```bash
feat(auth): add wallet signature verification
fix(market): resolve odds calculation bug
docs(api): update endpoint documentation
```

### 5. Push and Create Pull Request
```bash
# Push to your fork
git push origin feature/your-feature-name

# Create pull request on GitHub
```

---

## Coding Standards

### JavaScript Style Guide

We follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) with some modifications:

```javascript
// Good
async function getUserById(userId) {
  const user = await users.findById(userId);

  if (!user) {
    throw new NotFoundError('User');
  }

  return user;
}

// Bad
async function getUserById(userId) {
  const user=await users.findById(userId)
  if(!user) throw new Error('Not found')
  return user
}
```

### Code Organization

```
src/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Helper functions
├── db/              # Database access
└── index.js         # Entry point
```

### Naming Conventions

- **Files**: camelCase (e.g., `modelService.js`)
- **Classes**: PascalCase (e.g., `class ModelService`)
- **Functions**: camelCase (e.g., `function getModel()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `const MAX_RETRIES = 3`)
- **Private methods**: Prefix with underscore (e.g., `_validateInput()`)

### Error Handling

```javascript
// Good - Use custom error classes
throw new NotFoundError('Model');
throw new ValidationError('Invalid input', { field: 'email' });

// Bad - Use generic errors
throw new Error('Not found');
```

### Async/Await

```javascript
// Good
async function processData() {
  try {
    const data = await fetchData();
    return await processResult(data);
  } catch (error) {
    logger.error('Processing failed:', error);
    throw new AppError('Failed to process data');
  }
}

// Bad
function processData() {
  return fetchData()
    .then(data => processResult(data))
    .catch(error => {
      throw new Error('Failed');
    });
}
```

---

## Testing

### Writing Tests

```javascript
// src/services/__tests__/modelService.test.js
const modelService = require('../modelService');
const { models } = require('../../db');

jest.mock('../../db');

describe('ModelService', () => {
  describe('getModel', () => {
    it('should return model when found', async () => {
      const mockModel = { id: '123', name: 'Test Model' };
      models.findById.mockResolvedValue(mockModel);

      const result = await modelService.getModel('123');

      expect(result).toEqual(mockModel);
      expect(models.findById).toHaveBeenCalledWith('123');
    });

    it('should throw NotFoundError when model not found', async () => {
      models.findById.mockResolvedValue(null);

      await expect(modelService.getModel('123')).rejects.toThrow('Model not found');
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- modelService.test.js

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

### Coverage Requirements

Maintain minimum coverage:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

---

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No merge conflicts with main branch

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] Tests pass
```

### Review Process

1. Automated checks must pass (CI/CD)
2. At least one maintainer approval required
3. Address review comments
4. Squash commits if requested
5. Maintainer will merge when approved

---

## Questions?

- Open an issue for bugs or feature requests
- Join our Discord for discussions: https://discord.gg/driftshield
- Email: dev@driftshield.io

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
