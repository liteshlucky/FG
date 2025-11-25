# Automatic End-of-Day Checkout

This document explains how to set up automatic checkout for users at the end of each day.

## Option 1: Cron Job (Recommended for Production)

### Using cron (Linux/Mac)

1. Open crontab:
```bash
crontab -e
```

2. Add this line to run auto-checkout at 11:59 PM daily:
```
59 23 * * * curl -X POST http://localhost:3000/api/attendance/auto-checkout
```

For production (replace with your domain):
```
59 23 * * * curl -X POST https://yourdomain.com/api/attendance/auto-checkout
```

### Using Vercel Cron (if deployed on Vercel)

Create `vercel.json` in project root:
```json
{
  "crons": [{
    "path": "/api/attendance/auto-checkout",
    "schedule": "59 23 * * *"
  }]
}
```

## Option 2: External Cron Service

Use services like:
- **cron-job.org** (free)
- **EasyCron**
- **Zapier** (scheduled tasks)

Configure to hit: `POST https://yourdomain.com/api/attendance/auto-checkout`
Schedule: Daily at 11:59 PM

## Option 3: Manual Trigger

You can manually trigger auto-checkout anytime:

```bash
curl -X POST http://localhost:3000/api/attendance/auto-checkout
```

## Monitoring

Check auto-checkout status:
```bash
curl http://localhost:3000/api/attendance/auto-checkout
```

Response shows number of active check-ins.

## How It Works

1. API finds all users with status `checked-in`
2. Sets checkout time to 23:59:59 of current day
3. Calculates duration
4. Updates status to `checked-out`
5. Returns count of users checked out

## Testing

Test the auto-checkout:
```bash
# Check current active users
curl http://localhost:3000/api/attendance/auto-checkout

# Trigger auto-checkout
curl -X POST http://localhost:3000/api/attendance/auto-checkout
```
