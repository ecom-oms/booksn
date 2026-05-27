# Production Checklist

- Use a long random `JWT_SECRET`.
- Replace bootstrap `ADMIN_PASSWORD` after first login.
- Restrict Nestify MySQL network access where possible.
- Keep `CORS_ORIGIN` limited to the Vercel app URL.
- Run API and worker as separate supervised processes.
- Configure Gmail OAuth with `gmail.modify` only.
- Monitor upload logs for `FAILED` and `PARTIAL` statuses.
- Schedule database backups.
- Test imports using `samples/sample-inventory.csv`.
- Confirm export sizes fit operational needs; for very large full exports, run them during low-traffic hours.

