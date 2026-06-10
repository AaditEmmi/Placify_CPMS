CREATE DATABASE IF NOT EXISTS CPMS;
USE CPMS;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS student_profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS companies;
DROP VIEW IF EXISTS vw_eligible_students;
DROP TRIGGER IF EXISTS before_student_profile_update;
SET FOREIGN_KEY_CHECKS = 1;


CREATE TABLE users (
    usn VARCHAR(50) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') NOT NULL,
    is_first_login BOOLEAN DEFAULT TRUE
);


CREATE TABLE student_profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    usn VARCHAR(50) NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    branch VARCHAR(100),
    age INT,
    semester INT,
    cgpa DECIMAL(4,2),
    skills TEXT,
    career_objective TEXT,
    linkedin_url VARCHAR(255),
    github_url VARCHAR(255),
    projects TEXT,
    experience TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usn) REFERENCES users(usn) ON DELETE CASCADE
);

CREATE TABLE companies (
    company_id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    job_role VARCHAR(255) NOT NULL,
    job_description TEXT,
    min_cgpa DECIMAL(4,2) NOT NULL,
    package_ctc VARCHAR(100)
);

CREATE TABLE applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    usn VARCHAR(50) NOT NULL,
    company_id INT NOT NULL,
    resume_link VARCHAR(255),
    cover_letter TEXT,
    status ENUM('Applied', 'Aptitude Test', 'Technical Interview', 'HR Interview', 'Offered', 'Rejected') DEFAULT 'Applied',
    applied_on DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usn) REFERENCES users(usn) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

INSERT INTO users (usn, password, role, is_first_login) VALUES 
('admin', 'admin123', 'admin', FALSE),
('1RVU24CS001', '1RVU24CS001', 'student', TRUE),
('1RVU24CS002', '1RVU24CS002', 'student', TRUE),
('1RVU24CS003', '1RVU24CS003', 'student', TRUE),
('1RVU24CS004', '1RVU24CS004', 'student', TRUE);

INSERT INTO student_profiles (usn, full_name, age, semester, email, phone, address, branch, cgpa, skills, career_objective, linkedin_url, github_url, projects, experience) VALUES 
('1RVU24CS001', 'Alice Smith', 20, 5, 'alice@rvu.edu.in', '1234567890', '123 Main St, NY', 'Computer Science', 8.80, 'Java, React', 'To become a full stack developer.', 'linkedin.com/in/alice', 'github.com/alice', 'E-commerce website using MERN', 'Intern at TechCorp'),
('1RVU24CS002', 'Bob Johnson', 21, 5, 'bob@rvu.edu.in', '2345678901', '456 Elm St, CA', 'Information Systems', 7.50, 'SQL, Python', 'Data Analyst role.', '', '', '', ''),
('1RVU24CS003', 'Charlie Williams', 22, 7, 'charlie@rvu.edu.in', '3456789012', '789 Oak St, TX', 'Biology', 9.20, 'Research', 'Medical research.', '', '', '', ''),
('1RVU24CS004', 'Diana Brown', 19, 3, 'diana@rvu.edu.in', '4567890123', '321 Pine St, FL', 'Mechanical Eng', 8.70, 'AutoCAD', 'Automotive design.', '', '', '', '');

INSERT INTO companies (company_name, job_role, job_description, min_cgpa, package_ctc) VALUES 
('TechNova', 'Software Engineer', 'Looking for strong problem solvers proficient in Node.js and React.', 3.00, '12 LPA'),
('FinTrust', 'Financial Analyst', 'Analyze financial data and present insights.', 3.50, '10 LPA'),
('HealthPlus', 'Medical Researcher', 'Conduct laboratory research and data analysis.', 3.20, '8 LPA'),
('AutoDrive', 'Design Engineer', 'Design automotive parts using CAD tools.', 3.60, '11 LPA'),
('EduSmart', 'Content Developer', 'Create educational content for schools.', 2.50, '6 LPA');


INSERT INTO applications (usn, company_id, resume_link, cover_letter, status) VALUES 
('1RVU24CS001', 1, 'drive.google.com/alice_resume.pdf', 'I am passionate about coding.', 'Applied'),
('1RVU24CS002', 2, 'drive.google.com/bob_resume.pdf', 'I love data.', 'Aptitude Test'),
('1RVU24CS003', 3, 'drive.google.com/charlie_resume.pdf', 'I love biology.', 'Technical Interview'),
('1RVU24CS004', 4, 'drive.google.com/diana_resume.pdf', 'I love cars.', 'Rejected'),
('1RVU24CS001', 5, 'drive.google.com/alice_resume.pdf', 'I want to teach.', 'Offered');


DELIMITER //
CREATE TRIGGER before_student_profile_update
BEFORE UPDATE ON student_profiles
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END; //
DELIMITER ;


CREATE VIEW vw_eligible_students AS
SELECT s.full_name, s.usn, s.cgpa, c.company_name, c.job_role, c.min_cgpa
FROM student_profiles s
INNER JOIN companies c 
ON s.cgpa >= c.min_cgpa;
