require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Aadi#*789123',
  database: process.env.DB_NAME || 'CPMS',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(conn => { console.log('✅ MySQL Connected'); conn.release(); })
  .catch(err => console.error('❌ MySQL Connection Error:', err));

// --- AUTH ---
app.post('/api/login', async (req, res) => {
  const { usn, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT role, usn, is_first_login FROM users WHERE usn = ? AND password = ?', [usn, password]);
    if (rows.length > 0) {
      res.json({ success: true, user: rows[0] });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/profile/password', async (req, res) => {
  const { usn, old_password, new_password } = req.body;
  try {
    const [rows] = await pool.query('SELECT password FROM users WHERE usn = ? AND password = ?', [usn, old_password]);
    if (rows.length === 0) return res.status(400).json({ success: false, message: 'Incorrect old password' });

    await pool.query('UPDATE users SET password = ?, is_first_login = FALSE WHERE usn = ?', [new_password, usn]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});



// --- STUDENT PROFILE ---
app.get('/api/profile/:usn', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM student_profiles WHERE usn = ?', [req.params.usn]);
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/profile', async (req, res) => {
  let { usn, full_name, age, semester, email, phone, address, branch, skills, career_objective, linkedin_url, github_url, projects, experience } = req.body;
  age = age ? parseInt(age) : null;
  semester = semester ? parseInt(semester) : null;
  try {
    if (email && !email.includes('.edu')) return res.status(400).json({ error: 'Email must be a valid .edu address' });

    const [existing] = await pool.query('SELECT usn FROM student_profiles WHERE usn = ?', [usn]);
    if (existing.length > 0) {
      await pool.query(`
        UPDATE student_profiles SET 
        full_name=COALESCE(?, full_name), age=COALESCE(?, age), semester=COALESCE(?, semester), 
        email=COALESCE(?, email), phone=COALESCE(?, phone), address=?, branch=COALESCE(?, branch), 
        skills=?, career_objective=?, linkedin_url=?, github_url=?, projects=?, experience=?
        WHERE usn=?`,
        [full_name, age, semester, email, phone, address, branch, skills, career_objective, linkedin_url, github_url, projects, experience, usn]
      );
    } else {
      await pool.query(`
        INSERT INTO student_profiles 
        (usn, full_name, age, semester, email, phone, address, branch, skills, career_objective, linkedin_url, github_url, projects, experience) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [usn, full_name, age, semester, email, phone, address, branch, skills, career_objective, linkedin_url, github_url, projects, experience]
      );
    }
    res.json({ message: 'Profile saved' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- STUDENT COMPANIES & APPLICATIONS ---
app.get('/api/companies', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM companies');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/applications', async (req, res) => {
  const { usn, company_id, resume_link, cover_letter } = req.body;
  try {
    const [existing] = await pool.query('SELECT * FROM applications WHERE usn = ? AND company_id = ?', [usn, company_id]);
    if (existing.length > 0) return res.status(400).json({ error: 'Already applied' });
    await pool.query('INSERT INTO applications (usn, company_id, resume_link, cover_letter) VALUES (?, ?, ?, ?)', [usn, company_id, resume_link, cover_letter]);
    res.json({ message: 'Applied successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/applications/:usn', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.application_id, a.status, c.company_name, c.job_role 
      FROM applications a 
      JOIN companies c ON a.company_id = c.company_id 
      WHERE a.usn = ?`, [req.params.usn]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/applications/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM applications WHERE application_id = ?', [req.params.id]);
    res.json({ message: 'Application withdrawn' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- ADMIN ROUTES ---
app.post('/api/admin/students', async (req, res) => {
  const { usn, full_name, cgpa, email, phone, age, semester } = req.body;
  try {
    if (parseFloat(cgpa) > 10.0) return res.status(400).json({ error: 'Max CGPA is 10.0' });

    const [existing] = await pool.query('SELECT usn FROM users WHERE usn = ?', [usn]);
    if (existing.length > 0) return res.status(400).json({ error: 'USN already registered' });

    // Create User (default pass is USN) and Profile
    await pool.query('INSERT INTO users (usn, password, role, is_first_login) VALUES (?, ?, ?, ?)', [usn, usn, 'student', true]);
    await pool.query('INSERT INTO student_profiles (usn, full_name, cgpa, email, phone, age, semester) VALUES (?, ?, ?, ?, ?, ?, ?)', [usn, full_name, cgpa, email, phone, age, semester]);

    res.json({ message: 'Student registered successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/students/:usn/cgpa', async (req, res) => {
  const { cgpa } = req.body;
  try {
    if (parseFloat(cgpa) > 10.0) return res.status(400).json({ error: 'Max CGPA is 10.0' });
    await pool.query('UPDATE student_profiles SET cgpa = ? WHERE usn = ?', [cgpa, req.params.usn]);
    res.json({ message: 'CGPA updated successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/import-students', async (req, res) => {
  const students = req.body;
  if (!Array.isArray(students)) return res.status(400).json({ error: 'Expected array of students' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const s of students) {
      if (!s.USN) continue;
      // Insert User if not exists
      const [u] = await conn.query('SELECT usn FROM users WHERE usn=?', [s.USN]);
      if (u.length === 0) {
        await conn.query('INSERT INTO users (usn, password, role, is_first_login) VALUES (?, ?, ?, ?)', [s.USN, s.USN, 'student', true]);
      }

      // Insert or Update Profile
      const [p] = await conn.query('SELECT usn FROM student_profiles WHERE usn=?', [s.USN]);
      const age = parseInt(s.Age) || null;
      const sem = parseInt(s.Semester) || null;
      const cgpa = parseFloat(s.CGPA) || null;

      if (p.length === 0) {
        await conn.query('INSERT INTO student_profiles (usn, full_name, age, semester, email, branch, cgpa) VALUES (?, ?, ?, ?, ?, ?, ?)', [s.USN, s.Name, age, sem, s.Email, s.Branch, cgpa]);
      } else {
        await conn.query('UPDATE student_profiles SET full_name=COALESCE(?, full_name), age=COALESCE(?, age), semester=COALESCE(?, semester), email=COALESCE(?, email), branch=COALESCE(?, branch), cgpa=COALESCE(?, cgpa) WHERE usn=?', [s.Name, age, sem, s.Email, s.Branch, cgpa, s.USN]);
      }
    }
    await conn.commit();
    res.json({ message: 'Import successful' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.post('/api/admin/import-companies', async (req, res) => {
  const companies = req.body;
  if (!Array.isArray(companies)) return res.status(400).json({ error: 'Expected array' });

  try {
    for (const c of companies) {
      if (!c.Company || !c.Role) continue;
      const cgpa = parseFloat(c.MinCGPA) || 0;
      await pool.query('INSERT INTO companies (company_name, job_role, job_description, min_cgpa, package_ctc) VALUES (?, ?, ?, ?, ?)',
        [c.Company, c.Role, c.Description || '', cgpa, c.CTC || 'TBD']);
    }
    res.json({ message: 'Company Import successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/backup', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM users');
    const [profiles] = await pool.query('SELECT * FROM student_profiles');
    const [companies] = await pool.query('SELECT * FROM companies');
    const [applications] = await pool.query('SELECT * FROM applications');

    const backupData = {
      timestamp: new Date().toISOString(),
      users,
      student_profiles: profiles,
      companies,
      applications
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=placement_backup.json');
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/students', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM student_profiles');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/students/:usn', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE usn = ?', [req.params.usn]);
    res.json({ message: 'Student deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/companies', async (req, res) => {
  const { company_name, job_role, job_description, min_cgpa, package_ctc } = req.body;
  try {
    await pool.query(
      'INSERT INTO companies (company_name, job_role, job_description, min_cgpa, package_ctc) VALUES (?, ?, ?, ?, ?)',
      [company_name, job_role, job_description, min_cgpa, package_ctc]
    );
    res.json({ message: 'Company added' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/companies/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM companies WHERE company_id = ?', [req.params.id]);
    res.json({ message: 'Company deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/applications', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.application_id, a.status, a.resume_link, a.cover_letter, c.company_name, c.job_role, p.full_name, p.usn
      FROM applications a
      JOIN companies c ON a.company_id = c.company_id
      JOIN student_profiles p ON a.usn = p.usn
    `);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/applications/:id', async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE applications SET status = ? WHERE application_id = ?', [status, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(PORT, () => { console.log(`🚀 Server running on http://localhost:${PORT}`); });
