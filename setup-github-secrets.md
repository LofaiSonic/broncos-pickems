# GitHub Actions Secrets Setup

To enable automatic deployment, you need to add the following secrets to your GitHub repository:

## How to add GitHub Secrets:
1. Go to your GitHub repository
2. Click on **Settings** tab
3. Click on **Secrets and variables** → **Actions**
4. Click **New repository secret** for each secret below

## Required Secrets:

### VPS_HOST
- **Name:** `VPS_HOST`
- **Value:** `148.230.83.37`
- **Description:** Your VPS IP address

### VPS_SSH_KEY
- **Name:** `VPS_SSH_KEY`
- **Value:** Your private SSH key content
- **Description:** The private SSH key for accessing your VPS

To get your SSH key content, run this command in your local terminal:
```bash
cat ~/.ssh/hostinger_vps
```

Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`) and paste it as the secret value.

## Optional: Add GitHub Actions permission to VPS

For enhanced security, you can create a dedicated deployment key on your VPS:

1. **On your VPS**, create a new SSH key pair for GitHub Actions:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_key
```

2. **Add the public key to authorized_keys:**
```bash
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys
```

3. **Use the private key as VPS_SSH_KEY secret:**
```bash
cat ~/.ssh/github_actions_key
```

## Testing the Deployment

Once you've added the secrets:

1. Make a small change to your code
2. Commit and push to the `master` branch
3. Go to **Actions** tab in your GitHub repository
4. Watch the deployment workflow run

The workflow will:
- ✅ Check out your code
- ✅ Install dependencies
- ✅ Build the frontend
- ✅ Deploy to your VPS
- ✅ Run database migrations
- ✅ Restart Docker containers
- ✅ Perform health checks

## Troubleshooting

If deployment fails:

1. Check the **Actions** logs in GitHub
2. SSH into your VPS and check Docker logs:
```bash
docker logs broncos-pickems-backend
docker logs broncos-pickems-frontend
```

3. Check the deployment log on VPS:
```bash
cat /root/deployment.log
```

## Manual Deployment Trigger

You can also trigger deployments manually:
1. Go to **Actions** tab
2. Click on **Deploy to VPS** workflow
3. Click **Run workflow** button