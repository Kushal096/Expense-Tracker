# Contribution Guide

This guide explains the workflow for contributing to the Expense Tracker project. Follow these steps to ensure your changes are properly tested, documented, and integrated into the main codebase.

---

## 📋 Pre-Contribution Checklist

Before starting work:
- [ ] Read the README.md for project overview
- [ ] Set up the development environment locally
- [ ] Ensure all dependencies are installed
- [ ] Verify the project runs successfully on your machine

---

## 🔄 Complete Workflow

### Step 1: Update Your Local Main Branch

**Purpose:** Ensure you start from the latest code and avoid conflicts.

**Command:**
```bash
git checkout main
git pull origin main
```

**What happens after:**
- Your local `main` branch now matches the remote repository
- You're ready to branch off with the latest code
- Risk of merge conflicts is minimized

---

### Step 2: Create a Feature Branch

**Purpose:** Isolate your changes so they don't affect anyone else's work.

**Command:**
```bash
git checkout -b feature/your-feature-name
```

**Branch naming conventions:**
- `feature/add-expense-filters` - New feature
- `feature/update-dashboard-layout` - UI updates
- `fix/login-button-error` - Bug fix
- `docs/update-readme` - Documentation
- `refactor/clean-up-services` - Code refactoring

**Example:**
```bash
git checkout -b feature/add-expense-filters
```

**What happens after:**
- A new branch is created from `main`
- All your commits stay on this branch
- Someone else can work on a different branch simultaneously

---

### Step 3: Make Your Code Changes

**Guidelines:**
- Write clean, readable code
- Follow the existing code style
- Update comments and documentation
- Keep changes focused to one feature/fix per branch

**Files to modify:**
- Backend: Files in `expense-tracker-backend/app/`
- Frontend: Files in `expense-tracker-frontend/`
- Docs: README.md or contribution.md

**Example changes:**
```bash
# Edit a Python file
nano expense-tracker-backend/app/routes/expense_routes.py

# Edit a frontend file
nano expense-tracker-frontend/expenses.html
```

**What happens after:**
- Your changes are saved locally
- Git recognizes the modified files
- Changes are ready for testing

---

### Step 4: Test Your Changes

**Backend Testing:**

1. Navigate to backend:
   ```bash
   cd expense-tracker-backend
   source expenseVenv/bin/activate
   ```

2. Run the application:
   ```bash
   uvicorn main:app --reload
   ```

3. Test endpoints:
   - Open `http://127.0.0.1:8000/docs` (Swagger UI)
   - Test your new/modified endpoints
   - Check responses and error handling

4. Fix any errors:
   - Look at server console for error messages
   - Debug and re-run the server

**Frontend Testing:**

1. Open the HTML file in your browser:
   ```bash
   cd expense-tracker-frontend
   open login.html
   # or
   firefox expenses.html
   ```

2. Test user interactions:
   - Fill out forms
   - Click buttons
   - Verify JavaScript runs without errors
   - Check browser console for errors (F12)

3. Test API integration:
   - Verify API calls are made correctly
   - Check network tab in browser devtools
   - Ensure responses are handled properly

**What happens after:**
- You confirm your code works as expected
- No errors appear in console/server logs
- You're confident moving to the next step

---

### Step 5: Review Your Changes with Git Diff

**Purpose:** Double-check exactly what you changed before committing.

**Command:**
```bash
git status
```

**Output example:**
```
On branch feature/add-expense-filters
Changes not staged for commit:
  modified:   app/routes/expense_routes.py
  modified:   app/services/expense_service.py

Untracked files:
  app/schemas/new_schema.py
```

**Detailed diff:**
```bash
git diff app/routes/expense_routes.py
```

**What to look for:**
- Only intended files are modified
- No accidental changes to unrelated files
- No sensitive data or `.env` files included
- Formatting looks correct

**What happens after:**
- You're confident about what will be committed
- You can revert accidental changes if needed

---

### Step 6: Stage Your Changes

**Purpose:** Select which files to include in your commit.

**Command (stage all changes):**
```bash
git add .
```

**Command (stage specific file):**
```bash
git add app/routes/expense_routes.py
```

**Verify staged changes:**
```bash
git status
```

**Expected output:**
```
Changes to be committed:
  modified:   app/routes/expense_routes.py
  modified:   app/services/expense_service.py
```

**What happens after:**
- Selected files are ready to commit
- Unstaged files remain unchanged
- You can now create a commit

---

### Step 7: Commit Your Work

**Purpose:** Save your changes to git history with a descriptive message.

**Command:**
```bash
git commit -m "Add expense filters to dashboard"
```

**Good commit message format:**
- Start with a verb: Add, Fix, Update, Remove, Refactor
- Be specific about what changed
- Keep it under 72 characters if possible
- Use present tense

**Commit message examples:**
```bash
git commit -m "Add expense category filter"
git commit -m "Fix login button alignment on mobile"
git commit -m "Update API documentation in README"
git commit -m "Refactor authentication service"
git commit -m "Remove deprecated function from utils"
```

**What happens after:**
- Changes are saved in local git history
- Each commit has a unique ID (hash)
- Commit messages appear in `git log`

---

### Step 8: Push Your Branch to Remote

**Purpose:** Upload your branch to GitHub so others can see it.

**Command:**
```bash
git push -u origin feature/your-feature-name
```

**Example:**
```bash
git push -u origin feature/add-expense-filters
```

**What to expect:**
- First time pushing: Git creates the branch on remote
- Subsequent pushes: `git push` (without -u) is enough
- Output shows branch pushed successfully

**If push is rejected:**
- Pull latest changes: `git pull`
- Resolve any conflicts
- Push again

**What happens after:**
- Your branch exists on GitHub
- Other team members can see it
- You can open a pull request

---

### Step 9: Create a Pull Request (PR)

**Purpose:** Request your changes be reviewed and merged into `main`.

**Steps on GitHub:**

1. Go to the repository on GitHub
2. You'll see a prompt to create a pull request for your branch
3. Click "Compare & pull request"
4. Fill in the PR description:

**PR Title:**
```
Add expense category filter to dashboard
```

**PR Description (example):**
```markdown
## What changed?
- Added category filter dropdown to expense list
- Filter persists in user preferences
- Updated API request to include category_id parameter

## Why?
Users can now filter expenses by category for better organization.

## How to test?
1. Go to dashboard
2. Click category filter
3. Select a category
4. Verify only matching expenses display

## Screenshots
[Include before/after if UI changed]
```

5. Click "Create pull request"

**What happens after:**
- PR is visible to other developers
- Code review is requested
- CI/CD checks may run (if configured)
- Team can comment and suggest changes

---

## 📝 Detailed Process Summary

```
┌─────────────────────────────────────────┐
│ 1. Checkout main & pull latest          │
│    git checkout main                    │
│    git pull origin main                 │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 2. Create feature branch                │
│    git checkout -b feature/my-feature   │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 3. Make code changes                    │
│    Edit files in app/ or frontend/      │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 4. Test thoroughly                      │
│    Run server, test endpoints           │
│    Open frontend, test UI               │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 5. Review diff                          │
│    git status                           │
│    git diff                             │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 6. Stage changes                        │
│    git add .                            │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 7. Commit with message                  │
│    git commit -m "Clear message"        │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 8. Push to remote                       │
│    git push -u origin feature/my-feature│
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 9. Open pull request on GitHub          │
│    Describe changes & request review    │
└─────────────────────────────────────────┘
```

---

## ❌ Common Issues & Solutions

### Issue: "Your branch and 'origin/main' have diverged"
**Solution:**
```bash
git pull origin main
# Resolve conflicts if any
git push
```

### Issue: "Permission denied (publickey)"
**Solution:** Set up SSH keys on GitHub or use HTTPS instead

### Issue: "Changes not staged for commit"
**Solution:**
```bash
git add .
git commit -m "Your message"
```

### Issue: "Pushed to wrong branch"
**Solution:**
```bash
git log  # Find your commit hash
git reset --hard HEAD~1  # Undo last commit (use cautiously)
git checkout -b correct-branch
git cherry-pick <commit-hash>
```

---

## ✅ Pre-Push Checklist

Before pushing, verify:

- [ ] All tests pass locally
- [ ] No console errors
- [ ] Code follows project style
- [ ] Comments are clear
- [ ] `.env` and secrets not included
- [ ] Changes match the feature/fix description
- [ ] Commit messages are descriptive
- [ ] Only intended files are staged

---

## 🎯 Branch Naming Guide

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/description` | `feature/add-category-filter` |
| Bug Fix | `fix/description` | `fix/login-error` |
| Documentation | `docs/description` | `docs/api-readme` |
| Refactor | `refactor/description` | `refactor/clean-services` |
| Hotfix | `hotfix/description` | `hotfix/database-connection` |

---

## 📞 Getting Help

- Check existing issues on GitHub
- Review pull request comments
- Ask in project discussions
- Share error logs and steps to reproduce

---

## 🙏 Thank You!

Your contributions help make this project better. Remember:
- Collaboration is key
- Clear communication prevents confusion
- Testing catches bugs early
- Good commit messages save future time
