# SAQR Fleet CRM (React + Vite + Supabase)

Enterprise CRM for fleet management: Trucks, Drivers, Trailers, Fleet Link, Employees, Clients, Suppliers, Brokers, Outsource.

## Project Structure

```
saqr-crm2/
├── backend/
│   └── supabase/
│       └── schema.sql       # Database schema, RLS policies, trigger & storage
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (FleetLink, EntityPage, Detail, Login, etc.)
│   │   ├── lib/             # db.js (Supabase client & auth), config, export, seed
│   │   ├── App.jsx          # App shell & router
│   │   ├── main.jsx         # Vite entry
│   │   └── styles.css       # Design system styles
│   ├── .env                 # Live Supabase URL and Anon Key
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── package.json             # Root workspace runner
└── README.md
```

## Running the Application

From root:
```bash
npm run dev
```

Or from `frontend/`:
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

## Configured Accounts (Supabase Auth)
- **Admin**: `admin@saqr.demo` / `Admin@123`
- **Operations**: `ops@saqr.demo` / `Ops@123`
- **Finance**: `finance@saqr.demo` / `Finance@123`

## Roles & Permissions
| Role | Can edit | Can delete | Sees salaries / prices |
|---|---|---|---|
| Admin | everything | yes | yes |
| Operations | trucks, drivers, trailers, fleet link, clients, suppliers, costs | no | no |
| Finance | employees, clients, suppliers, brokers, outsource, costs | no | yes |
