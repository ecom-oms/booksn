# GitHub Setup

1. Initialize the repository:

```bash
git init
git add .
git commit -m "Initial inventory ops system"
```

2. Create a private GitHub repository.

3. Add the remote:

```bash
git remote add origin git@github.com:YOUR_ORG/books-inventory-ops.git
git branch -M main
git push -u origin main
```

4. Store secrets in deployment platforms, not in GitHub.

Keep `.env`, `.env.local`, and Gmail secrets out of source control.

