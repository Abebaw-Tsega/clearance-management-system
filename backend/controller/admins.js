const pool = require("../config/db"); // Import pool directly
const { parse } = require("csv-parse");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");

// Helper function to validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to hash password
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Debugging function to verify pool
const verifyPool = async () => {
  try {
    const [result] = await pool.query('SELECT 1 AS test');
    console.log('Pool test query successful:', result);
  } catch (error) {
    console.error('Pool test query failed:', error.message, error.stack);
    throw error;
  }
};

// Get all clearance types
const getClearanceTypes = async (req, res) => {
  try {
    console.log('Fetching clearance types...');
    await verifyPool();
    const [types] = await pool.query('SELECT clearance_type_id, type_name FROM clearance_types');
    res.json(types);
  } catch (error) {
    console.error('Get clearance types error:', error.message, error.stack);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get recent clearance requests for overview
const getRecentRequests = async (req, res) => {
  try {
    console.log('Fetching recent requests...');
    await verifyPool();
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
    console.error('Get recent requests error:', error.message, error.stack);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update system control (reason, end date/time, activation)
const updateSystemControl = async (req, res) => {
  const { reason, startDate, startTime, endDate, endTime, is_active } = req.body;
  try {
    console.log('Updating system control:', { reason, startDate, startTime, endDate, endTime, is_active });
    await verifyPool();
    if (!reason || !startDate || !startTime || !endDate || !endTime) {
      return res.status(400).json({ error: 'Missing required fields: reason, startDate, startTime, endDate, endTime' });
    }
    const [types] = await pool.query('SELECT clearance_type_id FROM clearance_types WHERE type_name = ?', [reason]);
    if (!types.length) {
      console.error('No clearance_type_id found for reason:', reason);
      return res.status(400).json({ error: 'Invalid clearance type: ' + reason });
    }
    const clearance_type_id = types[0].clearance_type_id;
    const startDateTime = `${startDate} ${startTime}`;
    const endDateTime = `${endDate} ${endTime}`;
    const createdBy = req.user?.user_id || 1;

    const [existing] = await pool.query(
      'SELECT 1 FROM clearance_schedules WHERE clearance_type_id = ?',
      [clearance_type_id]
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
    console.error('Update system control error:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

const getAllClearanceData = async (req, res) => {
  try {
    console.log('Fetching all clearance data...');
    await verifyPool();
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
    console.error('Get clearance data error:', error.message, error.stack);
    res.status(500).json({ error: 'Server error' });
  }
};

const toggleClearanceSystem = async (req, res) => {
  const { clearance_type_id, is_active } = req.body;
  try {
    console.log('Toggling clearance system:', { clearance_type_id, is_active });
    await verifyPool();
    await pool.query(
      'UPDATE clearance_schedules SET is_active = ? WHERE clearance_type_id = ?',
      [is_active, clearance_type_id]
    );
    res.json({ message: `Clearance system ${is_active ? 'enabled' : 'disabled'}` });
  } catch (error) {
    console.error('Toggle clearance system error:', error.message, error.stack);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current clearance system/schedule
const getClearanceSystem = async (req, res) => {
  try {
    console.log('Fetching clearance system...');
    await verifyPool();
    const [rows] = await pool.query(`
      SELECT cs.is_active, ct.clearance_type_id, ct.type_name AS reason,
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
    res.json(rows[0]);
  } catch (error) {
    console.error('Get clearance system error:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

const assignRole = async (req, res) => {
  const { email, general_role, specific_role, password } = req.body;
  try {
    // Check if user exists, or create a new one
    let [user] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    let user_id;

    if (!user) {
      if (!password) {
        return res.status(400).json({ error: 'Password required for new user' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        'INSERT INTO users (email, password, first_name, last_name, is_active) VALUES (?, ?, ?, ?, ?)',
        [email, hashedPassword, email.split('@')[0], 'Admin', true]
      );
      user_id = result.insertId;
    } else {
      user_id = user.user_id;
    }

    // Remove existing 'admin' role from other users if assigning new admin
    if (general_role === 'admin') {
      await pool.query(
        'UPDATE users u JOIN roles r ON u.user_id = r.user_id SET u.is_active = FALSE WHERE r.general_role = ?',
        ['admin']
      );
    }

    // Assign or update role
    await pool.query(
      'INSERT INTO roles (user_id, general_role, specific_role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE general_role = ?, specific_role = ?',
      [user_id, general_role, specific_role || null, general_role, specific_role || null]
    );

    // Update user active status
    await pool.query('UPDATE users SET is_active = TRUE WHERE user_id = ?', [user_id]);

    const [newAdmin] = await pool.query(
      'SELECT u.user_id, u.first_name, u.last_name, u.email,  r.general_role, u.is_active FROM users u JOIN roles r ON u.user_id = r.user_id WHERE u.user_id = ?',
      [user_id]
    );
    res.json({ message: 'Role assigned successfully', user: newAdmin });
  } catch (err) {
    console.error('Error assigning role:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllStudents = async (req, res) => {
  try {
    console.log('Fetching all students...');
    await verifyPool();
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
    console.error('Get all students error:', error.message, error.stack);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAdminProfile = async (req, res) => {
  try {
    console.log('Fetching admin profile for user_id:', req.user?.user_id);
    if (!req.user?.user_id) {
      return res.status(401).json({ error: 'Unauthorized: No user found' });
    }
    await verifyPool();
    const user_id = req.user.user_id;
    const [admin] = await pool.query(`
      SELECT u.first_name, u.last_name, u.email, r.general_role
      FROM users u
      JOIN roles r ON u.user_id = r.user_id
      WHERE u.user_id = ? AND r.general_role IN ('admin', 'superadmin')
      LIMIT 1
    `, [user_id]);
    if (admin.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json(admin[0]);
  } catch (error) {
    console.error('Get admin profile error:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

// CSV Import function
const importStudents = async (req, res) => {
  let filePath;
  try {
    console.log('Starting student import for user_id:', req.user?.user_id);
    if (!req.user?.user_id) {
      return res.status(401).json({ error: 'Unauthorized: No user found' });
    }
    await verifyPool();
    const userId = req.user.user_id;
    const [roleCheck] = await pool.query(
      "SELECT general_role FROM roles WHERE user_id = ? AND general_role IN ('admin', 'superadmin')",
      [userId]
    );
    if (roleCheck.length === 0) {
      return res.status(403).json({ error: "Only admin or superadmin can import students" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No CSV file uploaded" });
    }

    filePath = path.join(__dirname, "../uploads", req.file.filename);
    console.log('Processing CSV file:', filePath);
    const results = [];
    let errors = [];
    let successCount = 0;

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
        .on("data", (row) => {
          results.push(row);
        })
        .on("end", () => {
          console.log('CSV parsing completed, rows:', results.length);
          resolve();
        })
        .on("error", (err) => {
          console.error('CSV parsing error:', err.message, err.stack);
          reject(err);
        });
    });

    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');
      console.log('Transaction started');

      for (const row of results) {
        try {
          // Validate required fields
          if (
            !row.first_name ||
            !row.last_name ||
            !row.email ||
            !row.id_no ||
            !row.department_name ||
            !row.study_level ||
            !["undergraduate", "masters", "phd"].includes(row.study_level.toLowerCase())
          ) {
            errors.push(`Invalid data for ${row.email || "unknown"}: Missing or invalid fields`);
            continue;
          }

          // Validate email
          if (!isValidEmail(row.email)) {
            errors.push(`Invalid email format for ${row.email}`);
            continue;
          }

          // Validate year_of_study
          const yearOfStudy = parseInt(row.year_of_study);
          if (isNaN(yearOfStudy) || yearOfStudy < 1 || yearOfStudy > 5) {
            errors.push(`Invalid year_of_study for ${row.email}: Must be between 1 and 5`);
            continue;
          }

          // Insert or get department
          let [department] = await connection.query(
            "SELECT department_id FROM departments WHERE department_name = ?",
            [row.department_name]
          );
          if (department.length === 0) {
            const [result] = await connection.query(
              "INSERT INTO departments (department_name) VALUES (?)",
              [row.department_name]
            );
            department = [{ department_id: result.insertId }];
            console.log(`Inserted department: ${row.department_name}, ID: ${result.insertId}`);
          }

          // Insert or get block (if provided)
          let blockId = null;
          if (row.block_no && row.study_level.toLowerCase() !== "phd") {
            let [block] = await connection.query(
              "SELECT block_id FROM blocks WHERE block_no = ?",
              [row.block_no]
            );
            if (block.length === 0) {
              const [result] = await connection.query(
                "INSERT INTO blocks (block_no) VALUES (?)",
                [row.block_no]
              );
              block = [{ block_id: result.insertId }];
              console.log(`Inserted block: ${row.block_no}, ID: ${result.insertId}`);
            }
            blockId = block[0].block_id;
          }

          // Check if email or id_no already exists
          const [existingUser] = await connection.query(
            "SELECT user_id FROM users WHERE email = ?",
            [row.email]
          );
          const [existingStudent] = await connection.query(
            "SELECT student_id FROM students WHERE id_no = ?",
            [row.id_no]
          );
          if (existingUser.length > 0 || existingStudent.length > 0) {
            errors.push(`Duplicate email or ID number for ${row.email}`);
            continue;
          }

          // Insert user
          const password = row.password || "defaultPassword123";
          const passwordHash = await hashPassword(password);
          const [userResult] = await connection.query(
            "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)",
            [row.first_name, row.last_name, row.email, passwordHash]
          );
          console.log(`Inserted user: ${row.email}, ID: ${userResult.insertId}`);

          // Insert student role
          await connection.query(
            "INSERT INTO roles (user_id, general_role) VALUES (?, 'student')",
            [userResult.insertId]
          );

          // Insert student
          await connection.query(
            "INSERT INTO students (user_id, id_no, room_no, year_of_study, block_id, department_id, study_level) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              userResult.insertId,
              row.id_no,
              row.room_no || null,
              yearOfStudy,
              blockId,
              department[0].department_id,
              row.study_level.toLowerCase(),
            ]
          );
          console.log(`Inserted student: ${row.id_no}`);

          successCount++;
        } catch (err) {
          console.error(`Error processing row for ${row.email || "unknown"}:`, err.message, err.stack);
          errors.push(`Error processing ${row.email || "unknown"}: ${err.message}`);
        }
      }

      await connection.query('COMMIT');
      console.log('Transaction committed');
      fs.unlinkSync(filePath);
      res.status(200).json({
        message: `Imported ${successCount} students successfully`,
        errors: errors.length > 0 ? errors : null,
      });
    } catch (err) {
      console.error('Transaction error:', err.message, err.stack);
      await connection.query('ROLLBACK');
      fs.unlinkSync(filePath);
      res.status(500).json({ error: `Failed to import students: ${err.message}` });
    } finally {
      connection.release();
      console.log('Connection released');
    }
  } catch (err) {
    console.error('Import students error:', err.message, err.stack);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
};

const getRegistrarProfile = async (req, res) => {
  try {
    const [admin] = await pool.query(
      `
      SELECT u.user_id, u.first_name, u.last_name, u.email,  r.general_role, u.is_active
      FROM users u
      JOIN roles r ON u.user_id = r.user_id
      WHERE r.general_role = 'admin' AND u.is_active = TRUE
      LIMIT 1
    `,
      []
    );
    if (!admin) {
      return res.status(404).json({ error: 'No active registrar admin found' });
    }
    res.json(admin);
  } catch (err) {
    console.error('Error fetching registrar admin:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
const toggleAdminStatus = async (req, res) => {
  const { user_id } = req.params;
  const { is_active } = req.body;
  try {
    await pool.query('UPDATE users SET is_active = ? WHERE user_id = ?', [is_active, user_id]);
    res.json({ message: 'Admin status updated successfully' });
  } catch (err) {
    console.error('Error toggling admin status:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


module.exports = {
  getAllClearanceData,
  toggleClearanceSystem,
  assignRole,
  getAdminProfile,
  getClearanceSystem,
  getAllStudents,
  getClearanceTypes,
  getRecentRequests,
  updateSystemControl,
  importStudents,
  getRegistrarProfile,
  toggleAdminStatus,
};