export const demoUsers = [
  {
    id: 'user-001',
    username: 'investigator',
    email: 'investigator@cyberintel.gov',
    passwordHash: '$2a$10$IEYz5hAwcYlGtHq86MrLyuS8D08GnzI3/v5kDhlm1prB5eJoM8Yyq',
    role: 'investigator'
  }
]

export const demoAccounts = [
  { id: 'acc-001', accountNumber: 'SBIN0001001', balance: 250000, owner: 'A1', riskBand: 'HIGH' },
  { id: 'acc-002', accountNumber: 'SBIN0001002', balance: 186000, owner: 'A2', riskBand: 'MEDIUM' },
  { id: 'acc-003', accountNumber: 'SBIN0001003', balance: 92000, owner: 'A3', riskBand: 'LOW' },
  { id: 'acc-004', accountNumber: 'SBIN0001004', balance: 420000, owner: 'A4', riskBand: 'CRITICAL' },
  { id: 'acc-005', accountNumber: 'SBIN0001005', balance: 205000, owner: 'A5', riskBand: 'HIGH' },
  { id: 'acc-006', accountNumber: 'SBIN0001006', balance: 87000, owner: 'A6', riskBand: 'MEDIUM' }
]

export const demoATMLocations = [
  { id: 'atm-001', name: 'Chennai Central ATM', type: 'ATM', latitude: 13.0840, longitude: 80.2707, zone: 'Chennai', status: 'ACTIVE' },
  { id: 'atm-002', name: 'Anna Nagar ATM', type: 'ATM', latitude: 13.0877, longitude: 80.2106, zone: 'Chennai', status: 'ACTIVE' },
  { id: 'atm-003', name: 'T Nagar ATM', type: 'ATM', latitude: 13.0478, longitude: 80.2336, zone: 'Chennai', status: 'ACTIVE' },
  { id: 'atm-004', name: 'Velachery POS-14', type: 'POS', latitude: 12.9784, longitude: 80.2200, zone: 'Chennai', status: 'ACTIVE' },
  { id: 'atm-005', name: 'Bengaluru Airport ATM', type: 'ATM', latitude: 13.1986, longitude: 77.7068, zone: 'Bengaluru', status: 'ACTIVE' },
  { id: 'atm-006', name: 'Indiranagar POS-09', type: 'POS', latitude: 12.9716, longitude: 77.6412, zone: 'Bengaluru', status: 'ACTIVE' },
  { id: 'atm-007', name: 'Hyderabad Banjara ATM', type: 'ATM', latitude: 17.3850, longitude: 78.4867, zone: 'Hyderabad', status: 'ACTIVE' },
  { id: 'atm-008', name: 'Secunderabad POS-22', type: 'POS', latitude: 17.4399, longitude: 78.4983, zone: 'Hyderabad', status: 'ACTIVE' }
]

export const demoComplaints = [
  {
    id: 'CMP-1001',
    complaintDate: '2026-08-10',
    fraudType: 'UPI FRAUD',
    fraudAmount: 85000,
    victimIdentifier: 'VIC-1041',
    suspectedAccount: 'SBIN0001001',
    status: 'HIGH_RISK',
    location: 'Chennai',
    description: 'Victim reported repeated OTP and UPI credential sharing leading to fast transfer loss.',
    relatedAccounts: ['acc-001']
  },
  {
    id: 'CMP-1002',
    complaintDate: '2026-08-12',
    fraudType: 'ATM WITHDRAWAL',
    fraudAmount: 62000,
    victimIdentifier: 'VIC-2064',
    suspectedAccount: 'SBIN0001004',
    status: 'UNDER_INVESTIGATION',
    location: 'Bengaluru',
    description: 'ATM withdrawals followed by suspicious state-level cash movement pattern.',
    relatedAccounts: ['acc-004']
  },
  {
    id: 'CMP-1003',
    complaintDate: '2026-08-15',
    fraudType: 'IMPS FRAUD',
    fraudAmount: 41000,
    victimIdentifier: 'VIC-9721',
    suspectedAccount: 'SBIN0001002',
    status: 'NEW',
    location: 'Hyderabad',
    description: 'Multiple IMPS transactions from a compromised device in short period.',
    relatedAccounts: ['acc-002']
  },
  {
    id: 'CMP-1004',
    complaintDate: '2026-08-16',
    fraudType: 'NEFT FRAUD',
    fraudAmount: 96500,
    victimIdentifier: 'VIC-3282',
    suspectedAccount: 'SBIN0001005',
    status: 'HIGH_RISK',
    location: 'Chennai',
    description: 'Large NEFT transfer chain linked to account takeover and mule activity.',
    relatedAccounts: ['acc-005']
  },
  {
    id: 'CMP-1005',
    complaintDate: '2026-08-19',
    fraudType: 'BANKING FRAUD',
    fraudAmount: 25000,
    victimIdentifier: 'VIC-4851',
    suspectedAccount: 'SBIN0001003',
    status: 'RESOLVED',
    location: 'Coimbatore',
    description: 'Fraud alert triggered, account frozen before damage escalated.',
    relatedAccounts: ['acc-003']
  },
  {
    id: 'CMP-1006',
    complaintDate: '2026-08-22',
    fraudType: 'ATM WITHDRAWAL',
    fraudAmount: 73000,
    victimIdentifier: 'VIC-4812',
    suspectedAccount: 'SBIN0001006',
    status: 'UNDER_INVESTIGATION',
    location: 'Hyderabad',
    description: 'Cash withdrawals at multiple ATMs near transit hubs in less than 12 hours.',
    relatedAccounts: ['acc-006']
  }
]

export const demoTransactions = [
  { id: 'TXN-2001', sourceAccount: 'SBIN0001001', destinationAccount: 'BKG-8892', amount: 15000, timestamp: '2026-08-10T09:11:00Z', type: 'UPI', location: 'Chennai', status: 'SUSPICIOUS', riskIndicator: 'HIGH', riskScore: 84, atmLocationId: 'atm-001' },
  { id: 'TXN-2002', sourceAccount: 'SBIN0001001', destinationAccount: 'BKG-8893', amount: 23000, timestamp: '2026-08-10T11:48:00Z', type: 'IMPS', location: 'Chennai', status: 'SUSPICIOUS', riskIndicator: 'CRITICAL', riskScore: 92, atmLocationId: 'atm-002' },
  { id: 'TXN-2003', sourceAccount: 'SBIN0001001', destinationAccount: 'BKG-8894', amount: 16000, timestamp: '2026-08-10T13:30:00Z', type: 'ATM_WITHDRAWAL', location: 'Chennai', status: 'SUSPICIOUS', riskIndicator: 'HIGH', riskScore: 88, atmLocationId: 'atm-003' },
  { id: 'TXN-2004', sourceAccount: 'SBIN0001004', destinationAccount: 'BKG-9192', amount: 36000, timestamp: '2026-08-12T08:02:00Z', type: 'ATM_WITHDRAWAL', location: 'Bengaluru', status: 'SUSPICIOUS', riskIndicator: 'HIGH', riskScore: 81, atmLocationId: 'atm-005' },
  { id: 'TXN-2005', sourceAccount: 'SBIN0001004', destinationAccount: 'BKG-9193', amount: 25000, timestamp: '2026-08-12T10:14:00Z', type: 'ATM_WITHDRAWAL', location: 'Bengaluru', status: 'SUSPICIOUS', riskIndicator: 'HIGH', riskScore: 79, atmLocationId: 'atm-006' },
  { id: 'TXN-2006', sourceAccount: 'SBIN0001002', destinationAccount: 'BKG-5001', amount: 18000, timestamp: '2026-08-15T05:42:00Z', type: 'UPI', location: 'Hyderabad', status: 'SUSPICIOUS', riskIndicator: 'MEDIUM', riskScore: 62, atmLocationId: 'atm-007' },
  { id: 'TXN-2007', sourceAccount: 'SBIN0001002', destinationAccount: 'BKG-5005', amount: 22000, timestamp: '2026-08-15T08:55:00Z', type: 'IMPS', location: 'Hyderabad', status: 'SUSPICIOUS', riskIndicator: 'HIGH', riskScore: 74, atmLocationId: 'atm-008' },
  { id: 'TXN-2008', sourceAccount: 'SBIN0001005', destinationAccount: 'BKG-5501', amount: 40000, timestamp: '2026-08-16T14:27:00Z', type: 'NEFT', location: 'Chennai', status: 'SUSPICIOUS', riskIndicator: 'CRITICAL', riskScore: 93, atmLocationId: 'atm-001' },
  { id: 'TXN-2009', sourceAccount: 'SBIN0001005', destinationAccount: 'BKG-5502', amount: 56000, timestamp: '2026-08-16T18:01:00Z', type: 'NEFT', location: 'Chennai', status: 'SUSPICIOUS', riskIndicator: 'CRITICAL', riskScore: 96, atmLocationId: 'atm-002' },
  { id: 'TXN-2010', sourceAccount: 'SBIN0001006', destinationAccount: 'BKG-6102', amount: 31000, timestamp: '2026-08-22T07:20:00Z', type: 'ATM_WITHDRAWAL', location: 'Hyderabad', status: 'SUSPICIOUS', riskIndicator: 'HIGH', riskScore: 82, atmLocationId: 'atm-007' },
  { id: 'TXN-2011', sourceAccount: 'SBIN0001003', destinationAccount: 'BKG-7002', amount: 9000, timestamp: '2026-08-19T11:52:00Z', type: 'UPI', location: 'Coimbatore', status: 'CLEAR', riskIndicator: 'LOW', riskScore: 21, atmLocationId: 'atm-004' },
  { id: 'TXN-2012', sourceAccount: 'SBIN0001001', destinationAccount: 'BKG-8899', amount: 12000, timestamp: '2026-08-10T16:11:00Z', type: 'TRANSFER', location: 'Chennai', status: 'SUSPICIOUS', riskIndicator: 'MEDIUM', riskScore: 65, atmLocationId: 'atm-003' }
]

export const demoPredictionInput = [
  {
    caseId: 'CMP-1001',
    suspiciousAccount: 'SBIN0001001',
    previousWithdrawalLocations: ['Chennai Central ATM', 'Anna Nagar ATM'],
    recentActivity: 'High value transfers and ATM withdrawals in Chennai',
    behavioralPattern: 'Fast repeated transactions within 24 hours',
    candidateLocations: [
      { id: 'atm-001', name: 'Chennai Central ATM', latitude: 13.0840, longitude: 80.2707, score: 91 },
      { id: 'atm-002', name: 'Anna Nagar ATM', latitude: 13.0877, longitude: 80.2106, score: 88 },
      { id: 'atm-003', name: 'T Nagar ATM', latitude: 13.0478, longitude: 80.2336, score: 76 }
    ]
  },
  {
    caseId: 'CMP-1002',
    suspiciousAccount: 'SBIN0001004',
    previousWithdrawalLocations: ['Bengaluru Airport ATM'],
    recentActivity: 'Cash withdrawals near airport route',
    behavioralPattern: 'Nighttime withdrawals and multiple ATM visits',
    candidateLocations: [
      { id: 'atm-005', name: 'Bengaluru Airport ATM', latitude: 13.1986, longitude: 77.7068, score: 90 },
      { id: 'atm-006', name: 'Indiranagar POS-09', latitude: 12.9716, longitude: 77.6412, score: 67 }
    ]
  }
]
