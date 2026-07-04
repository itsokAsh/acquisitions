# Contributing to Acquisitions API

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

---

## 🔒 Security First

**Before contributing, please read [SECURITY.md](./SECURITY.md)**

### Critical Rules:

❌ **NEVER commit:**
- `.env` files
- API keys, secrets, or passwords
- Database credentials
- JWT secrets
- Personal information

✅ **ALWAYS:**
- Use `.env.example` with placeholder values
- Store secrets in environment variables
- Review your changes before committing
- Run `git diff` to check for accidental secrets

---

## 📋 Pre-Commit Checklist

Before committing code, verify:

```bash
# 1. No secrets in code
git diff | grep -i "password\|secret\|key\|token"

# 2. Lint passes
npm run lint

# 3. Tests pass
npm test

# 4. No .env files staged
git status | grep ".env"
```

---

## 🚀 Getting Started

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/acquisitions.git
cd acquisitions
```

### 2. Set Up Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials (NEVER commit this file!)
nano .env
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Environment

```bash
# With Docker (recommended)
docker-compose -f docker-compose.dev.yml up -d

# Without Docker
npm run dev
```

---

## 🔨 Making Changes

### Branch Naming Convention

```
feature/add-user-profile
fix/authentication-bug
docs/update-readme
refactor/improve-caching
```

### Commit Message Format

```
feat: add user profile endpoint
fix: resolve JWT token expiration issue
docs: update API documentation
refactor: optimize database queries
test: add integration tests for auth
chore: update dependencies
```

### Code Style

- **ESLint**: Follow the project's ESLint rules
- **Prettier**: Code will be auto-formatted
- **Naming**: Use camelCase for variables, PascalCase for classes

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

**Minimum coverage required: 70%**

---

## 📝 Pull Request Process

### 1. Create Pull Request

- Title: Clear, concise description
- Description: Explain what changed and why
- Link related issues

### 2. PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] No secrets committed
- [ ] Documentation updated (if needed)
- [ ] Branch is up-to-date with main

### 3. Code Review

- Address reviewer feedback
- Keep commits organized
- Be respectful and collaborative

---

## 🧪 Testing Guidelines

### Unit Tests

```javascript
describe('User Service', () => {
  it('should create a new user', async () => {
    const user = await createUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'SecurePass123!'
    });
    
    expect(user).toHaveProperty('id');
    expect(user.email).toBe('test@example.com');
  });
});
```

### Integration Tests

```javascript
describe('POST /api/auth/sign-up', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/sign-up')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!'
      })
      .expect(201);
    
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe('test@example.com');
  });
});
```

---

## 📚 Documentation

When adding new features:

1. **Update README.md** with usage examples
2. **Add inline comments** for complex logic
3. **Update API documentation** for new endpoints
4. **Add JSDoc comments** for functions

Example:
```javascript
/**
 * Creates a new user with hashed password
 * @param {Object} userData - User registration data
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email address
 * @param {string} userData.password - Plain text password (will be hashed)
 * @returns {Promise<Object>} Created user object (without password)
 */
export const createUser = async (userData) => {
  // Implementation
};
```

---

## 🐛 Reporting Bugs

### Bug Report Template

**Title:** Clear, descriptive title

**Description:**
- What happened?
- What did you expect to happen?
- Steps to reproduce

**Environment:**
- Node version: `node --version`
- OS: Windows/Mac/Linux
- Docker: Yes/No

**Logs:**
```
Paste relevant logs here
```

---

## 💡 Feature Requests

### Feature Request Template

**Title:** Clear feature description

**Problem:**
What problem does this feature solve?

**Proposed Solution:**
How would you implement it?

**Alternatives:**
What alternatives have you considered?

---

## 📦 Dependency Management

### Adding Dependencies

1. Check for security vulnerabilities
2. Verify license compatibility
3. Consider bundle size impact
4. Document why it's needed

```bash
# Add dependency
npm install package-name

# Add dev dependency
npm install --save-dev package-name

# Check for vulnerabilities
npm audit
```

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update specific package
npm update package-name

# Update all packages (with caution)
npm update
```

---

## 🔐 Security Vulnerability Reporting

**DO NOT** open public issues for security vulnerabilities.

Instead:
- Email: ashezz0512@gmail.com
- Include: Detailed description, steps to reproduce, potential impact

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the ISC License.

---

## 🙏 Thank You!

Your contributions make this project better for everyone!

---

## Questions?

- Open an issue for general questions
- Check [SECURITY.md](./SECURITY.md) for security questions
- Review [README.md](./README.md) for usage documentation
