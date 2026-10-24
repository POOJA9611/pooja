import bcrypt from 'bcryptjs';
import { getDb } from '../config/database.js';
import { seedHOD } from './seed.js';

export async function seedDemoData() {
  console.log('🌱 Starting Demo Data Seeding...');
  const hod = await seedHOD();
  const db = await getDb();

  const defaultPassword = 'Password@123';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  // 1. Seed Faculty Members (college domain: @college.edu)
  const facultyData = [
    {
      name: 'Dr. Sarah Jenkins',
      email: 'sarah.jenkins@college.edu',
      designation: 'Associate Professor',
      department: 'Computer Science & Engineering',
      bio: 'Cloud architecture specialist with 12+ years of distributed systems and Kubernetes research.',
      subjects: 'Cloud Computing, Distributed Systems, Microservices',
      languages: 'Go, Python, Java, TypeScript',
      linkedin: 'https://linkedin.com/in/sarahjenkins-cloud',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
    },
    {
      name: 'Prof. Alan Turing',
      email: 'alan.turing@college.edu',
      designation: 'Professor & Lab Director',
      department: 'AI & Data Science',
      bio: 'Machine learning lead researching generative AI pipelines and computer vision optimizations.',
      subjects: 'Machine Learning, Deep Learning, Natural Language Processing',
      languages: 'Python, C++, R, Julia',
      linkedin: 'https://linkedin.com/in/alanturing-ai',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    },
    {
      name: 'Dr. Maya Patel',
      email: 'maya.patel@college.edu',
      designation: 'Assistant Professor',
      department: 'Cybersecurity & Forensics',
      bio: 'Information security researcher focusing on zero-trust architectures and applied cryptography.',
      subjects: 'Network Security, Cryptography, Ethical Hacking',
      languages: 'Python, Rust, C, Bash',
      linkedin: 'https://linkedin.com/in/mayapatel-sec',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'
    }
  ];

  const facultyIds = {};
  for (const f of facultyData) {
    let user = await db.get('SELECT id FROM users WHERE email = ?', [f.email]);
    let fId = user ? user.id : null;
    if (!user) {
      const res = await db.run(
        `INSERT INTO users (role, name, email, password_hash, avatar)
         VALUES ('faculty', ?, ?, ?, ?)`,
        [f.name, f.email, passwordHash, f.avatar]
      );
      fId = res.lastID;
      await db.run(
        `INSERT INTO faculty_profiles (user_id, designation, department, bio, subjects, languages, linkedin_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [fId, f.designation, f.department, f.bio, f.subjects, f.languages, f.linkedin]
      );
      console.log(`  + Created Faculty: ${f.name} (${f.email})`);
    } else {
      console.log(`  - Faculty already exists: ${f.name}`);
    }
    facultyIds[f.email] = fId;
  }

  // 2. Seed Students
  const studentData = [
    {
      name: 'Alex Chen',
      email: 'alex.chen@student.edu',
      reg_no: 'RA2211003010142',
      department: 'Computer Science & Engineering',
      semester: 6,
      cgpa: 9.1,
      strength: 'fullstack',
      languages: 'JavaScript, TypeScript, React, Node.js',
      bio: 'Full-stack developer passionate about building scalable microservices and UI systems.',
      linkedin: 'https://linkedin.com/in/alexchen-dev',
      github: 'https://github.com/alexchen-dev',
      facultyEmail: 'sarah.jenkins@college.edu',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
    },
    {
      name: 'Priya Sharma',
      email: 'priya.sharma@student.edu',
      reg_no: 'RA2211003010088',
      department: 'Computer Science & Engineering',
      semester: 6,
      cgpa: 8.8,
      strength: 'frontend',
      languages: 'React, Vue, Tailwind CSS, JavaScript',
      bio: 'UI/UX enthusiast focused on accessible web apps and component libraries.',
      linkedin: 'https://linkedin.com/in/priyasharma-web',
      github: 'https://github.com/priyasharma-web',
      facultyEmail: 'sarah.jenkins@college.edu',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
    },
    {
      name: 'Marcus Vance',
      email: 'marcus.vance@student.edu',
      reg_no: 'RA2211003010210',
      department: 'Computer Science & Engineering',
      semester: 8,
      cgpa: 8.5,
      strength: 'backend',
      languages: 'Python, Go, PostgreSQL, Docker',
      bio: 'DevSecOps and distributed backend engineer.',
      linkedin: 'https://linkedin.com/in/marcusvance-eng',
      github: 'https://github.com/marcusvance-eng',
      facultyEmail: 'sarah.jenkins@college.edu',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    {
      name: 'Ananya Iyer',
      email: 'ananya.iyer@student.edu',
      reg_no: 'RA2211003010312',
      department: 'AI & Data Science',
      semester: 6,
      cgpa: 9.3,
      strength: 'fullstack',
      languages: 'Python, React, FastAPI, MongoDB',
      bio: 'AI pipeline builder specializing in model serving and intuitive web dashboards.',
      linkedin: 'https://linkedin.com/in/ananyaiyer',
      github: 'https://github.com/ananyaiyer',
      facultyEmail: 'alan.turing@college.edu',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    },
    {
      name: 'David Kim',
      email: 'david.kim@student.edu',
      reg_no: 'RA2211003010405',
      department: 'AI & Data Science',
      semester: 6,
      cgpa: 8.2,
      strength: 'backend',
      languages: 'Java, Spring Boot, MySQL, Redis',
      bio: 'Database optimization fan with keen interest in asynchronous message queues.',
      linkedin: 'https://linkedin.com/in/davidkim-cs',
      github: 'https://github.com/davidkim-cs',
      facultyEmail: 'alan.turing@college.edu',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
    },
    {
      name: 'Sneha Reddy',
      email: 'sneha.reddy@student.edu',
      reg_no: 'RA2211003010521',
      department: 'Computer Science & Engineering',
      semester: 6,
      cgpa: 8.9,
      strength: 'frontend',
      languages: 'HTML/CSS, React, Next.js, Figma',
      bio: 'Design engineer passionate about frontend performance and interactive micro-animations.',
      linkedin: 'https://linkedin.com/in/snehareddy',
      github: 'https://github.com/snehareddy',
      facultyEmail: null, // UNASSIGNED initially for HOD testing!
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'
    }
  ];

  const studentIds = {};
  for (const s of studentData) {
    let user = await db.get('SELECT id FROM users WHERE email = ?', [s.email]);
    let sId = user ? user.id : null;
    const assignedFacId = s.facultyEmail ? facultyIds[s.facultyEmail] : null;

    if (!user) {
      const res = await db.run(
        `INSERT INTO users (role, name, email, password_hash, avatar)
         VALUES ('student', ?, ?, ?, ?)`,
        [s.name, s.email, passwordHash, s.avatar]
      );
      sId = res.lastID;
      await db.run(
        `INSERT INTO student_profiles (
          user_id, reg_no, department, semester, cgpa, bio, strength, languages, linkedin_url, github_url, faculty_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sId, s.reg_no, s.department, s.semester, s.cgpa, s.bio, s.strength, s.languages, s.linkedin, s.github, assignedFacId]
      );

      if (assignedFacId) {
        await db.run(
          `INSERT INTO faculty_assignments (student_id, faculty_id, assigned_by, note)
           VALUES (?, ?, ?, 'Initial HOD Semester Allocation')`,
          [sId, assignedFacId, hod.id]
        );
      }
      console.log(`  + Created Student: ${s.name} (${s.email}) - Assigned to: ${s.facultyEmail || 'UNASSIGNED'}`);
    }
    studentIds[s.email] = sId;
  }

  // 3. Create Teams and Chats by Dr. Sarah Jenkins
  const sjId = facultyIds['sarah.jenkins@college.edu'];
  const alexId = studentIds['alex.chen@student.edu'];
  const priyaId = studentIds['priya.sharma@student.edu'];
  const marcusId = studentIds['marcus.vance@student.edu'];

  // Check if Team 1 exists
  const existingTeam1 = await db.get('SELECT id FROM teams WHERE name = ?', ['CloudScale']);
  if (!existingTeam1 && sjId && alexId && priyaId) {
    const tRes = await db.run(
      `INSERT INTO teams (name, faculty_id, created_by) VALUES ('CloudScale', ?, ?)`,
      [sjId, sjId]
    );
    const teamId = tRes.lastID;

    await db.run(`INSERT INTO team_members (team_id, student_id) VALUES (?, ?)`, [teamId, alexId]);
    await db.run(`INSERT INTO team_members (team_id, student_id) VALUES (?, ?)`, [teamId, priyaId]);

    const cgRes = await db.run(
      `INSERT INTO chat_groups (name, team_id, faculty_id, created_by) VALUES ('Team: CloudScale', ?, ?, ?)`,
      [teamId, sjId, sjId]
    );
    const cgId = cgRes.lastID;

    await db.run(`INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)`, [cgId, sjId]);
    await db.run(`INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)`, [cgId, alexId]);
    await db.run(`INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)`, [cgId, priyaId]);

    await db.run(
      `INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)`,
      [cgId, sjId, 'Welcome Alex and Priya to Team CloudScale! Please push your SRS draft here by Friday.']
    );
    await db.run(
      `INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)`,
      [cgId, alexId, 'Thanks Dr. Jenkins! Working on the architecture diagram and database schema now.']
    );

    // Add project
    const pRes = await db.run(
      `INSERT INTO projects (title, description, status, team_id) VALUES (?, ?, 'ongoing', ?)`,
      ['CloudScale: Multi-Tenant Campus Event Platform', 'Scalable microservice architecture using Node.js and Redis.', teamId]
    );
    await db.run(`INSERT INTO project_members (project_id, student_id) VALUES (?, ?)`, [pRes.lastID, alexId]);
    await db.run(`INSERT INTO project_members (project_id, student_id) VALUES (?, ?)`, [pRes.lastID, priyaId]);

    console.log('  + Created Team "CloudScale" with chat & project');
  }

  // Check if Team 2 exists
  const existingTeam2 = await db.get('SELECT id FROM teams WHERE name = ?', ['DevSecOps Alpha']);
  if (!existingTeam2 && sjId && marcusId) {
    const tRes = await db.run(
      `INSERT INTO teams (name, faculty_id, created_by) VALUES ('DevSecOps Alpha', ?, ?)`,
      [sjId, sjId]
    );
    const teamId = tRes.lastID;

    await db.run(`INSERT INTO team_members (team_id, student_id) VALUES (?, ?)`, [teamId, marcusId]);

    const cgRes = await db.run(
      `INSERT INTO chat_groups (name, team_id, faculty_id, created_by) VALUES ('Team: DevSecOps Alpha', ?, ?, ?)`,
      [teamId, sjId, sjId]
    );
    const cgId = cgRes.lastID;

    await db.run(`INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)`, [cgId, sjId]);
    await db.run(`INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)`, [cgId, marcusId]);

    await db.run(
      `INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)`,
      [cgId, sjId, 'Marcus, please confirm the CI/CD pipeline scans pass before final deployment.']
    );

    const pRes = await db.run(
      `INSERT INTO projects (title, description, status, team_id) VALUES (?, ?, 'completed', ?)`,
      ['Automated Container Vulnerability Scanner', 'GitHub Action integration for static container vulnerability scanning.', teamId]
    );
    await db.run(`INSERT INTO project_members (project_id, student_id) VALUES (?, ?)`, [pRes.lastID, marcusId]);

    console.log('  + Created Team "DevSecOps Alpha" with chat & project');
  }

  // 4. Seed Notifications (Role specific & both)
  const existingNotifs = await db.get('SELECT COUNT(*) as count FROM notifications');
  if (existingNotifs.count === 0) {
    await db.run(
      `INSERT INTO notifications (title, body, audience, posted_by, deadline)
       VALUES (?, ?, 'both', ?, '2026-11-15T23:59:59Z')`,
      [
        'Capstone Milestone 1 Submissions Open',
        'All department project teams must upload their System Architecture and SRS document to the portal by the stated deadline.',
        hod.id
      ]
    );

    await db.run(
      `INSERT INTO notifications (title, body, audience, posted_by, deadline)
       VALUES (?, ?, 'students', ?, '2026-11-05T18:00:00Z')`,
      [
        'Upcoming Hackathon & GitHub Classroom Guidelines',
        'Students must ensure all code repositories have verified student contributor emails linked.',
        hod.id
      ]
    );

    await db.run(
      `INSERT INTO notifications (title, body, audience, posted_by, deadline)
       VALUES (?, ?, 'faculty', ?, '2026-10-30T10:00:00Z')`,
      [
        'Semester Guidance Evaluation Meeting in Conference Room A',
        'Faculty mentors are requested to review assigned student teams and submit preliminary progress marks.',
        hod.id
      ]
    );
    console.log('  + Seeded 3 Role-Filtered Notifications');
  }

  // 5. Seed a Sample Change Request from Ananya Iyer
  const ananyaId = studentIds['ananya.iyer@student.edu'];
  const alanId = facultyIds['alan.turing@college.edu'];
  const existingReq = await db.get('SELECT id FROM change_requests WHERE student_id = ?', [ananyaId]);
  if (!existingReq && ananyaId && alanId && sjId) {
    await db.run(
      `INSERT INTO change_requests (student_id, current_faculty_id, requested_faculty_id, reason, status)
       VALUES (?, ?, ?, 'My capstone project focus is high-throughput distributed microservices, which directly aligns with Dr. Sarah Jenkins research domain.', 'pending')`,
      [ananyaId, alanId, sjId]
    );
    console.log('  + Seeded 1 Pending Change Request for Ananya Iyer');
  }

  console.log('\n🎉 Demo Data Seeding Completed Successfully!');
  console.log('----------------------------------------------------');
  console.log('DEMO LOGINS:');
  console.log('1. HOD (Admin):');
  console.log('   Email: hod.cs@college.edu | Password: HodPass@2026');
  console.log('2. Faculty:');
  console.log('   Email: sarah.jenkins@college.edu | Password: Password@123');
  console.log('   Email: alan.turing@college.edu    | Password: Password@123');
  console.log('   Email: maya.patel@college.edu     | Password: Password@123');
  console.log('3. Student:');
  console.log('   Email: alex.chen@student.edu     | Password: Password@123 (Assigned to Dr. Jenkins, in Team CloudScale)');
  console.log('   Email: priya.sharma@student.edu  | Password: Password@123 (Assigned to Dr. Jenkins, in Team CloudScale)');
  console.log('   Email: ananya.iyer@student.edu   | Password: Password@123 (Has pending change request)');
  console.log('   Email: sneha.reddy@student.edu   | Password: Password@123 (UNASSIGNED student for testing HOD assignment)');
  console.log('----------------------------------------------------\n');
}

if (process.argv[1] && process.argv[1].endsWith('demoSeed.js')) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error during demo seeding:', err);
      process.exit(1);
    });
}
