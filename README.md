# Pantrify

A small shared grocery list with a mobile-first interface and SQLite purchase history.

## Run it

```powershell
py -3 app.py
```

Open `http://localhost:8000`. To share it with a partner on the same Wi-Fi, find this computer's IPv4 address with `ipconfig`, then open `http://YOUR-IP:8000` on both phones. Windows may ask you to allow Python through the firewall the first time.

The database is created automatically as `pantrify.sqlite3`. Set `PANTRIFY_DB` to store it elsewhere, or `PORT` to use a different port.

## Persistent SQLite on Railway

Railway's deployment filesystem is replaced on every deploy, so the SQLite file must live on a Railway Volume.

1. Open the Pantrify service in Railway.
2. Add a Volume and mount it at `/data`.
3. Redeploy or restart the service.

Pantrify automatically detects Railway's `RAILWAY_VOLUME_MOUNT_PATH` variable and stores the database at `/data/pantrify.sqlite3`. Purchase history and the shared list then survive Git deployments and service restarts.

`PANTRIFY_DB` remains the highest-priority override when you need a custom database location.

## Features

- Shared list split into Staples, Fruit & Vege, Snacks, Household, and Drinks
- Optional quantity or note on each item
- Checked items are logged as purchases
- “Last time” history with one-tap re-adding
- Previous purchase date shown when a familiar item returns to the list
- Automatic refresh every five seconds for simple two-person sharing
