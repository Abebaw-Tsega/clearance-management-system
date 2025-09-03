const pool = require('../config/db');

const submitClearanceRequest = async (req, res) => {
  const { clearance_type_id } = req.body;
  const user_id = req.user.user_id;

  try {
    // Verify student
    const [students] = await pool.query('SELECT student_id, department_id, block_id, study_level FROM students WHERE user_id = ?', [user_id]);
    if (students.length === 0) {
      console.log(`No student found for user_id: ${user_id}`);
      return res.status(403).json({ error: 'User is not a student' });
    }
    const student = students[0];

    // Verify clearance type
    const [clearanceTypes] = await pool.query('SELECT clearance_type_id FROM clearance_types WHERE clearance_type_id = ?', [clearance_type_id]);
    if (clearanceTypes.length === 0) {
      return res.status(400).json({ error: 'Invalid clearance type' });
    }

    // Verify schedule
    const [schedule] = await pool.query(
      'SELECT 1 FROM clearance_schedules WHERE clearance_type_id = ? AND is_active = TRUE AND NOW() BETWEEN start_time AND end_time',
      [clearance_type_id]
    );
    if (schedule.length === 0) {
      return res.status(400).json({ error: 'Clearance system is closed for this type' });
    }

    // Insert clearance request
    const [result] = await pool.query(
      'INSERT INTO clearance_requests (student_id, clearance_type_id) VALUES (?, ?)',
      [student.student_id, clearance_type_id]
    );
    const request_id = result.insertId;

    await pool.query('START TRANSACTION');

    // Phase 1: Department Head
    const [deptHead] = await pool.query(
      'SELECT r.user_id FROM roles r JOIN departments d ON r.specific_role = d.department_name WHERE r.general_role = "department_head" AND d.department_id = ? LIMIT 1',
      [student.department_id]
    );
    if (deptHead.length === 0) throw new Error('No department_head found for department_id: ' + student.department_id);
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

    // Dormitory (skip for PhD)
    if (student.study_level !== 'phd') {
      const [dormitory] = await pool.query(
        'SELECT r.user_id FROM roles r JOIN blocks b ON r.specific_role = b.block_no WHERE r.general_role = "dormitory" AND b.block_id = ? LIMIT 1',
        [student.block_id]
      );
      if (dormitory.length === 0) throw new Error('No dormitory staff found for block_id: ' + student.block_id);
      await pool.query('INSERT INTO clearance_approval (request_id, user_id, status) VALUES (?, ?, "pending")', [request_id, dormitory[0].user_id]);
    }

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
      console.log(`No student found for user_id: ${user_id}`);
      return res.status(403).json({ error: 'User is not a student' });
    }

    const [rows] = await pool.query(
      'SELECT request_id, student_id, clearance_type, total_approvals, approved_count, rejected_count, overall_status, ' +
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

    // Fix: properly check for approved status
    if (status.length === 0 || status[0].overall_status !== 'approved') {
      return res.status(400).json({ error: 'Clearance request not approved or not found' });
    }

    // Implement PDF generation here (e.g., using pdfkit)
    res.json({ message: 'Certificate generation placeholder' });
  } catch (error) {
    console.error('Get clearance certificate error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current student profile
const getStudentProfile = async (req, res) => {
  const user_id = req.user.user_id;
  try {
    const [students] = await pool.query(`
      SELECT s.*, u.first_name, u.last_name, u.email, d.department_name
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      WHERE s.user_id = ?
    `, [user_id]);
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.status(200).json(students[0]);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

module.exports = {
  submitClearanceRequest,
  getClearanceStatus,
  getClearanceCertificate,
  getStudentProfile
};