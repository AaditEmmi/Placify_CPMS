const userRole = localStorage.getItem('role');
const userUsn = localStorage.getItem('usn');
let placementChartInstance = null;
let currentCgpa = 0; // Store student's CGPA for eligibility check

const currentPage = window.location.href;
if (!userRole || !userUsn) {
  if (!currentPage.includes('index.html') && !currentPage.includes('admin_login.html')) window.location.href = 'index.html';
} else {
  if (userRole === 'student' && (currentPage.includes('admin_dashboard') || currentPage.includes('admin_login'))) window.location.href = 'student_dashboard.html';
  else if (userRole === 'admin' && (currentPage.includes('student_dashboard') || currentPage.includes('index.html'))) window.location.href = 'admin_dashboard.html';
}

function logout() { localStorage.clear(); window.location.href = 'index.html'; }

function showModal(msg, onConfirm = null) {
  document.getElementById('modalMsg').innerText = msg;
  document.getElementById('customModal').classList.remove('d-none');
  const okBtn = document.getElementById('modalOkBtn');
  const cancelBtn = document.getElementById('modalCancelBtn');
  if (onConfirm) {
    cancelBtn.classList.remove('d-none');
    okBtn.onclick = () => { onConfirm(); document.getElementById('customModal').classList.add('d-none'); cancelBtn.classList.add('d-none'); okBtn.onclick = () => document.getElementById('customModal').classList.add('d-none'); };
  } else {
    cancelBtn.classList.add('d-none');
    okBtn.onclick = () => document.getElementById('customModal').classList.add('d-none');
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('d-none'));
  document.getElementById(`tab-${tabName}`).classList.remove('d-none');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  event.target.classList.add('active');

  if (userRole === 'student') {
    if (tabName === 'dashboard') { loadStudentProfile(); loadStudentKPIs(); }
    if (tabName === 'companies') loadStudentCompanies();
    if (tabName === 'status') loadStudentApplications();
  } else if (userRole === 'admin') {
    if (tabName === 'dashboard') loadAdminDashboard();
    if (tabName === 'students') loadAdminStudents();
    if (tabName === 'companies') loadAdminCompanies();
    if (tabName === 'applications') loadAdminApplications();
  }
}

// ================= STUDENT LOGIC =================
if (userRole === 'student' && currentPage.includes('student_dashboard')) {
  loadStudentProfile();
  loadStudentKPIs();
  if (localStorage.getItem('is_first_login') === '1') {
    document.getElementById('passwordModal').classList.remove('d-none');
    document.getElementById('passCancelBtn').classList.add('d-none');
  }
}

if (document.getElementById('passwordForm')) {
  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const old_password = document.getElementById('old_pass').value;
    const new_password = document.getElementById('new_pass').value;
    try {
      const res = await fetch('/api/profile/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usn: userUsn, old_password, new_password }) });
      const data = await res.json();
      if (data.success) {
        showModal('Password updated successfully!');
        document.getElementById('passwordModal').classList.add('d-none');
        document.getElementById('passCancelBtn').classList.remove('d-none');
        localStorage.setItem('is_first_login', '0');
      } else showModal(data.message);
    } catch (err) { showModal('Error updating password'); }
  });
}

function toggleProfileEdit() {
  document.getElementById('profileView').classList.toggle('d-none');
  document.getElementById('profileEdit').classList.toggle('d-none');
}

async function loadStudentKPIs() {
  try {
    const res = await fetch(`/api/applications/${userUsn}`);
    const apps = await res.json();
    document.getElementById('s_kpi_applied').innerText = apps.length;
    document.getElementById('s_kpi_shortlisted').innerText = apps.filter(a => a.status !== 'Applied' && a.status !== 'Rejected').length;
    document.getElementById('s_kpi_rejected').innerText = apps.filter(a => a.status === 'Rejected').length;
    document.getElementById('s_kpi_placed').innerText = apps.filter(a => a.status === 'Offered').length;
  } catch (e) { }
}

async function loadStudentProfile() {
  try {
    const res = await fetch(`/api/profile/${userUsn}`);
    const data = await res.json();
    if (data) {
      currentCgpa = parseFloat(data.cgpa) || 0;

      // View Mode
      if (document.getElementById('v_usn')) document.getElementById('v_usn').innerText = data.usn || '-';
      document.getElementById('v_fullname').innerText = data.full_name || 'Anonymous Student';
      document.getElementById('v_branch').innerText = data.branch || 'No branch specified';
      document.getElementById('v_cgpa').innerText = data.cgpa || '-';
      document.getElementById('v_age').innerText = data.age || '-';
      document.getElementById('v_sem').innerText = data.semester || '-';
      document.getElementById('v_email').innerText = data.email || '-';
      document.getElementById('v_phone').innerText = data.phone || '-';
      document.getElementById('v_skills').innerText = data.skills || '-';
      document.getElementById('v_objective').innerText = data.career_objective || '-';
      document.getElementById('v_experience').innerText = data.experience || '-';
      document.getElementById('v_projects').innerText = data.projects || '-';

      const lkBtn = document.getElementById('v_linkedin');
      const ghBtn = document.getElementById('v_github');
      if (data.linkedin_url) { lkBtn.href = data.linkedin_url; lkBtn.classList.remove('d-none'); } else lkBtn.classList.add('d-none');
      if (data.github_url) { ghBtn.href = data.github_url; ghBtn.classList.remove('d-none'); } else ghBtn.classList.add('d-none');

      // Edit Mode
      if (document.getElementById('p_fullname')) {
        if (document.getElementById('p_usn')) document.getElementById('p_usn').value = data.usn || '';
        document.getElementById('p_fullname').value = data.full_name || '';
        document.getElementById('p_age').value = data.age || '';
        document.getElementById('p_sem').value = data.semester || '';
        document.getElementById('p_email').value = data.email || '';
        document.getElementById('p_phone').value = data.phone || '';
        document.getElementById('p_address').value = data.address || '';
        document.getElementById('p_branch').value = data.branch || '';
        document.getElementById('p_cgpa').value = data.cgpa || '';
        document.getElementById('p_skills').value = data.skills || '';
        document.getElementById('p_objective').value = data.career_objective || '';
        document.getElementById('p_linkedin').value = data.linkedin_url || '';
        document.getElementById('p_github').value = data.github_url || '';
        document.getElementById('p_projects').value = data.projects || '';
        document.getElementById('p_experience').value = data.experience || '';
      }
    }
  } catch (e) { }
}

if (document.getElementById('profileForm')) {
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      usn: userUsn, full_name: document.getElementById('p_fullname').value, email: document.getElementById('p_email').value,
      phone: document.getElementById('p_phone').value, address: document.getElementById('p_address').value,
      age: document.getElementById('p_age').value, semester: document.getElementById('p_sem').value,
      branch: document.getElementById('p_branch').value, cgpa: document.getElementById('p_cgpa').value,
      skills: document.getElementById('p_skills').value, career_objective: document.getElementById('p_objective').value,
      linkedin_url: document.getElementById('p_linkedin').value, github_url: document.getElementById('p_github').value,
      projects: document.getElementById('p_projects').value, experience: document.getElementById('p_experience').value
    };
    try {
      await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      showModal('Profile saved securely!');
      toggleProfileEdit();
      loadStudentProfile();
    } catch (e) { showModal('Failed to save profile'); }
  });
}

async function loadStudentCompanies() {
  const res = await fetch('/api/companies');
  const companies = await res.json();
  const list = document.getElementById('companiesList');
  list.innerHTML = '';
  companies.forEach(c => {
    const isEligible = currentCgpa >= parseFloat(c.min_cgpa);
    const eligibilityText = isEligible ? '' : '<span style="color:#ff2a2a; font-size:0.8rem; font-family:NDot55;">INELIGIBLE: CGPA TOO LOW</span>';
    const btnState = isEligible ? `onclick="openApplyModal(${c.company_id}, '${c.company_name}', '${c.job_role}')"` : 'disabled style="opacity: 0.5; cursor: not-allowed;"';
    list.innerHTML += `
      <div class="glass-card">
        <div style="display:flex; justify-content:space-between;">
          <h4 style="margin-bottom: 5px; font-family:'Inter'; font-size: 1.5rem;">${c.company_name}</h4>
          ${eligibilityText}
        </div>
        <p class="text-muted" style="margin-top: 0; font-size: 0.9em; font-family:'NDot55'; letter-spacing:1px">${c.job_role}</p>
        <p style="font-size: 0.9rem; color: #ccc;">${c.job_description || 'No description provided.'}</p>
        <p style="font-size: 0.85rem; color: #888;"><strong>Min CGPA Requirement:</strong> ${c.min_cgpa} <br> <strong>Package (CTC):</strong> ${c.package_ctc}</p>
        <button class="btn" style="width:100%" ${btnState}>Apply for Role</button>
      </div>
    `;
  });
}

function openApplyModal(companyId, companyName, jobRole) {
  document.getElementById('applyCompanyId').value = companyId;
  document.getElementById('applyCompanyName').innerText = `Apply to ${companyName}`;
  document.getElementById('applyJobRole').innerText = jobRole;
  document.getElementById('applyModal').classList.remove('d-none');
}

if (document.getElementById('applyJobForm')) {
  document.getElementById('applyJobForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const company_id = document.getElementById('applyCompanyId').value;
    const resume_link = document.getElementById('applyResume').value;
    const cover_letter = document.getElementById('applyCoverLetter').value;
    const res = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usn: userUsn, company_id, resume_link, cover_letter }) });
    const data = await res.json();
    if (data.error) showModal(data.error);
    else {
      document.getElementById('applyModal').classList.add('d-none');
      document.getElementById('applyJobForm').reset();
      showModal('Application submitted successfully!');
      loadStudentKPIs();
    }
  });
}

async function loadStudentApplications() {
  const res = await fetch(`/api/applications/${userUsn}`);
  const apps = await res.json();
  const list = document.getElementById('applicationsList');
  list.innerHTML = '';
  apps.forEach(a => {
    let color = a.status === 'Offered' ? '#2aff2a' : (a.status === 'Rejected' ? '#ff2a2a' : '#ffff2a');
    list.innerHTML += `
      <tr>
        <td>${a.company_name}</td>
        <td>${a.job_role}</td>
        <td style="color:${color}; font-family:'NDot55'; font-size:0.8rem; letter-spacing:1px">${a.status}</td>
        <td><button class="btn btn-outline" style="padding: 5px 10px;" onclick="withdrawApp(${a.application_id})">Withdraw</button></td>
      </tr>
    `;
  });
}

function withdrawApp(id) {
  showModal("Are you sure you want to withdraw your application?", async () => {
    await fetch(`/api/applications/${id}`, { method: 'DELETE' });
    loadStudentApplications();
    loadStudentKPIs();
  });
}

// ================= ADMIN LOGIC =================
if (userRole === 'admin' && currentPage.includes('admin_dashboard')) { loadAdminDashboard(); }

async function loadAdminDashboard() {
  const [students, companies, apps] = await Promise.all([
    fetch('/api/admin/students').then(r => r.json()),
    fetch('/api/companies').then(r => r.json()),
    fetch('/api/admin/applications').then(r => r.json())
  ]);

  document.getElementById('kpi_students').innerText = students.length;
  document.getElementById('kpi_drives').innerText = companies.length;
  document.getElementById('kpi_apps').innerText = apps.length;

  const placed = apps.filter(a => a.status === 'Offered').length;
  const rejected = apps.filter(a => a.status === 'Rejected').length;
  const interviewing = apps.filter(a => ['Aptitude Test', 'Technical Interview', 'HR Interview'].includes(a.status)).length;
  const applied = apps.filter(a => a.status === 'Applied').length;
  document.getElementById('kpi_placed').innerText = placed;

  const ctx = document.getElementById('placementChart').getContext('2d');
  if (placementChartInstance) placementChartInstance.destroy();
  placementChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Applied', 'Interviewing', 'Rejected', 'Offered'],
      datasets: [{
        data: [applied, interviewing, rejected, placed],
        backgroundColor: ['#ffffff', '#e0c3fc', '#bb86fc', '#9b51e0'],
        borderWidth: 0
      }]
    },
    options: { plugins: { legend: { labels: { color: '#fff', font: { family: 'NDot55', size: 14 } } } } }
  });
}

async function loadAdminStudents() {
  const res = await fetch('/api/admin/students');
  window.studentsData = await res.json();
  renderStudentsTable(window.studentsData);
}

function renderStudentsTable(students) {
  const list = document.getElementById('adminStudentsList');
  list.innerHTML = '';
  students.forEach(s => {
    list.innerHTML += `
      <tr>
        <td>${s.usn}</td>
        <td>${s.full_name || '-'}</td>
        <td>${s.age || '-'}</td>
        <td>${s.semester || '-'}</td>
        <td>${s.branch || '-'}</td>
        <td>${s.cgpa || '-'}</td>
        <td>
          <button class="btn btn-outline" style="padding: 5px 10px;" onclick="openCgpaModal('${s.usn}', '${s.full_name}', '${s.cgpa}')">Edit CGPA</button>
          <button class="btn btn-outline" style="padding: 5px 10px;" onclick="deleteStudent('${s.usn}')">Delete</button>
        </td>
      </tr>
    `;
  });
}

function filterStudents() {
  const text = document.getElementById('searchStudent').value.toLowerCase();
  const branch = document.getElementById('filterBranch').value.toLowerCase();
  const semester = document.getElementById('filterSemester').value;
  const minCgpa = parseFloat(document.getElementById('filterCgpa').value) || 0;

  const trs = document.getElementById('adminStudentsList').getElementsByTagName('tr');
  for (let i = 0; i < trs.length; i++) {
    const tdUsn = trs[i].getElementsByTagName('td')[0].innerText.toLowerCase();
    const tdName = trs[i].getElementsByTagName('td')[1].innerText.toLowerCase();
    const tdSem = trs[i].getElementsByTagName('td')[3].innerText;
    const tdBranch = trs[i].getElementsByTagName('td')[4].innerText.toLowerCase();
    const tdCgpa = parseFloat(trs[i].getElementsByTagName('td')[5].innerText) || 0;

    const matchText = tdUsn.includes(text) || tdName.includes(text);
    const matchBranch = branch === "" || tdBranch.includes(branch);
    const matchSem = semester === "" || tdSem === semester;
    const matchCgpa = tdCgpa >= minCgpa;

    trs[i].style.display = (matchText && matchBranch && matchSem && matchCgpa) ? '' : 'none';
  }
}

function exportCSV() {
  if (!window.studentsData) return;
  let csv = 'USN,Name,Age,Semester,Email,Phone,Branch,CGPA,Skills\n';
  window.studentsData.forEach(s => {
    csv += `"${s.usn}","${s.full_name || ''}","${s.age || ''}","${s.semester || ''}","${s.email || ''}","${s.phone || ''}","${s.branch || ''}","${s.cgpa || ''}","${s.skills || ''}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = window.URL.createObjectURL(blob);
  a.download = 'students_report.csv';
  a.click();
}

function backupDatabase() {
  window.open('/api/admin/backup', '_blank');
}

if (document.getElementById('csvUpload')) {
  document.getElementById('csvUpload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        showModal('Importing student data... Please wait.');
        try {
          const res = await fetch('/api/admin/import-students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(results.data) });
          const data = await res.json();
          if (data.error) showModal(data.error);
          else {
            showModal('Import Successful! processed records.');
            loadAdminStudents();
            loadAdminDashboard();
            document.getElementById('csvUpload').value = '';
          }
        } catch (err) {
          showModal('Import failed.');
        }
      }
    });
  });
}

function exportCompaniesCSV() {
  if (!window.companiesData) return;
  let csv = 'ID,Company,Role,MinCGPA,CTC,Description\n';
  window.companiesData.forEach(c => {
    csv += `"${c.company_id}","${c.company_name}","${c.job_role}","${c.min_cgpa}","${c.package_ctc}","${(c.job_description || '').replace(/"/g, '""')}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = window.URL.createObjectURL(blob);
  a.download = 'companies_drives.csv';
  a.click();
}

if (document.getElementById('csvCompaniesUpload')) {
  document.getElementById('csvCompaniesUpload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        showModal('Importing companies... Please wait.');
        try {
          const res = await fetch('/api/admin/import-companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(results.data) });
          const data = await res.json();
          if (data.error) showModal(data.error);
          else {
            showModal('Company Import Successful!');
            loadAdminCompanies();
            loadAdminDashboard();
            document.getElementById('csvCompaniesUpload').value = '';
          }
        } catch (err) {
          showModal('Import failed.');
        }
      }
    });
  });
}

function deleteStudent(usn) {
  showModal(`Warning: This will delete student ${usn}. Proceed?`, async () => {
    await fetch(`/api/admin/students/${usn}`, { method: 'DELETE' });
    loadAdminStudents(); loadAdminDashboard();
  });
}

if (document.getElementById('addStudentForm')) {
  document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      usn: document.getElementById('s_usn').value,
      full_name: document.getElementById('s_name').value,
      cgpa: document.getElementById('s_cgpa').value,
      email: document.getElementById('s_email').value,
      phone: document.getElementById('s_phone').value,
      age: document.getElementById('s_age').value,
      semester: document.getElementById('s_semester').value
    };
    const res = await fetch('/api/admin/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.error) showModal(data.error);
    else {
      document.getElementById('addStudentForm').reset();
      loadAdminStudents();
      showModal('Student added successfully. Default password is their USN.');
    }
  });
}

function openCgpaModal(usn, name, currentCgpa) {
  document.getElementById('cgpaUsn').value = usn;
  document.getElementById('cgpaStudentName').innerText = name;
  document.getElementById('cgpaValue').value = currentCgpa === 'null' ? '' : currentCgpa;
  document.getElementById('cgpaModal').classList.remove('d-none');
}

if (document.getElementById('saveCgpaBtn')) {
  document.getElementById('saveCgpaBtn').addEventListener('click', async () => {
    const usn = document.getElementById('cgpaUsn').value;
    const cgpa = document.getElementById('cgpaValue').value;
    const res = await fetch(`/api/admin/students/${usn}/cgpa`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cgpa }) });
    const data = await res.json();
    if (data.error) showModal(data.error);
    else {
      document.getElementById('cgpaModal').classList.add('d-none');
      showModal('CGPA Updated');
      loadAdminStudents();
    }
  });
}

if (document.getElementById('addCompanyForm')) {
  document.getElementById('addCompanyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      company_name: document.getElementById('c_name').value, job_role: document.getElementById('c_role').value,
      job_description: document.getElementById('c_desc').value, min_cgpa: document.getElementById('c_cgpa').value, package_ctc: document.getElementById('c_ctc').value
    };
    await fetch('/api/admin/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    document.getElementById('addCompanyForm').reset();
    loadAdminCompanies();
    showModal('Company added to placement drive!');
  });
}

async function loadAdminCompanies() {
  const res = await fetch('/api/companies');
  const companies = await res.json();
  const list = document.getElementById('adminCompaniesList');
  list.innerHTML = '';
  companies.forEach(c => {
    list.innerHTML += `
      <tr>
        <td>${c.company_name}</td>
        <td>${c.job_role}</td>
        <td>${c.min_cgpa}</td>
        <td>${c.package_ctc}</td>
        <td><button class="btn btn-outline" style="padding: 5px 10px;" onclick="deleteCompany(${c.company_id})">Remove</button></td>
      </tr>
    `;
  });
}

function deleteCompany(id) {
  showModal(`Delete this company?`, async () => {
    await fetch(`/api/admin/companies/${id}`, { method: 'DELETE' });
    loadAdminCompanies();
  });
}

async function loadAdminApplications() {
  const res = await fetch('/api/admin/applications');
  window.applicationsData = await res.json();
  const list = document.getElementById('adminAppsList');
  list.innerHTML = '';
  window.applicationsData.forEach(a => {
    list.innerHTML += `
      <tr>
        <td>${a.full_name}</td>
        <td>${a.usn}</td>
        <td>${a.company_name}</td>
        <td>${a.job_role}</td>
        <td style="font-family:'NDot55'; font-size:0.8rem; letter-spacing:1px">${a.status}</td>
        <td><button class="btn btn-outline" style="padding: 5px 10px;" onclick="openReviewModal(${a.application_id})">Review</button></td>
      </tr>
    `;
  });
}

function openReviewModal(appId) {
  const app = window.applicationsData.find(a => a.application_id === appId);
  if (!app) return;
  document.getElementById('r_studentName').innerText = app.full_name + ' (' + app.usn + ')';
  document.getElementById('r_role').innerText = `Applying for ${app.job_role} at ${app.company_name}`;
  document.getElementById('r_coverLetter').innerText = app.cover_letter || 'No cover letter provided.';
  document.getElementById('r_resumeLink').href = app.resume_link || '#';
  document.getElementById('r_statusSelect').value = app.status;
  document.getElementById('r_saveBtn').onclick = () => updateAppStatus(appId);
  document.getElementById('reviewModal').classList.remove('d-none');
}

async function updateAppStatus(id) {
  const status = document.getElementById('r_statusSelect').value;
  await fetch(`/api/admin/applications/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  document.getElementById('reviewModal').classList.add('d-none');
  showModal('Status Updated!');
  loadAdminApplications();
}
