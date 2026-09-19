export const atmLocations = [
  { atm_id: 'ATM-001', atm_name: 'Chennai Central ATM', latitude: 13.084, longitude: 80.2707, city: 'Chennai', area: 'Central', atm_type: 'ATM' },
  { atm_id: 'ATM-002', atm_name: 'Anna Nagar ATM', latitude: 13.0877, longitude: 80.2106, city: 'Chennai', area: 'Anna Nagar', atm_type: 'ATM' },
  { atm_id: 'ATM-003', atm_name: 'T Nagar ATM', latitude: 13.0478, longitude: 80.2336, city: 'Chennai', area: 'T Nagar', atm_type: 'ATM' },
  { atm_id: 'ATM-004', atm_name: 'Velachery POS-14', latitude: 12.9784, longitude: 80.22, city: 'Chennai', area: 'Velachery', atm_type: 'POS' },
  { atm_id: 'ATM-005', atm_name: 'Bengaluru Airport ATM', latitude: 13.1986, longitude: 77.7068, city: 'Bengaluru', area: 'Airport', atm_type: 'ATM' },
  { atm_id: 'ATM-006', atm_name: 'Indiranagar POS-09', latitude: 12.9716, longitude: 77.6412, city: 'Bengaluru', area: 'Indiranagar', atm_type: 'POS' },
  { atm_id: 'ATM-007', atm_name: 'Hyderabad Banjara ATM', latitude: 17.385, longitude: 78.4867, city: 'Hyderabad', area: 'Banjara', atm_type: 'ATM' },
  { atm_id: 'ATM-008', atm_name: 'Secunderabad POS-22', latitude: 17.4399, longitude: 78.4983, city: 'Hyderabad', area: 'Secunderabad', atm_type: 'POS' },
  { atm_id: 'ATM-009', atm_name: 'Coimbatore Market ATM', latitude: 11.0168, longitude: 76.9558, city: 'Coimbatore', area: 'Market', atm_type: 'ATM' },
  { atm_id: 'ATM-010', atm_name: 'Pune Camp ATM', latitude: 18.5204, longitude: 73.8567, city: 'Pune', area: 'Camp', atm_type: 'ATM' },
  { atm_id: 'ATM-011', atm_name: 'Pune Station POS-3', latitude: 18.5203, longitude: 73.8569, city: 'Pune', area: 'Station', atm_type: 'POS' },
  { atm_id: 'ATM-012', atm_name: 'Nungambakkam ATM', latitude: 13.062, longitude: 80.249, city: 'Chennai', area: 'Nungambakkam', atm_type: 'ATM' },
  { atm_id: 'ATM-013', atm_name: 'Koramangala POS-7', latitude: 12.9352, longitude: 77.6245, city: 'Bengaluru', area: 'Koramangala', atm_type: 'POS' },
  { atm_id: 'ATM-014', atm_name: 'Madhapur ATM', latitude: 17.4399, longitude: 78.3915, city: 'Hyderabad', area: 'Madhapur', atm_type: 'ATM' },
  { atm_id: 'ATM-015', atm_name: 'Peelamedu ATM', latitude: 11.0183, longitude: 76.9625, city: 'Coimbatore', area: 'Peelamedu', atm_type: 'ATM' },
  { atm_id: 'ATM-016', atm_name: 'Kharadi POS-12', latitude: 18.551, longitude: 73.927, city: 'Pune', area: 'Kharadi', atm_type: 'POS' },
  { atm_id: 'ATM-017', atm_name: 'Mylapore ATM', latitude: 13.0413, longitude: 80.263, city: 'Chennai', area: 'Mylapore', atm_type: 'ATM' },
  { atm_id: 'ATM-018', atm_name: 'Whitefield ATM', latitude: 12.9698, longitude: 77.7499, city: 'Bengaluru', area: 'Whitefield', atm_type: 'ATM' },
  { atm_id: 'ATM-019', atm_name: 'Gachibowli ATM', latitude: 17.4401, longitude: 78.3489, city: 'Hyderabad', area: 'Gachibowli', atm_type: 'ATM' },
  { atm_id: 'ATM-020', atm_name: 'Vijayawada ATM', latitude: 16.5062, longitude: 80.648, city: 'Vijayawada', area: 'City Center', atm_type: 'ATM' }
]

export const accounts = Array.from({ length: 50 }, (_, index) => {
  const id = index + 1
  const riskBands = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  const riskIndicator = riskBands[id % riskBands.length]
  const cities = ['Chennai', 'Bengaluru', 'Hyderabad', 'Coimbatore', 'Pune']
  return {
    account_id: `ACC-${String(id).padStart(4, '0')}`,
    account_number: `SBIN${String(100000 + id).padStart(8, '0')}`,
    account_type: id % 2 === 0 ? 'SAVINGS' : 'CURRENT',
    account_status: 'ACTIVE',
    city: cities[id % cities.length],
    risk_indicator: riskIndicator,
    balance: 45000 + id * 6250,
    owner: `Owner-${String(id).padStart(3, '0')}`
  }
})

export const complaints = Array.from({ length: 24 }, (_, index) => {
  const account = accounts[(index * 2) % accounts.length]
  const cities = ['Chennai', 'Bengaluru', 'Hyderabad', 'Coimbatore', 'Pune']
  const statusOptions = ['NEW', 'UNDER_INVESTIGATION', 'HIGH_RISK', 'RESOLVED']
  const fraudTypes = ['UPI FRAUD', 'ATM WITHDRAWAL', 'IMPS FRAUD', 'NEFT FRAUD', 'BANKING FRAUD']
  const amount = 18000 + ((index + 3) * 7423) % 120000
  return {
    complaint_id: `CMP-${String(1000 + index + 1).padStart(4, '0')}`,
    complaint_date: new Date(Date.now() - index * 86400000).toISOString().slice(0, 10),
    fraud_type: fraudTypes[index % fraudTypes.length],
    fraud_amount: amount,
    victim_id: `VIC-${String(1000 + index + 1).padStart(5, '0')}`,
    suspected_account: account.account_number,
    status: statusOptions[index % statusOptions.length],
    location: cities[index % cities.length],
    description: `Synthetic complaint ${index + 1} indicating suspicious fraud pattern in ${cities[index % cities.length]}.`
  }
})

export const transactions = Array.from({ length: 1200 }, (_, index) => {
  const account = accounts[(index * 7) % accounts.length]
  const destination = `BKG-${String(5000 + index).padStart(6, '0')}`
  const amount = 5000 + ((index * 3891) % 66000)
  const transactionTypes = ['UPI', 'IMPS', 'NEFT', 'TRANSFER', 'ATM_WITHDRAWAL']
  const city = ['Chennai', 'Bengaluru', 'Hyderabad', 'Coimbatore', 'Pune'][index % 5]
  const status = index % 5 === 0 ? 'SUSPICIOUS' : 'CLEAR'
  const riskIndicator = status === 'SUSPICIOUS'
    ? (amount > 40000 ? 'CRITICAL' : amount > 20000 ? 'HIGH' : 'MEDIUM')
    : 'LOW'
  return {
    transaction_id: `TXN-${String(2000 + index).padStart(5, '0')}`,
    timestamp: new Date(Date.now() - index * 3600000).toISOString(),
    source_account: account.account_number,
    destination_account: destination,
    amount,
    transaction_type: transactionTypes[index % transactionTypes.length],
    location: city,
    atm_id: atmLocations[(index + 1) % atmLocations.length].atm_id,
    status,
    risk_indicator: riskIndicator,
    risk_score: status === 'SUSPICIOUS' ? Math.min(30 + (amount / 1200), 99) : Math.min(10 + (amount / 4000), 28)
  }
})

export const withdrawals = Array.from({ length: 150 }, (_, index) => {
  const account = accounts[(index * 3) % accounts.length]
  const location = atmLocations[index % atmLocations.length]
  return {
    withdrawal_id: `WDR-${String(3000 + index).padStart(5, '0')}`,
    account_id: account.account_id,
    atm_id: location.atm_id,
    amount: 5000 + ((index * 3741) % 60000),
    timestamp: new Date(Date.now() - index * 7200000).toISOString(),
    latitude: location.latitude,
    longitude: location.longitude
  }
})

export const predictionRecords = complaints.slice(0, 12).map((complaint, index) => {
  const topLocations = atmLocations.slice(index % 3, index % 3 + 3)
  return {
    prediction_id: `PRED-${String(5000 + index).padStart(5, '0')}`,
    complaint_id: complaint.complaint_id,
    atm_id: topLocations[0].atm_id,
    prediction_score: 82 + ((index * 7) % 16),
    risk_level: index % 2 === 0 ? 'HIGH' : 'MEDIUM',
    explanation: `Risk based on recent high-value withdrawals and repeated behavioural activity near ${complaint.location}.`
  }
})

export const datasetSummary = {
  dataSource: 'Synthetic Demo Dataset',
  purpose: 'Application demonstration and end-to-end workflow testing',
  records: {
    complaints: complaints.length,
    accounts: accounts.length,
    transactions: transactions.length,
    withdrawals: withdrawals.length,
    atm_locations: atmLocations.length,
    predictions: predictionRecords.length
  },
  note: 'Synthetic, internally consistent, and not a claim of live NCRP or Indian banking data.'
}

export default {
  atmLocations,
  accounts,
  complaints,
  transactions,
  withdrawals,
  predictionRecords,
  datasetSummary
}
