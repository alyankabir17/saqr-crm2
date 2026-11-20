// Demo data. Only used when Supabase is NOT configured. Dates are relative to today.
const uid = () => crypto.randomUUID()
const day = (n) => {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
let s = 11
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (a, b) => Math.floor(a + rnd() * (b - a + 1))

export function seed() {
  const ts = new Date().toISOString()
  const mk = (arr) => arr.map((o) => ({ id: uid(), created_at: ts, ...o }))

  const trucks = mk([
    { plate: 'DXB A 41263', make: 'Volvo', model: 'FH16', year: 2021, type: 'Prime mover', purchase_price: 385000, mulkiya_expiry: day(-12), insurance_expiry: day(140), status: 'Active' },
    { plate: 'DXB B 20871', make: 'Mercedes-Benz', model: 'Actros 2645', year: 2020, type: 'Prime mover', purchase_price: 342000, mulkiya_expiry: day(210), insurance_expiry: day(28), status: 'Active' },
    { plate: 'SHJ 3 58412', make: 'Scania', model: 'R500', year: 2022, type: 'Prime mover', purchase_price: 410000, mulkiya_expiry: day(320), insurance_expiry: day(300), status: 'Active' },
    { plate: 'DXB C 77305', make: 'MAN', model: 'TGX 18.440', year: 2019, type: 'Flatbed', purchase_price: 268000, mulkiya_expiry: day(41), insurance_expiry: day(95), status: 'Maintenance' },
    { plate: 'AUH 12 90456', make: 'Isuzu', model: 'GIGA', year: 2021, type: 'Tipper', purchase_price: 231000, mulkiya_expiry: day(180), insurance_expiry: day(-3), status: 'Active' },
    { plate: 'DXB D 16620', make: 'Hino', model: '700 Series', year: 2018, type: 'Tipper', purchase_price: 205000, mulkiya_expiry: day(260), insurance_expiry: day(260), status: 'Active' },
    { plate: 'DXB E 83194', make: 'DAF', model: 'XF 480', year: 2023, type: 'Prime mover', purchase_price: 398000, mulkiya_expiry: day(400), insurance_expiry: day(390), status: 'Active' },
    { plate: 'RAK 7 22013', make: 'Mitsubishi', model: 'Fuso FJ', year: 2017, type: 'Box truck', purchase_price: 142000, mulkiya_expiry: day(88), insurance_expiry: day(88), status: 'Inactive' },
  ])
  const drivers = mk([
    { name: 'Imran Khan', phone: '+971 50 412 8830', licence_no: 'DL-1048822', licence_expiry: day(-30), salary: 3200, status: 'Active' },
    { name: 'Rashid Mehmood', phone: '+971 55 301 7745', licence_no: 'DL-2210934', licence_expiry: day(190), salary: 3000, status: 'Active' },
    { name: 'Mohammed Ali', phone: '+971 52 678 1190', licence_no: 'DL-1930127', licence_expiry: day(22), salary: 3400, status: 'Active' },
    { name: 'Sajid Hussain', phone: '+971 50 884 5521', licence_no: 'DL-3011458', licence_expiry: day(365), salary: 2800, status: 'Active' },
    { name: 'Nadeem Akhtar', phone: '+971 56 219 6603', licence_no: 'DL-2784019', licence_expiry: day(120), salary: 2900, status: 'On leave' },
    { name: 'Abdul Rehman', phone: '+971 54 770 3318', licence_no: 'DL-1567730', licence_expiry: day(44), salary: 3100, status: 'Active' },
    { name: 'Faisal Iqbal', phone: '+971 50 145 9072', licence_no: 'DL-3340561', licence_expiry: day(500), salary: 2600, status: 'Active' },
    { name: 'Tariq Aziz', phone: '+971 55 903 2287', licence_no: 'DL-2098846', licence_expiry: day(75), salary: 2700, status: 'Inactive' },
  ])
  const trailers = mk([
    { number: 'TR-101', type: 'Flatbed 40ft', capacity: '30 t', status: 'Active' },
    { number: 'TR-102', type: 'Skeleton 40ft', capacity: '32 t', status: 'Active' },
    { number: 'TR-103', type: 'Lowbed', capacity: '45 t', status: 'Active' },
    { number: 'TR-104', type: 'Curtain side', capacity: '28 t', status: 'Active' },
    { number: 'TR-105', type: 'Skeleton 20ft', capacity: '24 t', status: 'Active' },
    { number: 'TR-106', type: 'Flatbed 40ft', capacity: '30 t', status: 'Inactive' },
    { number: 'TR-107', type: 'Tanker', capacity: '34,000 L', status: 'Active' },
  ])
  const fleet_links = mk(
    [0, 1, 2, 3, 4, 5].map((i) => ({ truck_id: trucks[i].id, driver_id: drivers[i].id, trailer_id: trailers[i].id }))
  )
  const employees = mk([
    { name: 'Huda Al Mansoori', designation: 'Operations Manager', phone: '+971 50 222 1010', salary: 9500, status: 'Active' },
    { name: 'Priya Nair', designation: 'Accountant', phone: '+971 55 410 2288', salary: 6500, status: 'Active' },
    { name: 'Omar Farooq', designation: 'Dispatcher', phone: '+971 52 118 7790', salary: 4500, status: 'Active' },
    { name: 'Sana Yusuf', designation: 'HR & Admin', phone: '+971 56 330 9145', salary: 5000, status: 'Active' },
    { name: 'Joseph Mathew', designation: 'Receptionist', phone: '+971 54 665 0021', salary: 3200, status: 'Inactive' },
  ])
  const clients = mk([
    { name: 'Gulf Logistics LLC', contact: 'Khalid Saeed', phone: '+971 4 331 2200', email: 'ops@gulflogistics.ae', status: 'Active' },
    { name: 'Jebel Ali Freight Services', contact: 'Anita Sharma', phone: '+971 4 887 4410', email: 'dispatch@jafs.ae', status: 'Active' },
    { name: 'Al Noor Building Materials', contact: 'Yousef Hamdan', phone: '+971 6 552 1090', email: 'orders@alnoorbm.ae', status: 'Active' },
    { name: 'Emirates Steel Traders', contact: 'Rizwan Ahmed', phone: '+971 2 678 3345', email: 'logistics@emsteel.ae', status: 'Active' },
    { name: 'Sharjah Cargo Hub', contact: 'Mariam Al Zaabi', phone: '+971 6 530 7712', email: 'hub@sharjahcargo.ae', status: 'Active' },
    { name: 'Desert Cement Co.', contact: 'Vikram Rao', phone: '+971 7 244 6008', email: 'supply@desertcement.ae', status: 'Inactive' },
  ])
  const suppliers = mk([
    { name: 'ADNOC Distribution', category: 'Fuel', phone: '+971 600 565 666', email: 'fleet@adnocdist.ae', status: 'Active' },
    { name: 'Emarat Fuel Cards', category: 'Fuel', phone: '+971 800 3627', email: 'cards@emarat.ae', status: 'Active' },
    { name: 'Al Quoz Heavy Garage', category: 'Garage', phone: '+971 4 339 8120', email: 'service@aqheavy.ae', status: 'Active' },
    { name: 'Sharaf Spare Parts', category: 'Parts', phone: '+971 4 285 6671', email: 'sales@sharafparts.ae', status: 'Active' },
    { name: 'Gulf Tyres Trading', category: 'Tyres', phone: '+971 6 534 2209', email: 'info@gulftyres.ae', status: 'Active' },
    { name: 'Hamriyah Welding Works', category: 'Garage', phone: '+971 6 526 1177', email: '', status: 'Inactive' },
  ])
  const brokers = mk([
    { name: 'Zahid Mahmood', phone: '+971 50 771 3049', commission_pct: 5, status: 'Active' },
    { name: 'Ali Shaikh', phone: '+971 55 604 8812', commission_pct: 4, status: 'Active' },
    { name: 'Bilal Chaudhry', phone: '+971 52 905 1176', commission_pct: 6, status: 'Active' },
    { name: 'Suresh Pillai', phone: '+971 56 288 4430', commission_pct: 3.5, status: 'Inactive' },
  ])
  const outsource_owners = mk([
    { name: 'Al Waha Transport', phone: '+971 50 330 6612', paid: 0, status: 'Active' },
    { name: 'Rashid Bin Saeed Trucking', phone: '+971 55 801 2290', paid: 0, status: 'Active' },
    { name: 'Noor Al Bahar Haulage', phone: '+971 52 417 7753', paid: 0, status: 'Active' },
    { name: 'Gharib Freight Owner', phone: '+971 54 109 5586', paid: 0, status: 'Inactive' },
  ])

  const routes = ['Jebel Ali → Dubai Industrial City', 'Khalifa Port → Sharjah', 'Dubai → Abu Dhabi (Mussafah)', 'Jebel Ali → Al Ain', 'Sharjah → Fujairah', 'Dubai → Ras Al Khaimah', 'Port Rashid → Ajman']
  const trips = []
  for (let i = 0; i < 46; i++) {
    const ago = rnd() < 0.5 ? int(0, 18) : int(0, 58)
    const rate = int(8, 40) * 100
    const out = rnd() < 0.22
    const link = pick(fleet_links)
    trips.push({
      id: uid(), created_at: ts, date: day(-ago), client_id: pick(clients.slice(0, 5)).id,
      truck_id: out ? null : link.truck_id, driver_id: out ? null : link.driver_id,
      broker_id: rnd() < 0.3 ? pick(brokers.slice(0, 3)).id : null,
      outsource_id: out ? pick(outsource_owners.slice(0, 3)).id : null,
      route: pick(routes), rate, outsource_cost: out ? Math.round((rate * 0.8) / 50) * 50 : 0,
      status: ago < 1 ? 'In transit' : ago < 3 ? pick(['In transit', 'Delivered']) : rnd() < 0.05 ? 'Cancelled' : 'Delivered',
    })
  }
  trips.sort((a, b) => b.date.localeCompare(a.date))
  outsource_owners.forEach((o) => {
    const pay = trips.filter((t) => t.outsource_id === o.id && t.status !== 'Cancelled').reduce((a, t) => a + t.outsource_cost, 0)
    o.paid = Math.round((pay * 0.6) / 100) * 100
  })

  const costs = []
  const push = (t, kind, ago, amount, note) => costs.push({ id: uid(), created_at: ts, truck_id: t.id, kind, date: day(-ago), amount, note })
  trucks.forEach((t) => {
    for (let i = 0; i < 4; i++) push(t, 'diesel', i * 9 + int(0, 5), int(380, 780), pick(['ADNOC Al Quoz', 'Emarat Jebel Ali', 'ADNOC Sharjah']))
    for (let i = 0; i < int(1, 2); i++) push(t, 'maintenance', int(5, 80), int(3, 45) * 100, pick(['Oil & filter change', 'Brake pads', 'Tyre replacement', 'AC service', 'Clutch adjustment']))
    if (rnd() < 0.6) push(t, 'fine', int(5, 60), pick([300, 400, 600, 1000]), pick(['Speeding', 'Parking', 'Lane violation']))
    if (rnd() < 0.7) push(t, 'advance', int(1, 30), pick([200, 300, 500, 800]), 'Driver advance for trip')
  })
  return { trucks, drivers, trailers, fleet_links, employees, clients, suppliers, brokers, outsource_owners, truck_costs: costs, trips }
}
