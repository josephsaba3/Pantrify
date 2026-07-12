# Pantrify

A small shared grocery list with a mobile-first interface and SQLite purchase history.

## Run it

```powershell
py -3 app.py
```

Open `http://localhost:8000`. To share it with a partner on the same Wi-Fi, find this computer's IPv4 address with `ipconfig`, then open `http://YOUR-IP:8000` on both phones. Windows may ask you to allow Python through the firewall the first time.

The database is created automatically as `pantrify.sqlite3`. Set `PANTRIFY_DB` to store it elsewhere, or `PORT` to use a different port.

## Features

- Shared list split into Staples, Fruit & Vege, Snacks, Household, and Drinks
- Optional quantity or note on each item
- Checked items are logged as purchases
- “Last time” history with one-tap re-adding
- Previous purchase date shown when a familiar item returns to the list
- Automatic refresh every five seconds for simple two-person sharing
