# MongoDB Migration Guide - Local to Vercel/Atlas

## ✅ Step 1: Data Export (COMPLETED)

Your local data has been exported to `./mongodb-backup/fit-app/`

**Exported collections:**
- 55 members
- 7 trainers
- 681 transactions
- 8 attendances
- 6 plans
- 2 payments
- 1 PT plan
- 1 user
- 1 discount
- 2 counters

## Step 2: Set Up MongoDB Atlas

1. **Create MongoDB Atlas Account**
   - Go to: https://www.mongodb.com/cloud/atlas/register
   - Sign up with your email or Google account

2. **Create a Free Cluster**
   - Click "Build a Database"
   - Choose **FREE** (M0 Sandbox)
   - Select a cloud provider (AWS recommended)
   - Choose a region close to your Vercel deployment (e.g., Mumbai for India)
   - Click "Create Cluster"

3. **Set Up Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `fitapp-admin` (or your choice)
   - Password: Generate a secure password (save it!)
   - Database User Privileges: "Atlas admin"
   - Click "Add User"

4. **Set Up Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for Vercel)
   - Click "Confirm"

5. **Get Connection String**
   - Go back to "Database" (Clusters)
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Driver: Node.js, Version: 5.5 or later
   - Copy the connection string:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your database user credentials
   - Add your database name at the end: `...mongodb.net/fit-app?retryWrites=true&w=majority`

## Step 3: Import Data to MongoDB Atlas

Run this command with YOUR Atlas connection string:

```bash
mongorestore --uri="mongodb+srv://fitapp-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/fit-app" ./mongodb-backup/fit-app/
```

**Replace:**
- `fitapp-admin` with your username
- `YOUR_PASSWORD` with your password
- `cluster0.xxxxx.mongodb.net` with your actual cluster URL

## Step 4: Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Click on "Settings" → "Environment Variables"
3. Add the following variables:

### Required Variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://username:password@cluster.mongodb.net/fit-app?retryWrites=true&w=majority` | Production, Preview, Development |
| `NEXTAUTH_SECRET` | (generate with: `openssl rand -base64 32`) | Production, Preview, Development |
| `NEXTAUTH_URL` | Your Vercel deployment URL | Production, Preview |
| `OPENAI_API_KEY` | Your OpenAI API key | Production, Preview, Development |
| `GEMINI_API_KEY` | Your Gemini API key | Production, Preview, Development |

### Optional Variables (if you have them):

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name | All |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key | All |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret | All |

## Step 5: Redeploy on Vercel

After adding environment variables:
1. Go to "Deployments" tab
2. Click the three dots on the latest deployment
3. Click "Redeploy"
4. Or push a new commit to trigger automatic deployment

## Step 6: Verify the Migration

1. Open your Vercel deployment URL
2. Log in to your dashboard
3. Check that all your data is visible:
   - Members list
   - Trainers list
   - Plans
   - Attendance records
   - Transactions

## Troubleshooting

### Connection Issues
- Make sure you replaced `<username>` and `<password>` in the connection string
- Verify "Allow Access from Anywhere" is enabled in Network Access
- Check that the database user has proper permissions

### Missing Data
- Run `mongorestore` again with the `--drop` flag to overwrite:
  ```bash
  mongorestore --drop --uri="..." ./mongodb-backup/fit-app/
  ```

### Environment Variables Not Working
- Make sure to select all three environments (Production, Preview, Development)
- Redeploy after adding variables
- Check for typos in variable names

## Quick Commands Reference

```bash
# Export local data (already done)
mongodump --db=fit-app --out=./mongodb-backup

# Import to Atlas
mongorestore --uri="YOUR_ATLAS_URI" ./mongodb-backup/fit-app/

# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Check what was exported
ls -la mongodb-backup/fit-app/
```

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env.local` or `.env` files to Git
- Keep your MongoDB Atlas password secure
- Rotate your API keys regularly
- Use strong passwords for database users
- Consider using IP whitelisting instead of "Allow from Anywhere" for production

## Next Steps

After successful migration:
1. ✅ Test all features on Vercel preview
2. ✅ Verify data integrity
3. ✅ Set up automated backups in MongoDB Atlas
4. ✅ Monitor database performance
5. ✅ Consider upgrading to a paid tier for production use
