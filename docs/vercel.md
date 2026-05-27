# Vercel Frontend Deployment

1. Push the repository to GitHub.
2. Create a Vercel project from the repo.
3. Set the root directory to `apps/frontend`.
4. Add environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.your-internal-domain.com
```

5. Deploy.

The frontend only talks to the Express API. It never connects directly to MySQL.

