const pool = require('../config/db');

const getAllClearanceData = async (req, res) => {
  try {
    const [data] = await pool.query(
      `SELECT cr.request_id, ct.type_name, s.id_no, u.first_name, u.last_name, 
              crs.overall_status, crs.total_approvals, crs.approved_count, crs.rejected_count
       FROM clearance_request_status crs
       JOIN clearance_requests cr ON crs.request_id = cr.request_id
       JOIN clearance_types ct ON cr.clearance_type_id = ct.clearance_type_id
       JOIN students s ON cr.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id`
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

module.exports = { getAllClearanceData, toggleClearanceSystem, assignRole };