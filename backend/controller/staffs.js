// backend/controller/staffs.js
const pool = require('../config/db');

const approveRequest = async (req, res) => {
  const { request_id } = req.params;
  const { status, comments } = req.body;
  const user_id = req.user.user_id;

  try {
    // Validate status and comments
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }
    if (status === 'rejected' && (!comments || comments.trim() === '')) {
      return res.status(400).json({ error: 'Comment is required for rejection' });
    }

    const [roles] = await pool.query('SELECT general_role, specific_role FROM roles WHERE user_id = ?', [user_id]);
    if (roles.length === 0) {
      return res.status(403).json({ error: 'User has no role' });
    }
    const role = roles[0].general_role;

    // Check if user can (re)act on this request
    const [approval] = await pool.query(
      'SELECT approval_id, status FROM clearance_approval WHERE request_id = ? AND user_id = ? AND status IN ("pending","approved","rejected")',
      [request_id, user_id]
    );
    if (approval.length === 0) {
      return res.status(403).json({ error: 'No pending/approved/rejected approval for this user' });
    }

    // Check prerequisites
    if (role === 'sport') {
      const [phase1] = await pool.query(
        'SELECT COUNT(*) AS count FROM clearance_approval ca ' +
        'JOIN roles r ON ca.user_id = r.user_id ' +
        'WHERE ca.request_id = ? AND r.general_role IN ("department_head", "librarian", "cafeteria", "dormitory") ' +
        'AND ca.status = "approved"',
        [request_id]
      );
      const [student] = await pool.query('SELECT study_level FROM students s JOIN clearance_requests cr ON s.student_id = cr.student_id WHERE cr.request_id = ?', [request_id]);
      const requiredCount = student[0].study_level === 'phd' ? 3 : 4;
      if (phase1[0].count < requiredCount) {
        return res.status(403).json({ error: 'Phase 1 approvals not complete' });
      }
    } else if (role === 'student_affair') {
      const [sport] = await pool.query(
        'SELECT COUNT(*) AS count FROM clearance_approval ca JOIN roles r ON ca.user_id = r.user_id ' +
        'WHERE ca.request_id = ? AND r.general_role = "sport" AND ca.status = "approved"',
        [request_id]
      );
      if (sport[0].count === 0) {
        return res.status(403).json({ error: 'Sport approval not complete' });
      }
    } else if (role === 'registrar') {
      const [studentAffair] = await pool.query(
        'SELECT COUNT(*) AS count FROM clearance_approval ca JOIN roles r ON ca.user_id = r.user_id ' +
        'WHERE ca.request_id = ? AND r.general_role = "student_affair" AND ca.status = "approved"',
        [request_id]
      );
      if (studentAffair[0].count === 0) {
        return res.status(403).json({ error: 'Student affair approval not complete' });
      }
    }

    // Update approval
    await pool.query(
      'UPDATE clearance_approval SET status = ?, comments = ?, approved_at = NOW(), updated_at = NOW() WHERE approval_id = ?',
      [status, status === 'approved' ? (comments || null) : comments, approval[0].approval_id]
    );

    // Create next phase row if approved
    if (status === 'approved') {
      await pool.query('START TRANSACTION');

      if (['department_head', 'librarian', 'cafeteria', 'dormitory'].includes(role)) {
        const [phase1] = await pool.query(
          'SELECT COUNT(*) AS count FROM clearance_approval ca ' +
          'JOIN roles r ON ca.user_id = r.user_id ' +
          'WHERE ca.request_id = ? AND r.general_role IN ("department_head", "librarian", "cafeteria", "dormitory") ' +
          'AND ca.status = "approved"',
          [request_id]
        );
        const [student] = await pool.query('SELECT study_level FROM students s JOIN clearance_requests cr ON s.student_id = cr.student_id WHERE cr.request_id = ?', [request_id]);
        const requiredCount = student[0].study_level === 'phd' ? 3 : 4;
        if (phase1[0].count === requiredCount) {
          const [sport] = await pool.query(
            'SELECT user_id FROM roles WHERE general_role = "sport" AND specific_role IS NULL LIMIT 1'
          );
          if (sport.length === 0) throw new Error('No sport staff found');

          // Check if sport approval already exists
          const [existingSportApproval] = await pool.query(
            'SELECT approval_id FROM clearance_approval WHERE request_id = ? AND user_id = ?',
            [request_id, sport[0].user_id]
          );

          // Only create if it doesn't exist
          if (existingSportApproval.length === 0) {
            await pool.query(
              'INSERT INTO clearance_approval (request_id, user_id, status) VALUES (?, ?, "pending")',
              [request_id, sport[0].user_id]
            );
          }
        }
      } else if (role === 'sport') {
        const [studentAffair] = await pool.query(
          'SELECT user_id FROM roles WHERE general_role = "student_affair" AND specific_role IS NULL LIMIT 1'
        );
        if (studentAffair.length === 0) throw new Error('No student_affair staff found');

        // Check if student affair approval already exists
        const [existingStudentAffairApproval] = await pool.query(
          'SELECT approval_id FROM clearance_approval WHERE request_id = ? AND user_id = ?',
          [request_id, studentAffair[0].user_id]
        );

        // Only create if it doesn't exist
        if (existingStudentAffairApproval.length === 0) {
          await pool.query(
            'INSERT INTO clearance_approval (request_id, user_id, status) VALUES (?, ?, "pending")',
            [request_id, studentAffair[0].user_id]
          );
        }
      } else if (role === 'student_affair') {
        const [registrar] = await pool.query(
          'SELECT user_id FROM roles WHERE general_role = "registrar" AND specific_role IS NULL LIMIT 1'
        );
        if (registrar.length === 0) throw new Error('No registrar found');

        // Check if registrar approval already exists
        const [existingRegistrarApproval] = await pool.query(
          'SELECT approval_id FROM clearance_approval WHERE request_id = ? AND user_id = ?',
          [request_id, registrar[0].user_id]
        );

        // Only create if it doesn't exist
        if (existingRegistrarApproval.length === 0) {
          await pool.query(
            'INSERT INTO clearance_approval (request_id, user_id, status) VALUES (?, ?, "pending")',
            [request_id, registrar[0].user_id]
          );
        }
      }

      await pool.query('COMMIT');
    }

    res.status(200).json({ message: `Request ${status}` });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Approve request error:', error.message);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

const getPendingRequests = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const [roles] = await pool.query(
      'SELECT general_role, specific_role FROM roles WHERE user_id = ?',
      [user_id]
    );
    if (roles.length === 0) {
      return res.status(403).json({ error: 'User has no role' });
    }
    const role = roles[0].general_role;
    const specific_role = roles[0].specific_role;

    // Base query: pending, approved or rejected + student info + comments
    let query = `
      SELECT 
        cr.request_id,
        s.student_id,
        u.first_name,
        u.last_name,
        u.email,
        s.id_no,
        s.room_no,
        d.department_name AS department,
        s.study_level,
        s.year_of_study,
        ct.type_name AS clearance_type,
        ca.status,
        ca.comments,
        cr.created_at
      FROM clearance_requests cr
      JOIN clearance_types ct ON cr.clearance_type_id = ct.clearance_type_id
      JOIN clearance_approval ca ON cr.request_id = ca.request_id
      JOIN roles r ON ca.user_id = r.user_id
      JOIN students s ON cr.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      JOIN departments d ON s.department_id = d.department_id
      WHERE ca.user_id = ? 
        AND ca.status IN ('pending','approved','rejected')
    `;
    let params = [user_id];

    // Role‐specific filters:
    if (role === 'sport') {
      query = `
        SELECT cr.request_id, s.student_id, u.first_name, u.last_name, u.email,
               s.id_no, d.department_name AS department, s.study_level, s.year_of_study,
               ct.type_name AS clearance_type, ca.status, ca.comments, cr.created_at
        FROM clearance_requests cr
        JOIN clearance_types ct ON cr.clearance_type_id = ct.clearance_type_id
        JOIN clearance_approval ca ON cr.request_id = ca.request_id
        JOIN roles r ON ca.user_id = r.user_id
        JOIN students s ON cr.student_id = s.student_id
        JOIN users u ON s.user_id = u.user_id
        JOIN departments d ON s.department_id = d.department_id
        WHERE r.general_role = 'sport'
          AND ca.status IN ('pending','approved','rejected')
          AND (
            SELECT COUNT(*) FROM clearance_approval ca2
            JOIN roles r2 ON ca2.user_id = r2.user_id
            WHERE ca2.request_id = cr.request_id
              AND r2.general_role IN ('department_head','librarian','cafeteria','dormitory')
              AND ca2.status = 'approved'
          ) = (
            SELECT CASE WHEN s2.study_level='phd' THEN 3 ELSE 4 END
            FROM students s2
            WHERE s2.student_id = cr.student_id
          )
      `;
      params = [];
    } else if (role === 'student_affair') {
      query = `
        SELECT cr.request_id, s.student_id, u.first_name, u.last_name, u.email,
               s.id_no, d.department_name AS department, s.study_level, s.year_of_study,
               ct.type_name AS clearance_type, ca.status, ca.comments, cr.created_at
        FROM clearance_requests cr
        JOIN clearance_types ct ON cr.clearance_type_id = ct.clearance_type_id
        JOIN clearance_approval ca ON cr.request_id = ca.request_id
        JOIN roles r ON ca.user_id = r.user_id
        JOIN students s ON cr.student_id = s.student_id
        JOIN users u ON s.user_id = u.user_id
        JOIN departments d ON s.department_id = d.department_id
        WHERE r.general_role = 'student_affair'
          AND ca.status IN ('pending','approved','rejected')
          AND EXISTS (
            SELECT 1 FROM clearance_approval ca2
            JOIN roles r2 ON ca2.user_id = r2.user_id
            WHERE ca2.request_id = cr.request_id
              AND r2.general_role = 'sport'
              AND ca2.status = 'approved'
          )
      `;
      params = [];
    } else if (role === 'registrar') {
      query = `
        SELECT cr.request_id, s.student_id, u.first_name, u.last_name, u.email,
               s.id_no, d.department_name AS department, s.study_level, s.year_of_study,
               ct.type_name AS clearance_type, ca.status, ca.comments, cr.created_at
        FROM clearance_requests cr
        JOIN clearance_types ct ON cr.clearance_type_id = ct.clearance_type_id
        JOIN clearance_approval ca ON cr.request_id = ca.request_id
        JOIN roles r ON ca.user_id = r.user_id
        JOIN students s ON cr.student_id = s.student_id
        JOIN users u ON s.user_id = u.user_id
        JOIN departments d ON s.department_id = d.department_id
        WHERE r.general_role = 'registrar'
          AND ca.status IN ('pending','approved','rejected')
          AND EXISTS (
            SELECT 1 FROM clearance_approval ca2
            JOIN roles r2 ON ca2.user_id = r2.user_id
            WHERE ca2.request_id = cr.request_id
              AND r2.general_role = 'student_affair'
              AND ca2.status = 'approved'
          )
      `;
      params = [];
    } else if (role === 'department_head') {
      query += ' AND r.specific_role = ?';
      params.push(specific_role);
    } else if (role === 'dormitory') {
      query += `
        AND r.specific_role = (
          SELECT b.block_no 
          FROM blocks b 
          JOIN students s2 ON b.block_id = s2.block_id 
          WHERE s2.student_id = cr.student_id
        )
      `;
    }

    const [rows] = await pool.query(query, params);
    res.status(200).json(rows);

  } catch (error) {
    console.error('Get pending requests error:', error.message);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

// Staff profile endpoint
const getStaffProfile = async (req, res) => {
  const user_id = req.user.user_id;
  try {
    const [staff] = await pool.query(`
      SELECT u.first_name, u.last_name, u.email, u.phone, r.general_role, r.specific_role, d.department_name, u.created_at
      FROM users u
      JOIN roles r ON u.user_id = r.user_id
      LEFT JOIN departments d ON r.specific_role = d.department_name
      WHERE u.user_id = ?
      LIMIT 1
    `, [user_id]);
    if (staff.length === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.status(200).json(staff[0]);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

module.exports = { approveRequest, getPendingRequests, getStaffProfile };