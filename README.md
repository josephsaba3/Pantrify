# Pantrify

A small shared grocery list with a mobile-first interface and PostgreSQL purchase history. Also a features a table tennis game in HTML5 because I was too lazy to deploy a separate server.

## Run it

```powershell
py -3 app.py
```

Open `http://localhost:8000`. To share it with a partner on the same Wi-Fi, find this computer's IPv4 address with `ipconfig`, then open `http://YOUR-IP:8000` on both phones. Windows may ask you to allow Python through the firewall the first time.

PostgreSQL is required. Set `DATABASE_URL` before starting the app.

## PostgreSQL on Railway

Add a `DATABASE_URL` reference variable to the Pantrify service using `${{Postgres.DATABASE_URL}}` (adjust `Postgres` if the database service has another name). Railway installs the driver from `requirements.txt` during deployment.
## Features

- Shared list split into Staples, Fruit & Vege, Snacks, Household, and Drinks
- Edit a listed product, including its category and quantity or note
- Add and rename colour-coded categories from Settings
- Checked items are logged as purchases
- “Last time” history with one-tap re-adding
- Previous purchase date shown when a familiar item returns to the list
- Automatic refresh every five seconds for simple two-person sharing
