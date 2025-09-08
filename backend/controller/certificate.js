const PDFDocument = require('pdfkit');
const pool = require('../config/db');
const path = require('path');
const fs = require('fs'); // Synchronous fs module
const fsPromises = require('fs').promises; // Async fs.promises for file writing

async function generateCertificate(req, res) {
   const { requestId } = req.params;
   const userId = req.user?.user_id;

   // Retry logic for database queries
   const retryQuery = async (query, params, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
         try {
            return await pool.query(query, params);
         } catch (err) {
            if (err.code === 'ECONNRESET' && i < retries - 1) {
               console.warn(`Retrying query (${i + 1}/${retries}) due to ${err.code}`);
               await new Promise(resolve => setTimeout(resolve, delay));
               continue;
            }
            throw err;
         }
      }
   };

   try {
      // Verify student ownership
      const [students] = await retryQuery(
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
      const [requests] = await retryQuery(
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
      const [approvals] = await retryQuery(
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
      const [existingCertificates] = await retryQuery(
         'SELECT certificate_id, pdf, file_path, created_at FROM certificates WHERE request_id = ? AND student_id = ?',
         [requestId, student.student_id]
      );
      if (existingCertificates.length > 0) {
         console.log(`Certificate already exists for request_id: ${requestId}`);
         res.setHeader('Content-Type', 'application/pdf');
         res.setHeader('Content-Disposition', `attachment; filename="AASTU_Clearance_Certificate_${request.id_no || 'unknown'}_${requestId}.pdf"`);
         // Use file_path if available, otherwise use pdf
         if (existingCertificates[0].file_path) {
            const pdfData = await fsPromises.readFile(existingCertificates[0].file_path);
            return res.send(pdfData);
         }
         return res.send(existingCertificates[0].pdf);
      }

      // Generate PDF
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="AASTU_Clearance_Certificate_${request.id_no || 'unknown'}_${requestId}.pdf"`);
      doc.pipe(res);

      // Add AASTU branding with styled logo
      const logoPath = path.join(__dirname, '../public', 'logo.jpg');
      if (fs.existsSync(logoPath)) {
         const pageWidth = doc.page.width; // A4 width in points (595)
         const logoWidth = 100;
         const logoHeight = 90;
         const xPosition = (pageWidth - logoWidth) / 2; // Center horizontally
         doc.image(logoPath, xPosition, 30, { width: logoWidth, height: logoHeight });
         doc.y = 30 + logoHeight + 10; // Move cursor below logo with 10-point gap (preferred)
      } else {
         console.error('Logo file not found at:', logoPath);
         doc.font('Helvetica').fontSize(12).fillColor('red').text('Logo not found', 50, 30);
         doc.y = 30 + 10; // Move cursor down if no logo
      }

      // University name and title
      doc.font('Helvetica-Bold').fontSize(24).fillColor('#003087').text(
         'Addis Ababa Science and Technology University',
         { align: 'center' }
      );
      doc.fontSize(20).text('Clearance Certificate', { align: 'center', underline: true });
      doc.moveDown(2);

      // Student and clearance details
      const pdfContent = {
         name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
         id_no: request.id_no || 'N/A',
         department: student.department_name || 'N/A',
         clearance_type: request.type_name || 'N/A'
      };
      console.log('PDF content:', pdfContent);
      doc.font('Helvetica').fontSize(14).fillColor('black');
      doc.text(`Student Name: ${pdfContent.name}`, { align: 'left' });
      doc.text(`ID Number: ${pdfContent.id_no}`, { align: 'left' });
      doc.text(`Department: ${pdfContent.department}`, { align: 'left' });
      doc.text(`Clearance Type: ${pdfContent.clearance_type}`, { align: 'left' });
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
            console.log(`PDF buffer size: ${pdfBuffer.length} bytes`);
            const maxAllowedPacket = 2 * 1024 * 1024; // 2MB to trigger fallback for 2.3MB buffer
            if (pdfBuffer.length > maxAllowedPacket) {
               console.warn(`PDF size (${pdfBuffer.length} bytes) exceeds max_allowed_packet (${maxAllowedPacket} bytes)`);
               // Fallback: Save to filesystem
               const filePath = path.join(__dirname, '../certificates', `certificate_${requestId}_${student.student_id}.pdf`);
               await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
               await fsPromises.writeFile(filePath, pdfBuffer);
               console.log(`Certificate written to filesystem at ${filePath}`);
               // Verify file exists
               const fileExists = await fsPromises.access(filePath).then(() => true).catch(() => false);
               if (!fileExists) {
                  throw new Error(`Failed to verify certificate file at ${filePath}`);
               }
               await retryQuery(
                  'INSERT INTO certificates (request_id, student_id, file_path, created_at) VALUES (?, ?, ?, NOW())',
                  [requestId, student.student_id, filePath]
               );
               console.log(`Certificate saved to database with file_path for request_id: ${requestId}, student_id: ${student.student_id}`);
            } else {
               await retryQuery(
                  'INSERT INTO certificates (request_id, student_id, pdf, created_at) VALUES (?, ?, ?, NOW())',
                  [requestId, student.student_id, pdfBuffer]
               );
               console.log(`Certificate saved to database for request_id: ${requestId}, student_id: ${student.student_id}`);
            }
         } catch (err) {
            console.error('Failed to save certificate to database:', err.message, err.stack);
         }
      });

      // Finalize the PDF
      doc.end();
   } catch (err) {
      console.error('Generate certificate error:', err.message, err.stack, { requestId, userId });
      if (!res.headersSent) {
         res.status(500).json({ error: 'Failed to generate certificate' });
      }
   }
}

module.exports = { generateCertificate };