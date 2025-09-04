const PDFDocument = require('pdfkit');
const pool = require('../config/db');

async function generateCertificate(req, res) {
   const { requestId } = req.params;
   const userId = req.user?.user_id;

   try {
      // Verify student ownership
      const [students] = await pool.query(
         'SELECT s.student_id, u.first_name, u.last_name, s.department_id, s.study_level, d.department_name ' +
         'FROM students s ' +
         'LEFT JOIN departments d ON s.department_id = d.department_id ' +
         'LEFT JOIN users u ON s.user_id = u.user_id ' +
         'WHERE s.user_id = ?',
         [userId]
      );
      if (!students.length) {
         console.log(`No student found for user_id: ${userId}`);
         return res.status(403).json({ error: 'User is not a student' });
      }
      const student = students[0];
      console.log('Student data:', { student_id: student.student_id, id_no: student.id_no });

      // Query clearance request
      const [requests] = await pool.query(
         'SELECT cr.request_id, s.id_no, cr.clearance_type_id, ct.type_name ' +
         'FROM clearance_requests cr ' +
         'JOIN clearance_types ct ON cr.clearance_type_id = ct.clearance_type_id ' +
         'JOIN students s ON cr.student_id = s.student_id ' +
         'WHERE cr.request_id = ? AND cr.student_id = ?',
         [requestId, student.student_id]
      );
      if (!requests.length) {
         console.log(`Request not found: ${requestId} for student_id: ${student.student_id}`);
         return res.status(404).json({ error: 'Request not found or not authorized' });
      }
      const request = requests[0];
      console.log('Request data:', { requestId, id_no: request.id_no, student_id: student.student_id });

      // Check approvals
      const [approvals] = await pool.query(
         'SELECT r.general_role, ca.status ' +
         'FROM clearance_approval ca JOIN roles r ON ca.user_id = r.user_id ' +
         'WHERE ca.request_id = ?',
         [requestId]
      );
      console.log('Approvals:', approvals);

      const requiredRoles = [
         'department_head',
         'librarian',
         'cafeteria',
         ...(student.study_level === 'phd' ? [] : ['dormitory']),
         'sport',
         'student_affair',
         'registrar'
      ];
      const approvalStatus = approvals.reduce((acc, { general_role, status }) => {
         acc[general_role] = status;
         return acc;
      }, {});

      const allApproved = requiredRoles.every(role => approvalStatus[role] === 'approved');
      if (!allApproved) {
         console.log('Not all departments approved:', approvalStatus);
         return res.status(403).json({ error: 'Not all required departments have approved the request' });
      }

      // Check if certificate already exists
      const [existingCertificates] = await pool.query(
         'SELECT certificate_id, pdf, created_at FROM certificates WHERE request_id = ? AND student_id = ?',
         [requestId, student.student_id]
      );
      if (existingCertificates.length > 0) {
         console.log(`Certificate already exists for request_id: ${requestId}`);
         res.setHeader('Content-Type', 'application/pdf');
         res.setHeader('Content-Disposition', `attachment; filename="AASTU_Clearance_Certificate_${request.id_no || 'unknown'}_${requestId}.pdf"`);
         return res.send(existingCertificates[0].pdf);
      }

      // Generate PDF
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="AASTU_Clearance_Certificate_${request.id_no || 'unknown'}_${requestId}.pdf"`);
      doc.pipe(res);

      // Add AASTU branding
      doc.font('Helvetica-Bold').fontSize(24).fillColor('#003087').text('Addis Ababa Science and Technology University', { align: 'center' });
      doc.fontSize(20).text('Clearance Certificate', { align: 'center', underline: true });
      doc.moveDown(2);

      // Student and clearance details
      doc.font('Helvetica').fontSize(14).fillColor('black');
      console.log('PDF content:', { name: `${student.first_name || ''} ${student.last_name || ''}`, id_no: request.id_no, department: student.department_name, clearance_type: request.type_name });
      doc.text(`Student Name: ${student.first_name || ''} ${student.last_name || ''}`, { align: 'left' });
      doc.text(`ID Number: ${request.id_no || 'N/A'}`, { align: 'left' });
      doc.text(`Department: ${student.department_name || 'N/A'}`, { align: 'left' });
      doc.text(`Clearance Type: ${request.type_name}`, { align: 'left' });
      doc.moveDown(1.5);

      // Approved departments
      doc.font('Helvetica-Bold').fontSize(16).text('Approved By:', { underline: true });
      doc.font('Helvetica').fontSize(12);
      requiredRoles.forEach(role => {
         const roleName = role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
         doc.text(`- ${roleName}`, { indent: 20 });
      });
      doc.moveDown(1.5);

      // Issue date and signature placeholder
      doc.text(`Date Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'left' });
      doc.moveDown(1);
      doc.text('Authorized Signature:', { align: 'left' });
      doc.moveTo(100, doc.y).lineTo(300, doc.y).stroke(); // Signature line

      // Save PDF to buffer
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
         try {
            const pdfBuffer = Buffer.concat(buffers);
            await pool.query(
               'INSERT INTO certificates (request_id, student_id, pdf, created_at) VALUES (?, ?, ?, NOW())',
               [requestId, student.student_id, pdfBuffer]
            );
            console.log(`Certificate saved for request_id: ${requestId}, student_id: ${student.student_id}`);
         } catch (err) {
            console.error('Failed to save certificate to database:', err.message);
         }
      });
      doc.end();
   } catch (err) {
      console.error('Generate certificate error:', err.message, { requestId, userId });
      res.status(500).json({ error: 'Failed to generate certificate' });
   }
}

module.exports = { generateCertificate };