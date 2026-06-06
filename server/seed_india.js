const { pool } = require('./config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Starting transaction for seeding database (6 months spread)...');
    await client.query('BEGIN');

    // 1. Truncate/Delete transaction tables in dependency order
    console.log('Cleaning up existing transaction data...');
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM activity_logs');
    await client.query('DELETE FROM invoices');
    await client.query('DELETE FROM purchase_orders');
    await client.query('DELETE FROM approvals');
    await client.query('DELETE FROM quotation_items');
    await client.query('DELETE FROM quotations');
    await client.query('DELETE FROM rfq_vendors');
    await client.query('DELETE FROM rfq_items');
    await client.query('DELETE FROM rfqs');
    await client.query('DELETE FROM vendors');
    
    // Delete all users except Devansh Patel (id: 2)
    await client.query('DELETE FROM users WHERE id != 2');
    console.log('Database cleanup completed.');

    // 2. Hash password for new seed users
    const salt = await bcrypt.genSalt(10);
    const hashedPw = await bcrypt.hash('password123', salt);

    // 3. Seed Users
    console.log('Inserting seed users...');
    
    // Procurement Officers
    const priyaRes = await client.query(
      `INSERT INTO users (name, email, password, role, country, phone) 
       VALUES ('Priya Sharma', 'priya.sharma@vendorbridge.in', $1, 'procurement_officer', 'India', '9876543210') 
       RETURNING id`,
      [hashedPw]
    );
    const priyaId = priyaRes.rows[0].id;

    const rohitRes = await client.query(
      `INSERT INTO users (name, email, password, role, country, phone) 
       VALUES ('Rohit Mehta', 'rohit.mehta@vendorbridge.in', $1, 'procurement_officer', 'India', '8765432109') 
       RETURNING id`,
      [hashedPw]
    );
    const rohitId = rohitRes.rows[0].id;

    // Managers
    const vikramRes = await client.query(
      `INSERT INTO users (name, email, password, role, country, phone) 
       VALUES ('Vikram Singh', 'vikram.singh@vendorbridge.in', $1, 'manager', 'India', '7654321098') 
       RETURNING id`,
      [hashedPw]
    );
    const vikramId = vikramRes.rows[0].id;

    const anitaRes = await client.query(
      `INSERT INTO users (name, email, password, role, country, phone) 
       VALUES ('Anita Desai', 'anita.desai@vendorbridge.in', $1, 'manager', 'India', '9123456789') 
       RETURNING id`,
      [hashedPw]
    );
    const anitaId = anitaRes.rows[0].id;

    // Vendor Representatives
    const rajeshRes = await client.query(
      `INSERT INTO users (name, email, password, role, country, phone) 
       VALUES ('Rajesh Kumar', 'rajesh@tatasteel.com', $1, 'vendor', 'India', '8234567890') 
       RETURNING id`,
      [hashedPw]
    );
    const rajeshId = rajeshRes.rows[0].id;

    const sureshRes = await client.query(
      `INSERT INTO users (name, email, password, role, country, phone) 
       VALUES ('Suresh Nair', 'suresh@infosysbpo.in', $1, 'vendor', 'India', '9345678901') 
       RETURNING id`,
      [hashedPw]
    );
    const sureshId = sureshRes.rows[0].id;

    const amitRes = await client.query(
      `INSERT INTO users (name, email, password, role, country, phone) 
       VALUES ('Amit Patel', 'amit@relianceequip.com', $1, 'vendor', 'India', '7456789012') 
       RETURNING id`,
      [hashedPw]
    );
    const amitId = amitRes.rows[0].id;

    const sandeepRes = await client.query(
      `INSERT INTO users (name, email, password, role, country, phone) 
       VALUES ('Sandeep Patil', 'sandeep@mahindraagri.com', $1, 'vendor', 'India', '8567890123') 
       RETURNING id`,
      [hashedPw]
    );
    const sandeepId = sandeepRes.rows[0].id;

    const nehaRes = await client.query(
      `INSERT INTO users (name, email, password, role, country, phone) 
       VALUES ('Neha Gupta', 'neha@hcltech.com', $1, 'vendor', 'India', '9678901234') 
       RETURNING id`,
      [hashedPw]
    );
    const nehaId = nehaRes.rows[0].id;

    console.log('Seeded users successfully.');

    // 4. Seed Vendors (Indian Companies)
    console.log('Inserting vendors...');
    const tataSteelRes = await client.query(
      `INSERT INTO vendors (user_id, company_name, category, gst_number, contact_person, email, phone, address, status)
       VALUES ($1, 'Tata Steel Suppliers Pvt Ltd', 'Steel/Metal', '27AAAAA1111A1Z1', 'Rajesh Kumar', 'rajesh@tatasteel.com', '8234567890', 'Plot 23, MIDC Industrial Area, Taloja, Navi Mumbai, Maharashtra - 410208', 'active')
       RETURNING id`,
      [rajeshId]
    );
    const tataSteelId = tataSteelRes.rows[0].id;

    const infosysRes = await client.query(
      `INSERT INTO vendors (user_id, company_name, category, gst_number, contact_person, email, phone, address, status)
       VALUES ($1, 'Infosys BPO Solutions Ltd', 'IT Services', '29BBBBB2222B2Z2', 'Suresh Nair', 'suresh@infosysbpo.in', '9345678901', 'Electronics City, Hosur Road, Bengaluru, Karnataka - 560100', 'active')
       RETURNING id`,
      [sureshId]
    );
    const infosysId = infosysRes.rows[0].id;

    const relianceRes = await client.query(
      `INSERT INTO vendors (user_id, company_name, category, gst_number, contact_person, email, phone, address, status)
       VALUES ($1, 'Reliance Industrial Equipments Pvt Ltd', 'Machinery', '24CCCCC3333C3Z3', 'Amit Patel', 'amit@relianceequip.com', '7456789012', 'GIDC Estate, Vatva, Ahmedabad, Gujarat - 382440', 'active')
       RETURNING id`,
      [amitId]
    );
    const relianceId = relianceRes.rows[0].id;

    const mahindraRes = await client.query(
      `INSERT INTO vendors (user_id, company_name, category, gst_number, contact_person, email, phone, address, status)
       VALUES ($1, 'Mahindra Agri Solutions Ltd', 'Agriculture', '27DDDDD4444D4Z4', 'Sandeep Patil', 'sandeep@mahindraagri.com', '8567890123', 'Agri-Tech Park, Chakan, Pune, Maharashtra - 410501', 'active')
       RETURNING id`,
      [sandeepId]
    );
    const mahindraId = mahindraRes.rows[0].id;

    const hclRes = await client.query(
      `INSERT INTO vendors (user_id, company_name, category, gst_number, contact_person, email, phone, address, status)
       VALUES ($1, 'HCL Tech Accessories Pvt Ltd', 'Electronics', '09EEEEE5555E5Z5', 'Neha Gupta', 'neha@hcltech.com', '9678901234', 'Sector 62, Noida, Uttar Pradesh - 201301', 'active')
       RETURNING id`,
      [nehaId]
    );
    const hclId = hclRes.rows[0].id;

    console.log('Seeded vendors successfully.');

    // 5. Seed RFQs
    console.log('Inserting RFQs...');
    
    // RFQs 1-5: Will be Approved (Spread over Jan - May)
    const rfqsApproved = [];
    const titlesApproved = [
      'Raw Steel Sheets & MS Structural Angles',
      'Annual Office IT Hardware Procurement',
      'Industrial Water Pumps & Accessories',
      'Bulk Organic Seeds & Bio-Fertilizers',
      'Corporate ERP Software Subscriptions'
    ];
    const approvedRfqDates = [
      '2026-01-02 09:00:00',
      '2026-02-01 09:00:00',
      '2026-03-03 09:00:00',
      '2026-04-05 09:00:00',
      '2026-05-03 09:00:00'
    ];
    const approvedRfqDeadlines = [
      '2026-01-12',
      '2026-02-10',
      '2026-03-12',
      '2026-04-14',
      '2026-05-12'
    ];

    for (let i = 0; i < 5; i++) {
      const rfqRes = await client.query(
        `INSERT INTO rfqs (rfq_number, title, description, deadline, status, created_by, created_at)
         VALUES ($1, $2, $3, $4, 'closed', $5, $6)
         RETURNING id`,
        [`RFQ-2026-00${i+1}`, titlesApproved[i], `Seeded historical procurement sourcing event for ${titlesApproved[i]}`, approvedRfqDeadlines[i], priyaId, approvedRfqDates[i]]
      );
      rfqsApproved.push(rfqRes.rows[0].id);
    }

    // RFQ 18: Will be Approved (June)
    const rfq18Res = await client.query(
      `INSERT INTO rfqs (rfq_number, title, description, deadline, status, created_by, created_at)
       VALUES ('RFQ-2026-018', 'Warehouse Solar Power Systems', 'Sourcing for premium solar grid panels for warehouse green initiative.', '2026-06-01', 'closed', $1, '2026-05-25 09:00:00')
       RETURNING id`,
      [priyaId]
    );
    const rfq18Id = rfq18Res.rows[0].id;

    // RFQs 6-7: Will remain Open (June)
    const rfq6Res = await client.query(
      `INSERT INTO rfqs (rfq_number, title, description, deadline, status, created_by, created_at)
       VALUES ('RFQ-2026-006', 'Office Ergonomic Chairs Procurement', 'Supply of dynamic height-adjustable mesh back ergonomic executive chairs.', '2026-06-25', 'open', $1, '2026-06-01 10:00:00')
       RETURNING id`,
      [rohitId]
    );
    const rfq6Id = rfq6Res.rows[0].id;

    const rfq7Res = await client.query(
      `INSERT INTO rfqs (rfq_number, title, description, deadline, status, created_by, created_at)
       VALUES ('RFQ-2026-007', 'Sourcing for Warehouse Solar Panels', 'Procurement and standard fitting of premium solar grid modules for Pune warehouse.', '2026-06-30', 'open', $1, '2026-06-02 11:00:00')
       RETURNING id`,
      [priyaId]
    );
    const rfq7Id = rfq7Res.rows[0].id;

    // RFQs 8-12: Will be Rejected (May)
    const rfqsRejected = [];
    const titlesRejected = [
      'Safety Goggles & PPE Kits',
      'Warehouse Barcode Scanners',
      'Heavy Duty Conveyor Belts',
      'Premium Office Stationery Sourcing',
      'Structural Concrete Mix Sourcing'
    ];
    for (let i = 0; i < 5; i++) {
      const rfqRes = await client.query(
        `INSERT INTO rfqs (rfq_number, title, description, deadline, status, created_by, created_at)
         VALUES ($1, $2, $3, CURRENT_DATE - 1, 'closed', $4, '2026-05-15 09:00:00')
         RETURNING id`,
        [`RFQ-2026-00${i+8}`, titlesRejected[i], `Sourcing event for ${titlesRejected[i]} (rejected quote selection)`, rohitId]
      );
      rfqsRejected.push(rfqRes.rows[0].id);
    }

    // RFQs 13-17: Will be Pending Review (June)
    const rfqsPending = [];
    const titlesPending = [
      'High Speed Fiber Optic Cables',
      'Fire Extinguishers & Safety Systems',
      'Pest Control Services Sourcing',
      'Corporate Laptop Sleeves & Bags',
      'Database Migration Consultancy Services'
    ];
    for (let i = 0; i < 5; i++) {
      const rfqRes = await client.query(
        `INSERT INTO rfqs (rfq_number, title, description, deadline, status, created_by, created_at)
         VALUES ($1, $2, $3, CURRENT_DATE + 10, 'open', $4, '2026-06-01 10:00:00')
         RETURNING id`,
        [`RFQ-2026-01${i+3}`, titlesPending[i], `Sourcing event for ${titlesPending[i]} (pending quote selection approval)`, priyaId]
      );
      rfqsPending.push(rfqRes.rows[0].id);
    }

    console.log('Seeded 18 RFQs successfully.');

    // 6. Seed RFQ Items
    console.log('Inserting RFQ line items...');
    // APPROVED items
    const rfq1Item1 = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'HR Steel Sheets 5mm', 250, 'Nos', 'Grade IS 2062') RETURNING id`, [rfqsApproved[0]])).rows[0].id;
    const rfq1Item2 = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'MS Structural L-Angles', 100, 'Nos', 'Size 50x50x6mm') RETURNING id`, [rfqsApproved[0]])).rows[0].id;
    const rfq2Item1 = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Developer Laptops (Core i7)', 50, 'Nos', '32GB RAM, 1TB SSD') RETURNING id`, [rfqsApproved[1]])).rows[0].id;
    const rfq2Item2 = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Workstation Servers', 5, 'Nos', 'Intel Xeon 8-Core') RETURNING id`, [rfqsApproved[1]])).rows[0].id;
    const rfq3Item1 = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Submersible Water Pump 10HP', 4, 'Nos', 'Kirloskar or equivalent') RETURNING id`, [rfqsApproved[2]])).rows[0].id;
    const rfq3Item2 = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Heavy Duty Rubber Hoses 2-inch', 20, 'Meters', 'Reinforced rubber') RETURNING id`, [rfqsApproved[2]])).rows[0].id;
    const rfq4Item1 = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Organic Wheat Seeds', 500, 'Kg', 'Certified organic') RETURNING id`, [rfqsApproved[3]])).rows[0].id;
    const rfq4Item2 = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Bio-Fertilizer Liquid', 100, 'Liters', 'NPK active composition') RETURNING id`, [rfqsApproved[3]])).rows[0].id;
    const rfq5Item1 = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Enterprise ERP User Licenses', 200, 'Nos', 'Full access user seats') RETURNING id`, [rfqsApproved[4]])).rows[0].id;
    const rfq5Item2 = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Cloud Hosting & Premium Support', 12, 'Months', '24/7 uptime') RETURNING id`, [rfqsApproved[4]])).rows[0].id;

    // RFQ 18 item (June)
    const rfq18Item1 = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Warehouse Solar Panels 500W', 20, 'Nos', 'Monocrystalline efficiency 21%') RETURNING id`, [rfq18Id])).rows[0].id;

    // OPEN items
    const rfq6Item1 = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Ergonomic Mesh Chairs', 100, 'Nos', 'Height-adjustable armrests') RETURNING id`, [rfq6Id])).rows[0].id;
    const rfq7Item1 = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Solar Panel Grid 500W', 20, 'Nos', 'Monocrystalline technology') RETURNING id`, [rfq7Id])).rows[0].id;

    // REJECTED items
    const rfq8Item = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Safety Goggles & PPE Kits', 100, 'Sets', 'Certified medical grade') RETURNING id`, [rfqsRejected[0]])).rows[0].id;
    const rfq9Item = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Warehouse Barcode Scanners', 10, 'Nos', 'Wireless handheld scanners') RETURNING id`, [rfqsRejected[1]])).rows[0].id;
    const rfq10Item = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Heavy Duty Conveyor Belts', 2, 'Nos', 'Width 1m, length 15m') RETURNING id`, [rfqsRejected[2]])).rows[0].id;
    const rfq11Item = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Premium Office Stationery Sourcing', 1, 'Lot', 'A4 papers, folders, pens pack') RETURNING id`, [rfqsRejected[3]])).rows[0].id;
    const rfq12Item = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Structural Concrete Mix', 50, 'Bags', 'Grade M25 structural cement') RETURNING id`, [rfqsRejected[4]])).rows[0].id;

    // PENDING items
    const rfq13Item = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'High Speed Fiber Optic Cables', 500, 'Meters', 'Single mode 9/125 core') RETURNING id`, [rfqsPending[0]])).rows[0].id;
    const rfq14Item = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Fire Extinguishers & Safety Systems', 15, 'Nos', 'ABC Dry Powder 6Kg capacity') RETURNING id`, [rfqsPending[1]])).rows[0].id;
    const rfq15Item = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Pest Control Services Sourcing', 4, 'Quarters', 'Deep disinfection & insect pest control') RETURNING id`, [rfqsPending[2]])).rows[0].id;
    const rfq16Item = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Corporate Laptop Sleeves & Bags', 120, 'Nos', 'Waterproof fabric, custom branding') RETURNING id`, [rfqsPending[3]])).rows[0].id;
    const rfq17Item = (await client.query(`INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES ($1, 'Database Migration Consultancy Services', 1, 'Job', 'SQL to PostgreSQL migration audit') RETURNING id`, [rfqsPending[4]])).rows[0].id;

    // Vendor invitations mapping
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2), ($1, $3)`, [rfqsApproved[0], tataSteelId, relianceId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2), ($1, $3)`, [rfqsApproved[1], infosysId, hclId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2), ($1, $3)`, [rfqsApproved[2], relianceId, tataSteelId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2), ($1, $3)`, [rfqsApproved[3], mahindraId, tataSteelId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2), ($1, $3)`, [rfqsApproved[4], infosysId, hclId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfq18Id, tataSteelId]);

    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfq6Id, relianceId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfq7Id, tataSteelId]);

    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfqsRejected[0], hclId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfqsRejected[1], infosysId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfqsRejected[2], relianceId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfqsRejected[3], mahindraId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfqsRejected[4], tataSteelId]);

    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfqsPending[0], hclId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfqsPending[1], relianceId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfqsPending[2], mahindraId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfqsPending[3], hclId]);
    await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfqsPending[4], infosysId]);

    console.log('Seeded RFQ line items and vendor assignments.');

    // 7. Seed Quotations
    console.log('Inserting quotations...');
    
    // Approved Quotations (selected = true)
    const q1 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 1275000.00, 5, 'tata steel premium sheets', 'selected', '2026-01-08 14:00:00') RETURNING id`, [rfqsApproved[0], tataSteelId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 4500.00, 1125000.00), ($1, $3, 1500.00, 150000.00)`, [q1, rfq1Item1, rfq1Item2]);

    const q2 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 4375000.00, 7, 'hcl tech accessories delivery', 'selected', '2026-02-05 14:00:00') RETURNING id`, [rfqsApproved[1], hclId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 75000.00, 3750000.00), ($1, $3, 125000.00, 625000.00)`, [q2, rfq2Item1, rfq2Item2]);

    const q3 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 316000.00, 12, 'reliance pumps delivery', 'selected', '2026-03-08 14:00:00') RETURNING id`, [rfqsApproved[2], relianceId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 75000.00, 300000.00), ($1, $3, 800.00, 16000.00)`, [q3, rfq3Item1, rfq3Item2]);

    const q4 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 150000.00, 4, 'mahindra agri organic seeds standard', 'selected', '2026-04-08 14:00:00') RETURNING id`, [rfqsApproved[3], mahindraId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 200.00, 100000.00), ($1, $3, 500.00, 50000.00)`, [q4, rfq4Item1, rfq4Item2]);

    const q5 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 2400000.00, 15, 'infosys cloud subscriptions SLA', 'selected', '2026-05-08 14:00:00') RETURNING id`, [rfqsApproved[4], infosysId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 10000.00, 2000000.00), ($1, $3, 33333.33, 400000.00)`, [q5, rfq5Item1, rfq5Item2]);

    // RFQ 18 quote (June)
    const q18 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 250000.00, 3, 'Tata solar panels quotation', 'selected', '2026-05-29 14:00:00') RETURNING id`, [rfq18Id, tataSteelId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 12500.00, 250000.00)`, [q18, rfq18Item1]);

    // Rejected Quotations (status = 'submitted')
    const q8 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 85000.00, 3, 'HCL Tech PPE Kits bid', 'submitted', '2026-05-20 14:00:00') RETURNING id`, [rfqsRejected[0], hclId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 850.00, 85000.00)`, [q8, rfq8Item]);

    const q9 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 12000.00, 8, 'Infosys wireless scanners bid', 'submitted', '2026-05-20 14:00:00') RETURNING id`, [rfqsRejected[1], infosysId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 12000.00, 120000.00)`, [q9, rfq9Item]);

    const q10 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 650000.00, 45, 'Reliance heavy conveyor belts', 'submitted', '2026-05-20 14:00:00') RETURNING id`, [rfqsRejected[2], relianceId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 325000.00, 650000.00)`, [q10, rfq10Item]);

    const q11 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 45000.00, 2, 'Mahindra Stationery supply', 'submitted', '2026-05-20 14:00:00') RETURNING id`, [rfqsRejected[3], mahindraId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 45000.00, 45000.00)`, [q11, rfq11Item]);

    const q12 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 320000.00, 10, 'Tata concrete mix proposal', 'submitted', '2026-05-20 14:00:00') RETURNING id`, [rfqsRejected[4], tataSteelId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 6400.00, 320000.00)`, [q12, rfq12Item]);

    // Pending Quotations (status = 'under_review')
    const q13 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 210000.00, 4, 'HCL fiber cables', 'under_review', '2026-06-02 14:00:00') RETURNING id`, [rfqsPending[0], hclId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 420.00, 210000.00)`, [q13, rfq13Item]);

    const q14 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 180000.00, 5, 'Reliance fire extinguishers', 'under_review', '2026-06-02 14:00:00') RETURNING id`, [rfqsPending[1], relianceId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 12000.00, 180000.00)`, [q14, rfq14Item]);

    const q15 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 60000.00, 3, 'Mahindra pest control', 'under_review', '2026-06-02 14:00:00') RETURNING id`, [rfqsPending[2], mahindraId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 15000.00, 60000.00)`, [q15, rfq15Item]);

    const q16 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 140000.00, 9, 'HCL custom branded sleeves', 'under_review', '2026-06-02 14:00:00') RETURNING id`, [rfqsPending[3], hclId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 1166.66, 140000.00)`, [q16, rfq16Item]);

    const q17 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 1500000.00, 30, 'Infosys db consultancy', 'under_review', '2026-06-02 14:00:00') RETURNING id`, [rfqsPending[4], infosysId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 1500000.00, 1500000.00)`, [q17, rfq17Item]);

    // Open Bids (pending review)
    const q6 = (await client.query(`INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status, submitted_at) VALUES ($1, $2, 650000.00, 6, 'Comfort mesh chairs', 'submitted', '2026-06-03 14:00:00') RETURNING id`, [rfq6Id, relianceId])).rows[0].id;
    await client.query(`INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, 6500.00, 650000.00)`, [q6, rfq6Item1]);

    console.log('Seeded all quotations successfully.');

    // 8. Seed Approvals (6 Approved, 5 Rejected, 5 Pending)
    console.log('Inserting approvals (5 of each)...');
    
    // Approved dates: Jan, Feb, Mar, Apr, May, Jun
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, $2, 'approved', 'Tata Steel selected', '2026-01-12 11:30:00')`, [q1, vikramId]);
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, $2, 'approved', 'HCL selected', '2026-02-10 11:30:00')`, [q2, anitaId]);
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, $2, 'approved', 'Reliance chosen', '2026-03-12 11:30:00')`, [q3, vikramId]);
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, $2, 'approved', 'Mahindra Agri chosen', '2026-04-14 11:30:00')`, [q4, anitaId]);
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, $2, 'approved', 'Infosys BPO selected', '2026-05-12 11:30:00')`, [q5, vikramId]);
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, $2, 'approved', 'Tata Solar panels approved', '2026-06-01 11:30:00')`, [q18, vikramId]);

    // 5 Rejected (May)
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, $2, 'rejected', 'Pricing is significantly higher than budgeted amount.', '2026-05-22 11:30:00')`, [q8, vikramId]);
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, $2, 'rejected', 'Requested model does not match compliance specifications.', '2026-05-22 11:30:00')`, [q9, anitaId]);
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, $2, 'rejected', 'Lead time of 45 days is too slow.', '2026-05-22 11:30:00')`, [q10, vikramId]);
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, $2, 'rejected', 'Stationery category does not require manager level approvals.', '2026-05-22 11:30:00')`, [q11, anitaId]);
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, $2, 'rejected', 'Alternative vendor has offered better payment terms.', '2026-05-22 11:30:00')`, [q12, vikramId]);

    // 5 Pending (June)
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, NULL, 'pending', 'Quotation selected by procurement officer. Pending manager approval review.', '2026-06-02 14:00:00')`, [q13]);
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, NULL, 'pending', 'Quotation selected by procurement officer. Pending manager approval review.', '2026-06-02 14:00:00')`, [q14]);
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, NULL, 'pending', 'Quotation selected by procurement officer. Pending manager approval review.', '2026-06-02 14:00:00')`, [q15]);
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, NULL, 'pending', 'Quotation selected by procurement officer. Pending manager approval review.', '2026-06-02 14:00:00')`, [q16]);
    await client.query(`INSERT INTO approvals (quotation_id, approver_id, status, remarks, action_at) VALUES ($1, NULL, 'pending', 'Quotation selected by procurement officer. Pending manager approval review.', '2026-06-02 14:00:00')`, [q17]);

    console.log('Seeded approvals successfully.');


    // 9. Seed 6 Purchase Orders (Spread from Jan to Jun 2026)
    console.log('Inserting 6 purchase orders...');
    // PO 1 (Jan)
    const po1Id = (await client.query(
      `INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, total_amount, tax_amount, grand_total, status, created_by, created_at)
       VALUES ('PO-2026-001', $1, $2, 1275000.00, 229500.00, 1504500.00, 'completed', $3, '2026-01-15 10:00:00') RETURNING id`,
      [q1, tataSteelId, priyaId]
    )).rows[0].id;

    // PO 2 (Feb)
    const po2Id = (await client.query(
      `INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, total_amount, tax_amount, grand_total, status, created_by, created_at)
       VALUES ('PO-2026-002', $1, $2, 4375000.00, 787500.00, 5162500.00, 'completed', $3, '2026-02-12 10:00:00') RETURNING id`,
      [q2, hclId, rohitId]
    )).rows[0].id;

    // PO 3 (Mar)
    const po3Id = (await client.query(
      `INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, total_amount, tax_amount, grand_total, status, created_by, created_at)
       VALUES ('PO-2026-003', $1, $2, 316000.00, 56880.00, 372880.00, 'completed', $3, '2026-03-14 10:00:00') RETURNING id`,
      [q3, relianceId, priyaId]
    )).rows[0].id;

    // PO 4 (Apr)
    const po4Id = (await client.query(
      `INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, total_amount, tax_amount, grand_total, status, created_by, created_at)
       VALUES ('PO-2026-004', $1, $2, 150000.00, 27000.00, 177000.00, 'completed', $3, '2026-04-16 10:00:00') RETURNING id`,
      [q4, mahindraId, priyaId]
    )).rows[0].id;

    // PO 5 (May)
    const po5Id = (await client.query(
      `INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, total_amount, tax_amount, grand_total, status, created_by, created_at)
       VALUES ('PO-2026-005', $1, $2, 2400000.00, 432000.00, 2832000.00, 'completed', $3, '2026-05-14 10:00:00') RETURNING id`,
      [q5, infosysId, rohitId]
    )).rows[0].id;

    // PO 6 (Jun)
    const po6Id = (await client.query(
      `INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, total_amount, tax_amount, grand_total, status, created_by, created_at)
       VALUES ('PO-2026-006', $1, $2, 250000.00, 45000.00, 295000.00, 'completed', $3, '2026-06-03 10:00:00') RETURNING id`,
      [q18, tataSteelId, priyaId]
    )).rows[0].id;

    console.log('Seeded purchase orders successfully.');


    // 10. Seed 6 Invoices (4 Paid, 2 Unpaid, Spread Jan to Jun)
    console.log('Inserting 6 invoices...');
    // INV 1 (Jan)
    await client.query(
      `INSERT INTO invoices (invoice_number, po_id, amount, tax_amount, total_amount, status, due_date, created_at)
       VALUES ('INV-2026-001', $1, 1275000.00, 229500.00, 1504500.00, 'paid', '2026-02-15', '2026-01-18 16:45:00')`,
      [po1Id]
    );
    // INV 2 (Feb)
    await client.query(
      `INSERT INTO invoices (invoice_number, po_id, amount, tax_amount, total_amount, status, due_date, created_at)
       VALUES ('INV-2026-002', $1, 4375000.00, 787500.00, 5162500.00, 'paid', '2026-03-12', '2026-02-15 16:45:00')`,
      [po2Id]
    );
    // INV 3 (Mar)
    await client.query(
      `INSERT INTO invoices (invoice_number, po_id, amount, tax_amount, total_amount, status, due_date, created_at)
       VALUES ('INV-2026-003', $1, 316000.00, 56880.00, 372880.00, 'unpaid', '2026-04-14', '2026-03-16 16:45:00')`,
      [po3Id]
    );
    // INV 4 (Apr)
    await client.query(
      `INSERT INTO invoices (invoice_number, po_id, amount, tax_amount, total_amount, status, due_date, created_at)
       VALUES ('INV-2026-004', $1, 150000.00, 27000.00, 177000.00, 'paid', '2026-05-16', '2026-04-18 16:45:00')`,
      [po4Id]
    );
    // INV 5 (May)
    await client.query(
      `INSERT INTO invoices (invoice_number, po_id, amount, tax_amount, total_amount, status, due_date, created_at)
       VALUES ('INV-2026-005', $1, 2400000.00, 432000.00, 2832000.00, 'unpaid', '2026-06-14', '2026-05-16 16:45:00')`,
      [po5Id]
    );
    // INV 6 (Jun)
    await client.query(
      `INSERT INTO invoices (invoice_number, po_id, amount, tax_amount, total_amount, status, due_date, created_at)
       VALUES ('INV-2026-006', $1, 250000.00, 45000.00, 295000.00, 'paid', '2026-07-03', '2026-06-05 16:45:00')`,
      [po6Id]
    );

    console.log('Seeded invoices successfully.');


    // 11. Seed Activity Logs
    console.log('Inserting activity logs...');
    const logs = [
      { user_id: priyaId, action: 'CREATE', entity_type: 'rfq', entity_id: rfqsApproved[0], desc: 'Created RFQ: "Raw Steel Sheets & MS Structural Angles"', date: '2026-01-02 09:00:00' },
      { user_id: rajeshId, action: 'CREATE', entity_type: 'quotation', entity_id: q1, desc: 'Submitted quote for RFQ-2026-001', date: '2026-01-08 14:00:00' },
      { user_id: priyaId, action: 'SELECT', entity_type: 'approval', entity_id: q1, desc: 'Selected Tata Steel quotation for approval routing', date: '2026-01-12 11:30:00' },
      { user_id: vikramId, action: 'APPROVE', entity_type: 'approval', entity_id: q1, desc: 'Approved selection of Tata Steel Suppliers', date: '2026-01-12 11:30:00' },

      { user_id: rohitId, action: 'CREATE', entity_type: 'rfq', entity_id: rfqsApproved[1], desc: 'Created RFQ: "Annual Office IT Hardware Procurement"', date: '2026-02-01 09:00:00' },
      { user_id: nehaId, action: 'CREATE', entity_type: 'quotation', entity_id: q2, desc: 'Submitted quote for RFQ-2026-002', date: '2026-02-05 14:00:00' },
      { user_id: rohitId, action: 'SELECT', entity_type: 'approval', entity_id: q2, desc: 'Selected HCL Tech quotation for approval routing', date: '2026-02-10 11:30:00' },
      { user_id: anitaId, action: 'APPROVE', entity_type: 'approval', entity_id: q2, desc: 'Approved selection of HCL Tech Accessories', date: '2026-02-10 11:30:00' },

      { user_id: priyaId, action: 'CREATE', entity_type: 'rfq', entity_id: rfqsApproved[2], desc: 'Created RFQ: "Industrial Water Pumps & Accessories"', date: '2026-03-03 09:00:00' },
      { user_id: amitId, action: 'CREATE', entity_type: 'quotation', entity_id: q3, desc: 'Submitted quote for RFQ-2026-003', date: '2026-03-08 14:00:00' },
      { user_id: priyaId, action: 'SELECT', entity_type: 'approval', entity_id: q3, desc: 'Selected Reliance quotation for approval routing', date: '2026-03-12 11:30:00' },
      { user_id: vikramId, action: 'APPROVE', entity_type: 'approval', entity_id: q3, desc: 'Approved selection of Reliance Industrial Equipments', date: '2026-03-12 11:30:00' },

      { user_id: priyaId, action: 'CREATE', entity_type: 'rfq', entity_id: rfqsApproved[3], desc: 'Created RFQ: "Bulk Organic Seeds & Bio-Fertilizers"', date: '2026-04-05 09:00:00' },
      { user_id: sandeepId, action: 'CREATE', entity_type: 'quotation', entity_id: q4, desc: 'Submitted quote for RFQ-2026-004', date: '2026-04-08 14:00:00' },
      { user_id: priyaId, action: 'SELECT', entity_type: 'approval', entity_id: q4, desc: 'Selected Mahindra Agri quotation for approval routing', date: '2026-04-14 11:30:00' },
      { user_id: anitaId, action: 'APPROVE', entity_type: 'approval', entity_id: q4, desc: 'Approved selection of Mahindra Agri Solutions', date: '2026-04-14 11:30:00' },

      { user_id: rohitId, action: 'CREATE', entity_type: 'rfq', entity_id: rfqsApproved[4], desc: 'Created RFQ: "Corporate ERP Software Subscriptions"', date: '2026-05-03 09:00:00' },
      { user_id: sureshId, action: 'CREATE', entity_type: 'quotation', entity_id: q5, desc: 'Submitted quote for RFQ-2026-005', date: '2026-05-08 14:00:00' },
      { user_id: rohitId, action: 'SELECT', entity_type: 'approval', entity_id: q5, desc: 'Selected Infosys BPO quotation for approval routing', date: '2026-05-12 11:30:00' },
      { user_id: vikramId, action: 'APPROVE', entity_type: 'approval', entity_id: q5, desc: 'Approved selection of Infosys BPO Solutions', date: '2026-05-12 11:30:00' }
    ];

    for (const log of logs) {
      await client.query(
        `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [log.user_id, log.action, log.entity_type, log.entity_id, log.desc, log.date]
      );
    }

    console.log('Inserting notifications...');
    const notifications = [
      { user_id: 2, title: 'Invoice Paid', message: 'Invoice INV-2026-001 has been marked as Paid successfully.' },
      { user_id: 2, title: 'Invoice Paid', message: 'Invoice INV-2026-002 has been marked as Paid successfully.' },
      { user_id: 2, title: 'Invoice Paid', message: 'Invoice INV-2026-004 has been marked as Paid successfully.' },
      { user_id: priyaId, title: 'Invoice Paid', message: 'Invoice INV-2026-001 has been marked as Paid successfully.' },
      { user_id: rohitId, title: 'Invoice Paid', message: 'Invoice INV-2026-002 has been marked as Paid successfully.' },
      { user_id: rajeshId, title: 'Payment Confirmed', message: 'Your Invoice INV-2026-001 has been approved and paid.' },
      { user_id: nehaId, title: 'Payment Confirmed', message: 'Your Invoice INV-2026-002 has been approved and paid.' },
      { user_id: sandeepId, title: 'Payment Confirmed', message: 'Your Invoice INV-2026-004 has been approved and paid.' },
      { user_id: amitId, title: 'New Invoice Issued', message: 'Invoice INV-2026-003 has been submitted and is pending verification.' },
      { user_id: sureshId, title: 'New Invoice Issued', message: 'Invoice INV-2026-005 has been submitted and is pending verification.' }
    ];

    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message)
         VALUES ($1, $2, $3)`,
        [n.user_id, n.title, n.message]
      );
    }

    await client.query('COMMIT');
    console.log('Seed transaction committed successfully! (6 months cumulative spend generated)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed database:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
