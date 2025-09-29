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

    // Check if user can act on this request
    const [approval] = await pool.query(
      'SELECT approval_id, status FROM clearance_approval WHERE request_id = ? AND user_id = ? AND status IN ("pending","approved","rejected")',
      [request_id, user_id]
    );
    if (approval.length === 0) {
      return res.status(403).json({ error: 'No pending/approved/rejected approval for this user' });
    }

    // Get student study level
    const [student] = await pool.query(
      'SELECT study_level FROM students s JOIN clearance_requests cr ON s.student_id = cr.student_id WHERE cr.request_id = ?',
      [request_id]
    );
    if (student.length === 0) {
      return res.status(400).json({ error: 'Student not found for this request' });
    }
    const study_level = student[0].study_level;

    // Get the current step for this role (only step column, no study_level constraint)
    const [currentStep] = await pool.query(
      'SELECT step FROM clearance_flow WHERE general_role = ? ORDER BY step LIMIT 1',
      [role]
    );
    if (currentStep.length === 0) {
      return res.status(403).json({ error: `Role ${role} is not part of the clearance flow` });
    }
    const currentStepNumber = currentStep[0].step;

    // Check if previous steps are complete (only if current step > 1)
    if (currentStepNumber > 1) {
      // Get all general roles from previous step
      const [previousStepRoles] = await pool.query(
        'SELECT DISTINCT general_role FROM clearance_flow WHERE step = ?',
        [currentStepNumber - 1]
      );

      // For PhD students, exclude 'dormitory' from required approvals
      let rolesToCheck = previousStepRoles;
      if (study_level === 'phd') {
        rolesToCheck = previousStepRoles.filter(roleObj => roleObj.general_role !== 'dormitory');
      }

      // Check if all required general roles from previous step are approved
      for (const roleObj of rolesToCheck) {
        const [roleApprovals] = await pool.query(
          'SELECT COUNT(*) as approved_count FROM clearance_approval ca ' +
          'JOIN roles r ON ca.user_id = r.user_id ' +
          'WHERE ca.request_id = ? AND ca.status = "approved" AND r.general_role = ?',
          [request_id, roleObj.general_role]
        );

        if (roleApprovals[0].approved_count === 0) {
          return res.status(403).json({
            error: `Previous step ${currentStepNumber - 1} not complete: ${roleObj.general_role} approval pending`
          });
        }
      }
    }

    // Update approval
    await pool.query(
      'UPDATE clearance_approval SET status = ?, comments = ?, approved_at = NOW(), updated_at = NOW() WHERE approval_id = ?',
      [status, status === 'approved' ? (comments || null) : comments, approval[0].approval_id]
    );

    // Create pending approvals for next step if approved and current step is complete
    if (status === 'approved') {
      await pool.query('START TRANSACTION');
      try {
        // Get all general roles from current step
        const [currentStepRoles] = await pool.query(
          'SELECT DISTINCT general_role FROM clearance_flow WHERE step = ?',
          [currentStepNumber]
        );

        // For PhD students, exclude 'dormitory' when checking if current step is complete
        let rolesToCheckForCompletion = currentStepRoles;
        if (study_level === 'phd') {
          rolesToCheckForCompletion = currentStepRoles.filter(roleObj => roleObj.general_role !== 'dormitory');
        }

        let isCurrentStepComplete = true;

        // Check if all required roles (excluding dormitory for PhD) are approved
        for (const roleObj of rolesToCheckForCompletion) {
          const [roleApprovals] = await pool.query(
            'SELECT COUNT(*) as approved_count FROM clearance_approval ca ' +
            'JOIN roles r ON ca.user_id = r.user_id ' +
            'WHERE ca.request_id = ? AND ca.status = "approved" AND r.general_role = ?',
            [request_id, roleObj.general_role]
          );

          if (roleApprovals[0].approved_count === 0) {
            isCurrentStepComplete = false;
            break;
          }
        }

        // If current step is complete, create approvals for next step
        if (isCurrentStepComplete) {
          // Get all roles for the next step
          const [nextStepRoles] = await pool.query(
            'SELECT general_role FROM clearance_flow WHERE step = ?',
            [currentStepNumber + 1]
          );

          // For PhD students, skip creating dormitory approval
          const rolesToProcess = study_level === 'phd'
            ? nextStepRoles.filter(roleObj => roleObj.general_role !== 'dormitory')
            : nextStepRoles;

          for (const nextRole of rolesToProcess) {
            // Find a user for the role (considering specific_role for department_head, dormitory)
            let userQuery = 'SELECT user_id FROM roles WHERE general_role = ? AND specific_role IS NULL LIMIT 1';
            let userParams = [nextRole.general_role];

            if (nextRole.general_role === 'department_head') {
              userQuery = `
                SELECT r.user_id 
                FROM roles r
                JOIN students s ON s.department_id = (
                  SELECT department_id 
                  FROM clearance_requests cr 
                  JOIN students s2 ON cr.student_id = s2.student_id 
                  WHERE cr.request_id = ?
                )
                WHERE r.general_role = 'department_head' AND r.specific_role = s.department_id
                LIMIT 1
              `;
              userParams = [request_id];
            } else if (nextRole.general_role === 'dormitory') {
              userQuery = `
                SELECT r.user_id 
                FROM roles r
                JOIN students s ON s.block_id = (
                  SELECT block_id 
                  FROM clearance_requests cr 
                  JOIN students s2 ON cr.student_id = s2.student_id 
                  WHERE cr.request_id = ?
                )
                WHERE r.general_role = 'dormitory' AND r.specific_role = (
                  SELECT block_no FROM blocks b WHERE b.block_id = s.block_id
                )
                LIMIT 1
              `;
              userParams = [request_id];
            }

            const [nextUser] = await pool.query(userQuery, userParams);
            if (nextUser.length === 0) {
              throw new Error(`No staff found for role ${nextRole.general_role}`);
            }

            // Check if approval already exists for the next role
            const [existingNextApproval] = await pool.query(
              'SELECT approval_id FROM clearance_approval WHERE request_id = ? AND user_id = ?',
              [request_id, nextUser[0].user_id]
            );

            // Only create if it doesn't exist
            if (existingNextApproval.length === 0) {
              await pool.query(
                'INSERT INTO clearance_approval (request_id, user_id, status) VALUES (?, ?, "pending")',
                [request_id, nextUser[0].user_id]
              );
            }
          }
        }

        await pool.query('COMMIT');
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
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

    // Base query: Fetch pending, approved, or rejected requests for the user
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
        AND ca.status IN ('pending', 'approved', 'rejected')
    `;
    let params = [user_id];

    // Role-specific filters
    if (role === 'department_head') {
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

    // Filter requests based on clearance flow
    const filteredRows = [];
    for (const row of rows) {
      // Get current step for the user's role
      const [currentStep] = await pool.query(
        'SELECT step FROM clearance_flow WHERE general_role = ? LIMIT 1',
        [role]
      );

      if (currentStep.length === 0) {
        continue; // Skip if the role is not in the clearance flow
      }

      const currentStepNumber = currentStep[0].step;

      // If current step is 1, no need to check previous steps
      if (currentStepNumber === 1) {
        filteredRows.push(row);
        continue;
      }

      // For steps > 1, check if all previous steps are complete
      // Get all general roles from previous steps
      const [previousStepRoles] = await pool.query(
        'SELECT DISTINCT general_role FROM clearance_flow WHERE step < ?',
        [currentStepNumber]
      );

      // For PhD students, exclude 'dormitory' from required approvals
      let rolesToCheck = previousStepRoles;
      if (row.study_level === 'phd') {
        rolesToCheck = previousStepRoles.filter(roleObj => roleObj.general_role !== 'dormitory');
      }

      let allPreviousStepsComplete = true;

      // Check if all required roles from previous steps have approvals
      for (const roleObj of rolesToCheck) {
        const [roleApprovals] = await pool.query(
          'SELECT COUNT(*) as approved_count FROM clearance_approval ca ' +
          'JOIN roles r ON ca.user_id = r.user_id ' +
          'WHERE ca.request_id = ? AND ca.status = "approved" AND r.general_role = ?',
          [row.request_id, roleObj.general_role]
        );

        if (roleApprovals[0].approved_count === 0) {
          allPreviousStepsComplete = false;
          break;
        }
      }

      if (allPreviousStepsComplete) {
        filteredRows.push(row);
      }
    }

    res.status(200).json(filteredRows);
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