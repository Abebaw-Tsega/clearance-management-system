const pool = require('../config/db');

const submitClearanceRequest = async (req, res) => {
  const { clearance_type_id } = req.body;
  const user_id = req.user.user_id;

  try {
    const [students] = await pool.query('SELECT student_id, department_id, block_id FROM students WHERE user_id = ?', [user_id]);
    if (students.length === 0) {
      return res.status(403).json({ error: 'User is not a student' });
    }

    const [clearanceTypes] = await pool.query('SELECT clearance_type_id FROM clearance_types WHERE clearance_type_id = ?', [clearance_type_id]);
    if (clearanceTypes.length === 0) {
      return res.status(400).json({ error: 'Invalid clearance type' });
    }

    const [schedule] = await pool.query(
      'SELECT 1 FROM clearance_schedules WHERE clearance_type_id = ? AND is_active = TRUE AND NOW() BETWEEN start_time AND end_time',
      [clearance_type_id]
    );
    if (schedule.length === 0) {
      return res.status(400).json({ error: 'Clearance system is closed for this type' });
    }

    const [result] = await pool.query(
      'INSERT INTO clearance_requests (student_id, clearance_type_id) VALUES (?, ?)',
      [students[0].student_id, clearance_type_id]
    );
    const request_id = result.insertId;

    // Insert approvals
    await pool.query('START TRANSACTION');

    // Department Head
    const [deptHead] = await pool.query(
      'SELECT r.user_id FROM roles r JOIN departments d ON r.specific_role = d.department_name WHERE r.general_role = "department_head" AND d.department_id = ? LIMIT 1',
      [students[0].department_id]
    );
    if (deptHead.length === 0) throw new Error('No department_head found');
    await pool.query('INSERT INTO clearance_approval (request_id, user_id, status) VALUES (?, ?, "pending")', [request_id, deptHead[0].user_id]);

    // Librarian
    const [librarian] = await pool.query(
      'SELECT user_id FROM roles WHERE general_role = "librarian" AND specific_role IS NULL LIMIT 1'
    );
    if (librarian.length === 0) throw new Error('No librarian found');
    await pool.query('INSERT INTO clearance_approval (request_id, user_id, status) VALUES (?, ?, "pending")', [request_id, librarian[0].user_id]);

    // Cafeteria
    const [cafeteria] = await pool.query(
      'SELECT user_id FROM roles WHERE general_role = "cafeteria" AND specific_role IS NULL LIMIT 1'
    );
    if (cafeteria.length === 0) throw new Error('No cafeteria staff found');
    await pool.query('INSERT INTO clearance_approval (request_id, user_id, status) VALUES (?, ?, "pending")', [request_id, cafeteria[0].user_id]);

    // Dormitory
    const [dormitory] = await pool.query(
      'SELECT r.user_id FROM roles r JOIN blocks b ON r.specific_role = b.block_no WHERE r.general_role = "dormitory" AND b.block_id = ? LIMIT 1',
      [students[0].block_id]
    );
    if (dormitory.length === 0) throw new Error('No dormitory staff found');
    await pool.query('INSERT INTO clearance_approval (request_id, user_id, status) VALUES (?, ?, "pending")', [request_id, dormitory[0].user_id]);

    // Sport
    const [sport] = await pool.query(
      'SELECT user_id FROM roles WHERE general_role = "sport" AND specific_role IS NULL LIMIT 1'
    );
    if (sport.length === 0) throw new Error('No sport staff found');
    await pool.query('INSERT INTO clearance_approval (request_id, user_id, status) VALUES (?, ?, "pending")', [request_id, sport[0].user_id]);

    // Student Affair
    const [studentAffair] = await pool.query(
      'SELECT user_id FROM roles WHERE general_role = "student_affair" AND specific_role IS NULL LIMIT 1'
    );
    if (studentAffair.length === 0) throw new Error('No student_affair staff found');
    await pool.query('INSERT INTO clearance_approval (request_id, user_id, status) VALUES (?, ?, "pending")', [request_id, studentAffair[0].user_id]);

    // Registrar
    const [registrar] = await pool.query(
      'SELECT user_id FROM roles WHERE general_role = "registrar" AND specific_role IS NULL LIMIT 1'
    );
    if (registrar.length === 0) throw new Error('No registrar found');
    await pool.query('INSERT INTO clearance_approval (request_id, user_id, status) VALUES (?, ?, "pending")', [request_id, registrar[0].user_id]);

    await pool.query('COMMIT');

    res.status(201).json({ message: 'Clearance request submitted', request_id });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Submit clearance request error:', error.message);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

const getClearanceStatus = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const [students] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [user_id]);
    if (students.length === 0) {
      return res.status(403).json({ error: 'User is not a student' });
    }

    const [rows] = await pool.query(
      'SELECT request_id, clearance_type, overall_status, total_approvals, approved_count, rejected_count, ' +
      'department_head_status, librarian_status, cafeteria_status, dormitory_status, sport_status, ' +
      'student_affair_status, registrar_status ' +
      'FROM clearance_request_status WHERE student_id = ?',
      [students[0].student_id]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Get clearance status error:', error.message);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

// Placeholder for certificate generation (requires pdfkit or similar)
const getClearanceCertificate = async (req, res) => {
  const { request_id } = req.params;
  const user_id = req.user.user_id;

  try {
    const [students] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [user_id]);
    if (students.length === 0) {
      return res.status(403).json({ error: 'User is not a student' });
    }

    const [status] = await pool.query(
      'SELECT overall_status FROM clearance_request_status WHERE request_id = ? AND student_id = ?',
      [request_id, students[0].student_id]
    );

    if (status.length === 0 || status[0].overall_status !== 'a@for (condition) 
      
    @endforpproved') {
      return res.status(400).json({ error: 'Clearance request not approved or not found' });
    }

    // Implement PDF generation here (e.g., using pdfkit)
    res.json({ message: 'Certificate generation placeholder' });
  } catch (error) {
    console.error('Get clearance certificate error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { submitClearanceRequest, getClearanceStatus, getClearanceCertificate };