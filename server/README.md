# AiVideo API (Serverless)

This is the serverless backend API for the AiVideo platform, designed to be deployed on Vercel.

## Deployment Instructions

### Prerequisites

- A Vercel account
- Environment variables (see below)
- Cloudinary account for media storage

### Deploy on Vercel

1. Connect your repository to Vercel
2. Set the root directory to `server` during project creation
3. Set the build command to `npm install`
4. Set the output directory to `.`
5. Set the environment variables (see below)
6. Deploy!

### Environment Variables

Add the following environment variables in your Vercel project settings:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
DID_API_KEY=your_did_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
CLIENT_URL=https://your-frontend-url.vercel.app
EMAIL_SERVICE=your_email_service
EMAIL_USER=your_email_user
EMAIL_PASSWORD=your_email_password
SUPPORT_EMAIL=your_support_email
```

### Testing

After deployment, your API should be accessible at:
`https://your-api-url.vercel.app/api/`

## Development

For local development:

```bash
npm install
npm run dev
```

## Important Notes

1. This API uses Cloudinary for file storage as Vercel doesn't support persistent file storage.
2. The subscription scheduler is disabled in the production environment as Vercel doesn't support long-running processes.
3. All routes are defined in the `routes` directory and should be accessible via the `/api` prefix. 