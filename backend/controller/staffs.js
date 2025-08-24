const pool = require('../config/db');

const getPendingRequests = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const [requests] = await pool.query(
      `SELECT cr.request_id, ct.type_name, s.id_no, u.first_name, u.last_name, ca.status
       FROM clearance_approval ca
       JOIN clearance_requests cr ON ca.request_id = cr.request_id
       JOIN clearance_types ct ON cr.clearance_type_id = ct.clearance_type_id
       JOIN students s ON cr.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id
       WHERE ca.user_id = ? AND ca.status = 'pending'`,
      [user_id]
    );

    res.json(requests);
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const takeActionOnRequest = async (req, res) => {
  const { request_id } = req.params;
  const { status, comments } = req.body;
  const user_id = req.user.user_id;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    // Fetch user role
    const [roles] = await pool.query(
      'SELECT general_role FROM roles WHERE user_id = ? LIMIT 1',
      [user_id]
    );
    if (roles.length === 0) {
      return res.status(403).json({ error: 'User has no role' });
    }
    const user_role = roles[0].general_role;

    // Fetch approval record
    const [approvals] = await pool.query(
      'SELECT approval_id FROM clearance_approval WHERE request_id = ? AND user_id = ?',
      [request_id, user_id]
    );
    if (approvals.length === 0) {
      return res.status(403).json({ error: 'Not authorized to act on this request' });
    }

    // Check approval prerequisites
    let can_approve = true;
    if (user_role === 'dormitory') {
      const [phase1] = await pool.query(
        `SELECT COUNT(*) as approved_count
         FROM clearance_approval ca
         JOIN roles r ON ca.user_id = r.user_id
         WHERE ca.request_id = ? AND r.general_role IN ('department_head', 'librarian', 'cafeteria')
         AND ca.status = 'approved'`,
        [request_id]
      );
      if (phase1[0].approved_count < 3) {
        can_approve = false;
      }
    } else if (user_role === 'sport') {
      const [dormitory] = await pool.query(
        `SELECT COUNT(*) as approved_count
         FROM clearance_approval ca
         JOIN roles r ON ca.user_id = r.user_id
         WHERE ca.request_id = ? AND r.general_role = 'dormitory'
         AND ca.status = 'approved'`,
        [request_id]
      );
      if (dormitory[0].approved_count < 1) {
        can_approve = false;
      }
    } else if (user_role === 'student_affair') {
      const [sport] = await pool.query(
        `SELECT COUNT(*) as approved_count
         FROM clearance_approval ca
         JOIN roles r ON ca.user_id = r.user_id
         WHERE ca.request_id = ? AND r.general_role = 'sport'
         AND ca.status = 'approved'`,
        [request_id]
      );
      if (sport[0].approved_count < 1) {
        can_approve = false;
      }
    } else if (user_role === 'registrar') {
      const [student_affair] = await pool.query(
        `SELECT COUNT(*) as approved_count
         FROM clearance_approval ca
         JOIN roles r ON ca.user_id = r.user_id
         WHERE ca.request_id = ? AND r.general_role = 'student_affair'
         AND ca.status = 'approved'`,
        [request_id]
      );
      if (student_affair[0].approved_count < 1) {
        can_approve = false;
      }
    }

    if (status === 'approved' && !can_approve) {
      return res.status(400).json({ error: 'Cannot approve: prerequisite approvals not met' });
    }

    // Update approval status
    await pool.query(
      'UPDATE clearance_approval SET status = ?, comments = ? WHERE approval_id = ?',
      [status, comments || null, approvals[0].approval_id]
    );

    res.json({ message: `Request ${status}` });
  } catch (error) {
    console.error('Take action error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getPendingRequests, takeActionOnRequest };