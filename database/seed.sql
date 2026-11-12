-- ==============================================================================
-- BASIC CHIT FUND MANAGEMENT SYSTEM - SEED DATA (MySQL)
-- ==============================================================================
-- Database creation handled by cPanel (Database: jivanchitfunds_db)

-- Default Users:
-- admin / admin123 (Password hash: sha256 of 'admin123')
-- staff / staff123 (Password hash: sha256 of 'staff123')
INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `email`, `role`, `status`) VALUES
(1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Rajesh Kumar (Admin)', 'admin@srichitfunds.com', 'admin', 'active'),
(2, 'staff', '10176e7b7b24d317acfcf8d2064cfd2f24e154f7b5a96603077d5ef813d6a6b6', 'Ananya Sharma (Staff)', 'staff@srichitfunds.com', 'staff', 'active');

-- Company Settings
INSERT INTO `company_settings` (`id`, `company_name`, `address`, `phone`, `email`, `currency_symbol`, `financial_year`, `default_commission_percent`, `receipt_prefix`, `customer_id_prefix`, `membership_id_prefix`) VALUES
(1, 'Sri Lakshmi Chits & Investments Pvt Ltd', 'Plot 42, 2nd Floor, Gandhi Road, T. Nagar, Chennai - 600017', '+91 98401 23456', 'support@srichitfunds.com', '₹', '2025-2026', 5.00, 'REC', 'CUST', 'MEM');

-- 10 Demo Customers
INSERT INTO `customers` (`id`, `customer_id`, `full_name`, `mobile_number`, `alternate_mobile`, `email`, `dob`, `gender`, `address`, `city`, `pincode`, `id_proof_type`, `id_proof_number`, `nominee_name`, `nominee_relationship`, `nominee_mobile`, `joining_date`, `status`, `remarks`) VALUES
(1, 'CUST-1001', 'Karthik Raman', '9840192831', '9444123456', 'karthik.raman@gmail.com', '1985-04-12', 'Male', '14, Circular Road, Anna Nagar', 'Chennai', '600040', 'Aadhaar', '3412-8921-9012', 'Meenakshi Raman', 'Spouse', '9840192832', '2025-01-05', 'active', 'High net-worth long-time subscriber'),
(2, 'CUST-1002', 'Priya Sundaram', '9884011223', '9884011224', 'priya.sundaram@gmail.com', '1990-08-23', 'Female', '22/B, 1st Cross Street, Indiranagar', 'Bengaluru', '560038', 'PAN', 'ABCPS1234F', 'Sundaram Iyer', 'Father', '9884099887', '2025-01-08', 'active', 'IT Professional, prompt payer'),
(3, 'CUST-1003', 'Suresh Venkatesh', '9790833441', NULL, 'suresh.v@outlook.com', '1978-11-15', 'Male', '8/19, Bazaar Main Road, Velachery', 'Chennai', '600042', 'Aadhaar', '5561-2349-8812', 'Lakshmi Suresh', 'Spouse', '9790833442', '2025-01-10', 'active', 'Merchant trader'),
(4, 'CUST-1004', 'Deepa Jayaram', '9445122334', NULL, 'deepa.j@yahoo.com', '1988-02-19', 'Female', '102, Green Valley Apartments, RS Puram', 'Coimbatore', '641002', 'Voter ID', 'TN/02/109283', 'Jayaram Balan', 'Spouse', '9445122335', '2025-01-15', 'active', 'Textile business owner'),
(5, 'CUST-1005', 'Murugan Palanisamy', '9841277665', '9841277666', 'murugan.p@gmail.com', '1982-06-30', 'Male', '5, Temple View Street, Mylapore', 'Chennai', '600004', 'Aadhaar', '8892-1029-3847', 'Kavitha Murugan', 'Spouse', '9841277667', '2025-02-01', 'active', 'Regular saver'),
(6, 'CUST-1006', 'Aravind Swaminathan', '9962055443', NULL, 'aravind.s@gmail.com', '1992-12-05', 'Male', '45, Lake view Road, Madipakkam', 'Chennai', '600091', 'Aadhaar', '4412-9098-1123', 'Swaminathan N', 'Father', '9962055444', '2025-02-05', 'active', 'Software Engineer'),
(7, 'CUST-1007', 'Shanthi Natarajan', '9840899112', '9840899113', 'shanthi.n@gmail.com', '1975-03-14', 'Female', '12, West Mada Street, Triplicane', 'Chennai', '600005', 'PAN', 'AQZPN9812K', 'Natarajan K', 'Spouse', '9840899114', '2025-02-10', 'active', 'School teacher'),
(8, 'CUST-1008', 'Vignesh Balaji', '9710433221', NULL, 'vignesh.balaji@hotmail.com', '1995-09-28', 'Male', '33/A, New Colony, Chromepet', 'Chennai', '600044', 'Driving License', 'TN09-2015000456', 'Balaji R', 'Father', '9710433222', '2025-02-15', 'active', 'Civil contractor'),
(9, 'CUST-1009', 'Radha Krishnan', '9884266778', NULL, 'radha.krishnan@gmail.com', '1984-07-07', 'Female', '77, G.S.T Road, Tambaram', 'Chennai', '600045', 'Aadhaar', '9012-3847-1928', 'Krishnan G', 'Spouse', '9884266779', '2025-02-20', 'active', 'Boutique owner'),
(10, 'CUST-1010', 'Ramesh Chandran', '9444088990', '9444088991', 'ramesh.c@gmail.com', '1980-01-25', 'Male', '19, North Usman Road, T. Nagar', 'Chennai', '600017', 'Passport', 'V9082341', 'Geetha Ramesh', 'Spouse', '9444088992', '2025-02-25', 'active', 'Jewellery artisan');

-- 2 Chit Groups
INSERT INTO `chit_groups` (`id`, `group_id`, `group_name`, `chit_value`, `num_members`, `monthly_installment`, `duration_months`, `start_date`, `end_date`, `auction_day_of_month`, `auction_frequency`, `foreman_commission_percent`, `status`, `description`) VALUES
(1, 'GRP-2025-SILVER', 'Silver Monthly 5L', 500000.00, 20, 25000.00, 20, '2025-01-01', '2026-08-01', 10, 'Monthly', 5.00, 'Active', '₹5 Lakhs chit group, 20 members, monthly auction on 10th.'),
(2, 'GRP-2025-GOLD', 'Gold Fortune 10L', 1000000.00, 20, 50000.00, 20, '2025-02-01', '2026-09-01', 15, 'Monthly', 5.00, 'Active', '₹10 Lakhs premier chit group, 20 members, monthly auction on 15th.');

-- Memberships for Group 1 (Silver Monthly 5L)
INSERT INTO `memberships` (`id`, `membership_id`, `customer_id`, `group_id`, `ticket_number`, `joining_date`, `installment_amount`, `total_installments`, `paid_installments`, `pending_installments`, `total_paid`, `total_pending`, `status`, `is_duplicate_allowed`) VALUES
(1, 'MEM-001', 'CUST-1001', 'GRP-2025-SILVER', 1, '2025-01-01', 25000.00, 20, 3, 17, 68000.00, 425000.00, 'prized', 0),
(2, 'MEM-002', 'CUST-1002', 'GRP-2025-SILVER', 2, '2025-01-01', 25000.00, 20, 3, 17, 68000.00, 425000.00, 'prized', 0),
(3, 'MEM-003', 'CUST-1003', 'GRP-2025-SILVER', 3, '2025-01-01', 25000.00, 20, 2, 18, 46500.00, 450000.00, 'active', 0),
(4, 'MEM-004', 'CUST-1004', 'GRP-2025-SILVER', 4, '2025-01-01', 25000.00, 20, 3, 17, 68000.00, 425000.00, 'active', 0),
(5, 'MEM-005', 'CUST-1005', 'GRP-2025-SILVER', 5, '2025-01-01', 25000.00, 20, 2, 18, 46500.00, 450000.00, 'active', 0),
(6, 'MEM-006', 'CUST-1006', 'GRP-2025-SILVER', 6, '2025-01-01', 25000.00, 20, 2, 18, 46500.00, 450000.00, 'active', 0),
(7, 'MEM-007', 'CUST-1007', 'GRP-2025-SILVER', 7, '2025-01-01', 25000.00, 20, 3, 17, 68000.00, 425000.00, 'active', 0),
(8, 'MEM-008', 'CUST-1008', 'GRP-2025-SILVER', 8, '2025-01-01', 25000.00, 20, 1, 19, 25000.00, 475000.00, 'active', 0),
(9, 'MEM-009', 'CUST-1009', 'GRP-2025-SILVER', 9, '2025-01-01', 25000.00, 20, 2, 18, 46500.00, 450000.00, 'active', 0),
(10, 'MEM-010', 'CUST-1010', 'GRP-2025-SILVER', 10, '2025-01-01', 25000.00, 20, 2, 18, 46500.00, 450000.00, 'active', 0),
-- Memberships for Group 2 (Gold Fortune 10L)
(11, 'MEM-011', 'CUST-1001', 'GRP-2025-GOLD', 1, '2025-02-01', 50000.00, 20, 2, 18, 93000.00, 900000.00, 'active', 0),
(12, 'MEM-012', 'CUST-1003', 'GRP-2025-GOLD', 2, '2025-02-01', 50000.00, 20, 2, 18, 93000.00, 900000.00, 'active', 0),
(13, 'MEM-013', 'CUST-1005', 'GRP-2025-GOLD', 3, '2025-02-01', 50000.00, 20, 1, 19, 50000.00, 950000.00, 'active', 0),
(14, 'MEM-014', 'CUST-1008', 'GRP-2025-GOLD', 4, '2025-02-01', 50000.00, 20, 1, 19, 50000.00, 950000.00, 'active', 0),
(15, 'MEM-015', 'CUST-1010', 'GRP-2025-GOLD', 5, '2025-02-01', 50000.00, 20, 2, 18, 93000.00, 900000.00, 'active', 0);

-- 2 Completed Auctions for GRP-2025-SILVER
INSERT INTO `auctions` (`id`, `auction_id`, `group_id`, `auction_number`, `auction_date`, `chit_value`, `bid_discount_amount`, `prize_amount`, `foreman_commission`, `dividend_amount`, `dividend_per_member`, `winner_membership_id`, `winner_customer_id`, `ticket_number`, `status`, `remarks`) VALUES
(1, 'AUC-2025-001', 'GRP-2025-SILVER', 1, '2025-01-10', 500000.00, 100000.00, 400000.00, 25000.00, 75000.00, 3750.00, 'MEM-001', 'CUST-1001', 1, 'Completed', 'First month auction - Winner Karthik Raman'),
(2, 'AUC-2025-002', 'GRP-2025-SILVER', 2, '2025-02-10', 500000.00, 90000.00, 410000.00, 25000.00, 65000.00, 3250.00, 'MEM-002', 'CUST-1002', 2, 'Completed', 'Second month auction - Winner Priya Sundaram');

-- Dividends
INSERT INTO `dividends` (`id`, `dividend_id`, `auction_id`, `group_id`, `total_discount`, `foreman_commission`, `distributable_dividend`, `num_eligible_members`, `dividend_per_member`, `month_number`, `status`, `confirmed_by_user_id`) VALUES
(1, 'DIV-2025-001', 'AUC-2025-001', 'GRP-2025-SILVER', 100000.00, 25000.00, 75000.00, 20, 3750.00, 1, 'Confirmed', 1),
(2, 'DIV-2025-002', 'AUC-2025-002', 'GRP-2025-SILVER', 90000.00, 25000.00, 65000.00, 20, 3250.00, 2, 'Confirmed', 1);

-- Prize Payments
INSERT INTO `prize_payments` (`id`, `prize_payment_id`, `auction_id`, `group_id`, `winner_customer_id`, `winner_membership_id`, `ticket_number`, `auction_number`, `chit_value`, `discount_amount`, `prize_amount`, `paid_amount`, `disbursal_date`, `payment_status`, `payment_mode`, `transaction_reference`, `remarks`) VALUES
(1, 'PRIZE-2025-001', 'AUC-2025-001', 'GRP-2025-SILVER', 'CUST-1001', 'MEM-001', 1, 1, 500000.00, 100000.00, 400000.00, 400000.00, '2025-01-18', 'Paid', 'Bank Transfer', 'NEFT/HDFC/9028310', 'Prize disbursed after surety verification'),
(2, 'PRIZE-2025-002', 'AUC-2025-002', 'GRP-2025-SILVER', 'CUST-1002', 'MEM-002', 2, 2, 500000.00, 90000.00, 410000.00, 200000.00, '2025-02-20', 'Partially Paid', 'Bank Transfer', 'RTGS/SBI/4491028', 'First installment of prize released');

-- Demo Expenses
INSERT INTO `expenses` (`id`, `expense_id`, `expense_date`, `category`, `description`, `amount`, `payment_mode`, `reference_number`, `remarks`, `created_by_user_id`) VALUES
(1, 'EXP-2025-001', '2025-01-05', 'Rent', 'Branch Office Monthly Rent - Jan 2025', 28000.00, 'Bank Transfer', 'TXN-RENT-JAN', 'Paid to landlord', 1),
(2, 'EXP-2025-002', '2025-01-15', 'Office Expense', 'Printing of passbooks, receipt books & stationery', 4500.00, 'UPI', 'UPI/STA/90182', 'Sri Balaji Printers', 2),
(3, 'EXP-2025-003', '2025-01-31', 'Salary', 'Staff salary for Jan 2025', 35000.00, 'Bank Transfer', 'NEFT/SAL/JAN25', 'Salaries credited', 1),
(4, 'EXP-2025-004', '2025-02-05', 'Rent', 'Branch Office Monthly Rent - Feb 2025', 28000.00, 'Bank Transfer', 'TXN-RENT-FEB', 'Paid to landlord', 1),
(5, 'EXP-2025-005', '2025-02-12', 'Bank Charges', 'SMS and Bank collection charges', 1250.00, 'Bank Transfer', 'CHG-FEB-01', 'Direct debit by bank', 1);

-- Demo Notifications
INSERT INTO `notifications` (`id`, `notification_id`, `type`, `title`, `message`, `related_id`, `due_date`, `is_read`) VALUES
(1, 'NOTIF-001', 'upcoming_auction', 'Upcoming Auction: Silver Monthly 5L', 'Auction #3 scheduled for 10th of next month at 4:00 PM.', 'GRP-2025-SILVER', '2025-03-10', 0),
(2, 'NOTIF-002', 'pending_prize_payment', 'Balance Prize Disbursal Due: Priya Sundaram', 'Remaining ₹2,10,000 for Auction #2 pending disbursal.', 'PRIZE-2025-002', '2025-03-05', 0),
(3, 'NOTIF-003', 'overdue_installment', 'Overdue Installment Alert: Vignesh Balaji', 'Ticket #8 installment overdue for Silver Monthly 5L.', 'MEM-008', '2025-02-10', 0);
