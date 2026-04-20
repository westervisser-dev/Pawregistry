// ─── Pawregistry admin prototype data ─────────────────────────────────────────
// ZAR pricing, SA cities, realistic breeder scenarios.

window.PAW_DATA = (function () {
  const ZAR = (n) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  const shortDate = (iso) => new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });

  // ── Litters ──────────────────────────────────────────────────────────────
  const litters = [
    {
      id: 'l-wren',
      name: "Wren's Autumn Litter",
      breed: 'Cavapoo',
      size: 'Mini',
      status: 'available',
      dateOfBirth: '2026-02-14',
      goHomeDate: '2026-04-25',
      selectionDate: '2026-04-05',
      puppyCount: 6,
      availableCount: 2,
      depositAmount: 5000,
      coverLabel: 'Wren · Cavapoo mini',
      damName: 'Wren',
      sireName: 'Biscuit',
    },
    {
      id: 'l-juniper',
      name: "Juniper's First Litter",
      breed: 'Golden Doodle',
      size: 'Mini',
      status: 'available',
      dateOfBirth: '2026-03-02',
      goHomeDate: '2026-05-11',
      selectionDate: '2026-04-20',
      puppyCount: 7,
      availableCount: 4,
      depositAmount: 5000,
      coverLabel: 'Juniper · Mini goldendoodle',
      damName: 'Juniper',
      sireName: 'Atlas',
    },
    {
      id: 'l-pearl',
      name: "Pearl's Winter Litter",
      breed: 'Cavalier KCS',
      size: 'Standard',
      status: 'booked',
      dateOfBirth: '2026-01-09',
      goHomeDate: '2026-03-22',
      selectionDate: '2026-03-01',
      puppyCount: 5,
      availableCount: 0,
      depositAmount: 5000,
      coverLabel: 'Pearl · Cavalier KCS',
      damName: 'Pearl',
      sireName: 'Dexter',
    },
    {
      id: 'l-ivy',
      name: "Ivy's Planned Litter",
      breed: 'Cockapoo',
      size: 'Standard',
      status: 'planned',
      dateOfBirth: null,
      goHomeDate: null,
      selectionDate: '2026-07-10',
      puppyCount: null,
      availableCount: null,
      depositAmount: 5000,
      coverLabel: 'Ivy · Cockapoo',
      damName: 'Ivy',
      sireName: 'Rupert',
    },
    {
      id: 'l-maisie',
      name: "Maisie's Spring Litter",
      breed: 'Poodle',
      size: 'Mini',
      status: 'completed',
      dateOfBirth: '2025-09-12',
      goHomeDate: '2025-11-24',
      selectionDate: '2025-11-03',
      puppyCount: 4,
      availableCount: 0,
      depositAmount: 5000,
      coverLabel: 'Maisie · Mini poodle',
      damName: 'Maisie',
      sireName: 'Finley',
    },
  ];

  // ── Puppies (for Wren's litter mostly) ───────────────────────────────────
  const puppies = [
    { id: 'p-w1', litterId: 'l-wren', collar: 'Rust', sex: 'male',   colour: 'Apricot',      status: 'puppy_fully_paid', weight: 2100, price: 28000, clientId: 'c-001' },
    { id: 'p-w2', litterId: 'l-wren', collar: 'Olive', sex: 'female', colour: 'Cream',        status: 'booked',           weight: 1950, price: 28000, clientId: 'c-002' },
    { id: 'p-w3', litterId: 'l-wren', collar: 'Sky',   sex: 'male',   colour: 'Red',          status: 'reserved',         weight: 2200, price: 28000, clientId: 'c-003' },
    { id: 'p-w4', litterId: 'l-wren', collar: 'Plum',  sex: 'female', colour: 'Chocolate',    status: 'available',        weight: 2050, price: 28000, clientId: null },
    { id: 'p-w5', litterId: 'l-wren', collar: 'Sand',  sex: 'female', colour: 'Apricot',      status: 'available',        weight: 1880, price: 28000, clientId: null },
    { id: 'p-w6', litterId: 'l-wren', collar: 'Moss',  sex: 'male',   colour: 'Red & white',  status: 'retained',         weight: 2300, price: null,  clientId: null },
  ];

  // ── Clients ──────────────────────────────────────────────────────────────
  // Stages: enquired / approved / rejected / waitlisted / puppy_reserved / puppy_booked / puppy_fully_paid
  const clients = [
    { id: 'c-001', firstName: 'Hannah',   lastName: 'van der Merwe', email: 'hannah.vdm@gmail.com',    city: 'Stellenbosch',  stage: 'puppy_fully_paid', depositStatus: 'paid',    depositTier: 'r5000', priority: 1, litterId: 'l-wren',    puppyId: 'p-w1', paid: 28000, total: 28000, appliedAt: '2025-08-14', updatedAt: '2026-04-04' },
    { id: 'c-002', firstName: 'Thandi',   lastName: 'Mokoena',       email: 'thandi.m@outlook.com',    city: 'Johannesburg',  stage: 'puppy_booked',     depositStatus: 'paid',    depositTier: 'r5000', priority: 2, litterId: 'l-wren',    puppyId: 'p-w2', paid: 10000, total: 28000, appliedAt: '2025-09-02', updatedAt: '2026-04-11' },
    { id: 'c-003', firstName: 'Marius',   lastName: 'Joubert',       email: 'marius.joubert@me.com',   city: 'Cape Town',     stage: 'puppy_reserved',   depositStatus: 'pending', depositTier: 'r500',  priority: 3, litterId: 'l-wren',    puppyId: 'p-w3', paid: 500,   total: 28000, appliedAt: '2025-10-18', updatedAt: '2026-04-18', bookingExpiresAt: '2026-04-25' },
    { id: 'c-004', firstName: 'Priya',    lastName: 'Naidoo',        email: 'p.naidoo@icloud.com',     city: 'Durban',        stage: 'waitlisted',       depositStatus: 'paid',    depositTier: 'r5000', priority: 4, litterId: null,        puppyId: null,   paid: 5000,  total: null,  appliedAt: '2025-11-02', updatedAt: '2026-03-01' },
    { id: 'c-005', firstName: 'Lerato',   lastName: 'Dlamini',       email: 'lerato.d@gmail.com',      city: 'Pretoria',      stage: 'waitlisted',       depositStatus: 'paid',    depositTier: 'r5000', priority: 5, litterId: null,        puppyId: null,   paid: 5000,  total: null,  appliedAt: '2025-12-09', updatedAt: '2026-02-14' },
    { id: 'c-006', firstName: 'Johan',    lastName: 'Pretorius',     email: 'johan.p@webmail.co.za',   city: 'Bloemfontein',  stage: 'waitlisted',       depositStatus: 'pending', depositTier: 'r500',  priority: 6, litterId: null,        puppyId: null,   paid: 500,   total: null,  appliedAt: '2026-01-15', updatedAt: '2026-03-18' },
    { id: 'c-007', firstName: 'Amara',    lastName: 'Khumalo',       email: 'amara.k@gmail.com',       city: 'Sandton',       stage: 'waitlisted',       depositStatus: 'none',    depositTier: null,    priority: 7, litterId: null,        puppyId: null,   paid: 0,     total: null,  appliedAt: '2026-02-02', updatedAt: '2026-03-28' },
    { id: 'c-008', firstName: 'Ruan',     lastName: 'Botha',         email: 'ruan.botha@gmail.com',    city: 'Paarl',         stage: 'approved',         depositStatus: 'none',    depositTier: null,    priority: 8, litterId: null,        puppyId: null,   paid: 0,     total: null,  appliedAt: '2026-03-10', updatedAt: '2026-03-15' },
    { id: 'c-009', firstName: 'Nomsa',    lastName: 'Zulu',          email: 'nomsa.zulu@yahoo.com',    city: 'East London',   stage: 'approved',         depositStatus: 'none',    depositTier: null,    priority: 9, litterId: null,        puppyId: null,   paid: 0,     total: null,  appliedAt: '2026-03-22', updatedAt: '2026-03-29' },
    { id: 'c-010', firstName: 'Kagiso',   lastName: 'Mahlangu',      email: 'kagiso.m@gmail.com',      city: 'Centurion',     stage: 'enquired',         depositStatus: 'none',    depositTier: null,    priority: 10, litterId: null,       puppyId: null,   paid: 0,     total: null,  appliedAt: '2026-04-12', updatedAt: '2026-04-12' },
    { id: 'c-011', firstName: 'Sophia',   lastName: 'Fourie',        email: 'sophia.fourie@gmail.com', city: 'George',        stage: 'enquired',         depositStatus: 'none',    depositTier: null,    priority: 11, litterId: null,       puppyId: null,   paid: 0,     total: null,  appliedAt: '2026-04-17', updatedAt: '2026-04-17' },
    { id: 'c-012', firstName: 'Declan',   lastName: "O'Brien",       email: 'd.obrien@mweb.co.za',     city: 'Hermanus',      stage: 'enquired',         depositStatus: 'none',    depositTier: null,    priority: 12, litterId: null,       puppyId: null,   paid: 0,     total: null,  appliedAt: '2026-04-19', updatedAt: '2026-04-19' },
    { id: 'c-013', firstName: 'Anele',    lastName: 'Mthembu',       email: 'anele.mthembu@gmail.com', city: 'Polokwane',     stage: 'rejected',         depositStatus: 'none',    depositTier: null,    priority: 13, litterId: null,       puppyId: null,   paid: 0,     total: null,  appliedAt: '2026-02-28', updatedAt: '2026-03-04' },
  ];

  // ── Payments ─────────────────────────────────────────────────────────────
  const payments = [
    { id: 'pay-001', clientId: 'c-001', clientName: 'Hannah van der Merwe', type: 'final',   amount: 18000, status: 'complete', reference: 'PR-2026-041', paidAt: '2026-04-04', dueDate: '2026-04-10' },
    { id: 'pay-002', clientId: 'c-001', clientName: 'Hannah van der Merwe', type: 'booking', amount: 5000,  status: 'complete', reference: 'PR-2026-012', paidAt: '2026-01-22', dueDate: null },
    { id: 'pay-003', clientId: 'c-001', clientName: 'Hannah van der Merwe', type: 'deposit', amount: 5000,  status: 'complete', reference: 'PR-2025-088', paidAt: '2025-08-20', dueDate: null },
    { id: 'pay-004', clientId: 'c-002', clientName: 'Thandi Mokoena',       type: 'booking', amount: 5000,  status: 'complete', reference: 'PR-2026-035', paidAt: '2026-03-14', dueDate: null },
    { id: 'pay-005', clientId: 'c-002', clientName: 'Thandi Mokoena',       type: 'deposit', amount: 5000,  status: 'complete', reference: 'PR-2025-101', paidAt: '2025-09-08', dueDate: null },
    { id: 'pay-006', clientId: 'c-002', clientName: 'Thandi Mokoena',       type: 'final',   amount: 18000, status: 'pending',  reference: 'PR-2026-058', paidAt: null,         dueDate: '2026-04-22' },
    { id: 'pay-007', clientId: 'c-003', clientName: 'Marius Joubert',       type: 'deposit', amount: 500,   status: 'complete', reference: 'PR-2025-124', paidAt: '2025-10-20', dueDate: null },
    { id: 'pay-008', clientId: 'c-003', clientName: 'Marius Joubert',       type: 'booking', amount: 4500,  status: 'pending',  reference: 'PR-2026-061', paidAt: null,         dueDate: '2026-04-25' },
    { id: 'pay-009', clientId: 'c-004', clientName: 'Priya Naidoo',         type: 'deposit', amount: 5000,  status: 'complete', reference: 'PR-2025-132', paidAt: '2025-11-05', dueDate: null },
    { id: 'pay-010', clientId: 'c-005', clientName: 'Lerato Dlamini',       type: 'deposit', amount: 5000,  status: 'complete', reference: 'PR-2025-147', paidAt: '2025-12-12', dueDate: null },
    { id: 'pay-011', clientId: 'c-006', clientName: 'Johan Pretorius',      type: 'deposit', amount: 500,   status: 'complete', reference: 'PR-2026-004', paidAt: '2026-01-16', dueDate: null },
  ];

  // ── Client activity (for detail view) ─────────────────────────────────────
  const activityByClient = {
    'c-003': [
      { when: '2026-04-18 14:22', actor: 'system', text: 'Puppy reservation booked — Sky collar (Wren litter)' },
      { when: '2026-04-18 14:22', actor: 'system', text: 'Booking payment due by 25 Apr — R4,500' },
      { when: '2026-04-05 09:10', actor: 'admin',  text: 'Invited to litter selection for Wren\'s Autumn Litter' },
      { when: '2026-03-01 11:04', actor: 'system', text: 'Moved to waitlist — all documents signed' },
      { when: '2026-02-24 16:48', actor: 'client', text: 'Uploaded signed breeder contract' },
      { when: '2026-02-11 10:02', actor: 'admin',  text: 'Application approved' },
      { when: '2025-10-18 20:35', actor: 'client', text: 'Submitted application' },
    ],
  };

  // ── Stage taxonomy ────────────────────────────────────────────────────────
  const stageOrder = ['enquired','approved','waitlisted','puppy_reserved','puppy_booked','puppy_fully_paid'];
  const stageLabel = {
    enquired: 'Enquired',
    approved: 'Approved',
    rejected: 'Rejected',
    waitlisted: 'Waitlisted',
    puppy_reserved: 'Reserved',
    puppy_booked: 'Booked',
    puppy_fully_paid: 'Fully paid',
  };

  return { ZAR, formatDate, shortDate, litters, puppies, clients, payments, activityByClient, stageOrder, stageLabel };
})();
