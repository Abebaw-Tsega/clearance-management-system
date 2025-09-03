// Get all clearance types
const getClearanceTypes = async (req, res) => {
  try {
    const [types] = await pool.query('SELECT clearance_type_id, type_name FROM clearance_types');
    res.json(types);
  } catch (error) {
    console.error('Get clearance types error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get recent clearance requests for overview
const getRecentRequests = async (req, res) => {
  try {
    const [requests] = await pool.query(`
      SELECT cr.request_id, cr.created_at, ct.type_name, s.id_no, u.first_name, u.last_name,
             crs.overall_status, crs.total_approvals, crs.approved_count, crs.rejected_count
      FROM clearance_request_status crs
      JOIN clearance_requests cr ON crs.request_id = cr.request_id
      JOIN clearance_types ct ON cr.clearance_type_id = ct.clearance_type_id
      JOIN students s ON cr.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      ORDER BY cr.created_at DESC LIMIT 20
    `);
    res.json(requests);
  } catch (error) {
    console.error('Get recent requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update system control (reason, end date/time, activation)
const updateSystemControl = async (req, res) => {
  const { reason, startDate, startTime, endDate, endTime, is_active } = req.body;
  try {
    if (!reason || !startDate || !startTime || !endDate || !endTime) {
      return res.status(400).json({ error: 'Missing required fields: reason, startDate, startTime, endDate, endTime' });
    }
    // Find clearance_type_id by reason
    const [types] = await pool.query('SELECT clearance_type_id FROM clearance_types WHERE type_name = ?', [reason]);
    if (!types.length) {
      console.error('No clearance_type_id found for reason:', reason);
      return res.status(400).json({ error: 'Invalid clearance type: ' + reason });
    }
    const clearance_type_id = types[0].clearance_type_id;
    const startDateTime = `${startDate} ${startTime}`;
    const endDateTime = `${endDate} ${endTime}`;
    // Fallback for created_by if req.user is missing
    const createdBy = req.user?.user_id || 1;


    const [existing] = await pool.query(
      'SELECT 1 FROM clearance_schedules '
    );


    if (existing.length) {
      await pool.query(
        'UPDATE clearance_schedules SET is_active = ?, start_time = ?, end_time = ?, created_by = ? WHERE clearance_type_id = ?',
        [is_active, startDateTime, endDateTime, createdBy, clearance_type_id]
      );
    } else {
      await pool.query(
        'INSERT INTO clearance_schedules (clearance_type_id, is_active, start_time, end_time, created_by) VALUES (?, ?, ?, ?, ?)',
        [clearance_type_id, is_active, startDateTime, endDateTime, createdBy]
      );
    }
    res.json({ message: 'System control updated' });
  } catch (error) {
    console.error('Update system control error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};
const pool = require('../config/db');

const getAllClearanceData = async (req, res) => {
  try {
    const [data] = await pool.query(
      `SELECT cr.request_id,
              ct.type_name,
              s.id_no,
              u.first_name,
              u.last_name,
              d.department_name,
              s.year_of_study,
              cr.created_at,
              crs.overall_status,
              crs.total_approvals,
              crs.approved_count,
              crs.rejected_count
       FROM clearance_request_status crs
       JOIN clearance_requests cr ON crs.request_id = cr.request_id
       JOIN clearance_types ct ON cr.clearance_type_id = ct.clearance_type_id
       JOIN students s ON cr.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN departments d ON s.department_id = d.department_id
       ORDER BY cr.created_at DESC
       LIMIT 20`
    );

    res.json(data);
  } catch (error) {
    console.error('Get clearance data error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const toggleClearanceSystem = async (req, res) => {
  const { clearance_type_id, is_active } = req.body;

  try {
    await pool.query(
      'UPDATE clearance_schedules SET is_active = ? WHERE clearance_type_id = ?',
      [is_active, clearance_type_id]
    );

    res.json({ message: `Clearance system ${is_active ? 'enabled' : 'disabled'}` });
  } catch (error) {
    console.error('Toggle clearance system error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current clearance system/schedule
const getClearanceSystem = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cs.is_active, ct.type_name AS reason,
             DATE_FORMAT(cs.start_time, '%Y-%m-%d') AS startDate,
             DATE_FORMAT(cs.start_time, '%H:%i') AS startTime,
             DATE_FORMAT(cs.end_time, '%Y-%m-%d') AS endDate,
             DATE_FORMAT(cs.end_time, '%H:%i') AS endTime
      FROM clearance_schedules cs
      JOIN clearance_types ct ON cs.clearance_type_id = ct.clearance_type_id
      WHERE cs.is_active = TRUE
      ORDER BY cs.start_time DESC
      LIMIT 1
    `);
    if (rows.length === 0) {
      return res.status(200).json({ is_active: false });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

const assignRole = async (req, res) => {
  const { user_id, general_role, specific_role } = req.body;

  try {
    await pool.query(
      'INSERT INTO roles (user_id, general_role, specific_role) VALUES (?, ?, ?)',
      [user_id, general_role, specific_role || null]
    );

    res.status(201).json({ message: 'Role assigned' });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllStudents = async (req, res) => {
  try {
    const [students] = await pool.query(`
      SELECT 
        s.student_id,
        u.first_name,
        u.last_name,
        s.id_no,
        d.department_name,
        s.year_of_study,
        s.study_level,
        COALESCE(crs.overall_status, 'pending') AS clearance_status
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      LEFT JOIN clearance_request_status crs ON crs.student_id = s.student_id
    `);
    res.json(students);
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllClearanceData,
  toggleClearanceSystem,
  assignRole,
  getClearanceSystem,
  getAllStudents,
  getClearanceTypes,
  getRecentRequests,
  updateSystemControl,
};