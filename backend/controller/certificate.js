const PDFDocument = require('pdfkit');
const pool = require('../config/db');
const getStream = require('get-stream'); // npm install get-stream

async function generateCertificate(req, res) {
   const { requestId } = req.params;
   const userId = req.user?.user_id; // assuming JWT middleware sets req.user

   try {
      // Query clearance request and approvals
      const [requests] = await pool.query('SELECT * FROM clearance_requests WHERE request_id = ?', [requestId]);
      if (!requests.length) return res.status(404).json({ error: 'Request not found' });
      const request = requests[0];

      console.log('Certificate requests:', requests);

      // Check if all departments and registrar are approved
      const departments = [
         { name: 'Department Head', key: 'department_head_status' },
         { name: 'Librarian', key: 'librarian_status' },
         { name: 'Cafeteria', key: 'cafeteria_status' },
         { name: 'Dormitory', key: 'dormitory_status' },
         { name: 'Sport', key: 'sport_status' },
         { name: 'Student Affair', key: 'student_affair_status' },
         { name: 'Registrar', key: 'registrar_status' }
      ];
      const allApproved = departments.every(dep => (request[dep.key] || '').toLowerCase().trim() === 'approved');
      if (!allApproved) return res.status(403).json({ error: 'Not all departments approved' });

      // Query student info
      const [students] = await pool.query('SELECT * FROM students WHERE student_id = ?', [request.student_id]);
      const student = students[0] || {};

      // Generate PDF
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);

      doc.fontSize(20).text('AASTU Clearance Certificate', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Student Name: ${student.first_name || ''} ${student.last_name || ''}`);
      doc.text(`Student ID: ${student.student_id}`);
      doc.text(`Department: ${student.department}`);
      doc.text(`Clearance Type: ${request.clearance_type}`);
      doc.moveDown();
      doc.text('Departments Approved:', { underline: true });
      departments.forEach(dep => {
         doc.text(`- ${dep.name}`);
      });
      doc.moveDown();
      doc.text(`Date: ${new Date().toLocaleDateString()}`);

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
         const pdfBuffer = Buffer.concat(buffers);
         await pool.query(
            'INSERT INTO certificates (request_id, student_id, pdf) VALUES (?, ?, ?)',
            [requestId, student.student_id, pdfBuffer]
         );
         res.end(pdfBuffer);
      });
      doc.end();
   } catch (err) {
      res.status(500).json({ error: 'Failed to generate certificate' });
   }
}

module.exports = { generateCertificate };
