const pool = require('../config/db');

const submitClearanceRequest = async (req, res) => {
  const { clearance_type_id } = req.body;
  const user_id = req.user.user_id;

  try {
    // Verify student
    const [students] = await pool.query(
      'SELECT student_id, department_id, block_id, study_level FROM students WHERE user_id = ?',
      [user_id]
    );
    if (students.length === 0) {
      console.log(`No student found for user_id: ${user_id}`);
      return res.status(403).json({ error: 'User is not a student' });
    }
    const student = students[0];

    // Verify clearance type
    const [clearanceTypes] = await pool.query(
      'SELECT clearance_type_id FROM clearance_types WHERE clearance_type_id = ?',
      [clearance_type_id]
    );
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

    // Check for existing request
    const [existingRequest] = await pool.query(
      'SELECT 1 FROM clearance_requests WHERE student_id = ? AND clearance_type_id = ?',
      [student.student_id, clearance_type_id]
    );
    if (existingRequest.length > 0) {
      return res.status(400).json({ error: 'You have already submitted a clearance request for this schedule.' });
    }

    // Insert clearance request
    await pool.query('START TRANSACTION');
    const [result] = await pool.query(
      'INSERT INTO clearance_requests (student_id, clearance_type_id, created_at) VALUES (?, ?, NOW())',
      [student.student_id, clearance_type_id]
    );
    const request_id = result.insertId;

    // Phase 1: Department Head
    const [deptHead] = await pool.query(
      'SELECT r.user_id FROM roles r JOIN departments d ON r.specific_role = d.department_name WHERE r.general_role = "department_head" AND d.department_id = ? LIMIT 1',
      [student.department_id]
    );
    if (deptHead.length === 0) throw new Error('No department_head found for department_id: ' + student.department_id);
    await pool.query(
      'INSERT INTO clearance_approval (request_id, user_id, status, updated_at) VALUES (?, ?, "pending", NOW())',
      [request_id, deptHead[0].user_id]
    );

    // Librarian
    const [librarian] = await pool.query(
      'SELECT user_id FROM roles WHERE general_role = "librarian" AND specific_role IS NULL LIMIT 1'
    );
    if (librarian.length === 0) throw new Error('No librarian found');
    await pool.query(
      'INSERT INTO clearance_approval (request_id, user_id, status, updated_at) VALUES (?, ?, "pending", NOW())',
      [request_id, librarian[0].user_id]
    );

    // Cafeteria
    const [cafeteria] = await pool.query(
      'SELECT user_id FROM roles WHERE general_role = "cafeteria" AND specific_role IS NULL LIMIT 1'
    );
    if (cafeteria.length === 0) throw new Error('No cafeteria staff found');
    await pool.query(
      'INSERT INTO clearance_approval (request_id, user_id, status, updated_at) VALUES (?, ?, "pending", NOW())',
      [request_id, cafeteria[0].user_id]
    );

    // Dormitory (only for non-PhD students)
    if (student.study_level !== 'phd') {
      const [dormitory] = await pool.query(
        'SELECT r.user_id FROM roles r JOIN blocks b ON r.specific_role = b.block_no WHERE r.general_role = "dormitory" AND b.block_id = ? LIMIT 1',
        [student.block_id]
      );
      if (dormitory.length === 0) throw new Error('No dormitory staff found for block_id: ' + student.block_id);
      await pool.query(
        'INSERT INTO clearance_approval (request_id, user_id, status, updated_at) VALUES (?, ?, "pending", NOW())',
        [request_id, dormitory[0].user_id]
      );
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
    const [students] = await pool.query(
      'SELECT student_id, study_level, id_no FROM students WHERE user_id = ?',
      [user_id]
    );
    if (students.length === 0) {
      console.log(`No student found for user_id: ${user_id}`);
      return res.status(403).json({ error: 'User is not a student' });
    }
    const student = students[0];

    const [rows] = await pool.query(
      'SELECT crs.request_id, crs.student_id, crs.clearance_type, crs.total_approvals, crs.approved_count, ' +
      'crs.rejected_count, crs.overall_status, crs.department_head_status, crs.librarian_status, ' +
      'crs.cafeteria_status, crs.dormitory_status, crs.sport_status, crs.student_affair_status, ' +
      'crs.registrar_status, c.created_at AS certificate_created_at, s.id_no, s.study_level ' +
      'FROM clearance_request_status crs ' +
      'LEFT JOIN certificates c ON crs.request_id = c.request_id AND crs.student_id = c.student_id ' +
      'LEFT JOIN students s ON crs.student_id = s.student_id ' +
      'WHERE crs.student_id = ?',
      [student.student_id]
    );

    // For PhD students, set dormitory_status to 'skipped' if null
    const processedRequests = rows.map(req => ({
      ...req,
      id: req.request_id, // Ensure 'id' is included for frontend
      dormitory_status: student.study_level === 'phd' && !req.dormitory_status ? 'skipped' : req.dormitory_status,
      departments: [
        { name: 'Department Head', status: req.department_head_status || 'pending' },
        { name: 'Librarian', status: req.librarian_status || 'pending' },
        { name: 'Cafeteria', status: req.cafeteria_status || 'pending' },
        ...(student.study_level === 'phd' ? [] : [{ name: 'Dormitory', status: req.dormitory_status || 'skipped' }]),
        { name: 'Sport', status: req.sport_status || 'pending' },
        { name: 'Student Affair', status: req.student_affair_status || 'pending' },
        { name: 'Registrar', status: req.registrar_status || 'pending' }
      ]
    }));

    console.log('Clearance status response:', processedRequests);
    res.status(200).json(processedRequests);
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