# Hosting Your Own Songle Signaling Worker

This guide is for someone who forks Songle and wants to run their own Cloudflare signaling Worker for multiplayer rooms.

The signaling Worker does not store Spotify tokens, audio, answers, or long-term quiz data. It only helps browsers find each other, elect a host, and exchange WebRTC connection messages.

## 1. Create A Cloudflare Account

1. Go to [cloudflare.com](https://www.cloudflare.com/).
2. Create a free account.
3. You do not need to buy a domain just to test the Worker. Cloudflare will give you a `workers.dev` URL.

## 2. Install Dependencies

Clone your fork, then install the app dependencies from the repo root:

```powershell
cd songle-fork
npm install
```

Then install the signaling Worker dependencies:

```powershell
cd signaling-worker
npm install
```

## 3. Log In To Cloudflare

From the `signaling-worker` folder:

```powershell
npx wrangler login
```

Wrangler will open a browser window. Log in and approve access.

## 4. Pick A Worker Name

Open:

```txt
signaling-worker/wrangler.jsonc
```

Change the `name` if you want a unique Worker name:

```jsonc
"name": "my-songle-signaling"
```

The Durable Object binding and migration can stay as they are.

## 5. Deploy The Signaling Worker

From the `signaling-worker` folder:

```powershell
npx wrangler deploy
```

After deploy, Wrangler prints a URL like:

```txt
https://my-songle-signaling.your-subdomain.workers.dev
```

Copy that URL.

## 6. Point Songle At Your Worker

In the main Songle app environment, set:

```env
NEXT_PUBLIC_SIGNALING_URL=https://my-songle-signaling.your-subdomain.workers.dev
```

For local testing, put it in `.env.local` in the repo root.

For production hosting, set the same environment variable wherever you deploy the Next.js app.

## 7. Test It

Run the app locally:

```powershell
cd ..
npm run dev
```

Open the quiz in two browsers or devices and create/join a room. If the Worker is working, both clients should connect to the same room and see each other.

You can also check the Worker health endpoint:

```txt
https://my-songle-signaling.your-subdomain.workers.dev/health
```

It should return:

```json
{ "ok": true }
```

## Optional: Use Your Own Domain

If you own a domain in Cloudflare, you can attach a custom hostname such as:

```txt
signal.yourdomain.com
```

In `signaling-worker/wrangler.jsonc`, uncomment and edit the `routes` block:

```jsonc
"routes": [
  {
    "pattern": "signal.yourdomain.com",
    "custom_domain": true
  }
]
```

Then deploy again:

```powershell
npx wrangler deploy
```

Use the custom domain as your app env value:

```env
NEXT_PUBLIC_SIGNALING_URL=https://signal.yourdomain.com
```

## Common Issues

If `npx wrangler login` does not open a browser, copy the printed login URL manually.

If room joining fails, confirm `NEXT_PUBLIC_SIGNALING_URL` starts with `https://`. The app automatically converts it to `wss://` for WebSocket rooms.

If deployment fails after renaming the Worker, make sure `wrangler.jsonc` is valid JSONC and that the Durable Object migration still exists.
