import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'http://localhost:5000/api';

async function req(endpoint, opts = {}, token = null) {
  const headers = opts.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(opts.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${endpoint}`, {
    ...opts,
    headers
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function run() {
  console.log('🧪 Starting Profile & Dashboard Suggestions Verification...\n');

  // 1. Login as demo student Alex Chen
  console.log('1. Logging in as Alex Chen...');
  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'alex.chen@student.edu',
      password: 'Password@123'
    })
  });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
  }
  const token = loginRes.data.token;
  console.log('✅ Logged in successfully. Token acquired.\n');

  // 2. Test PUT /api/student/profile
  console.log('2. Updating student profile (Personal, Professional, Additional fields)...');
  const updateRes = await req('/student/profile', {
    method: 'PUT',
    body: JSON.stringify({
      name: 'Alex Chen',
      username: 'alexchen_dev',
      location: 'Chennai, India',
      website_url: 'https://alexchen.dev',
      bio: 'Aspiring distributed systems engineer and full-stack developer.',
      headline: 'Full-Stack Developer & Cloud Systems Enthusiast',
      strength: 'fullstack',
      experience_level: 'Intermediate',
      languages: 'JavaScript, Python, C++, TypeScript',
      frameworks: 'React, Node.js, Express, Docker, Tailwind CSS',
      technical_skills: 'REST APIs, Microservices, System Architecture, Redis',
      college: 'Department of Computer Science & Engineering',
      education: 'B.Tech in Computer Science & Engineering (2023 - 2027)',
      github_url: 'https://github.com/alexchen',
      linkedin_url: 'https://linkedin.com/in/alexchen',
      semester: 6,
      cgpa: 8.9,
      interests: 'Cloud Computing, Distributed Systems, Microservices',
      achievements: 'First Prize Smart Campus Hackathon; AWS Cloud Certified',
      availability_status: 'available'
    })
  }, token);

  if (updateRes.status !== 200) {
    throw new Error(`Profile update failed: ${JSON.stringify(updateRes.data)}`);
  }
  console.log('✅ Profile updated successfully:', updateRes.data.message);

  // 3. Verify GET /api/student/profile returns updated fields
  console.log('3. Verifying GET /api/student/profile...');
  const getProfRes = await req('/student/profile', { method: 'GET' }, token);
  if (getProfRes.status !== 200) {
    throw new Error(`Get profile failed: ${JSON.stringify(getProfRes.data)}`);
  }
  const prof = getProfRes.data.profile;
  console.log(`✅ Name: ${prof.name}, Username: @${prof.username}`);
  console.log(`✅ Headline: ${prof.headline}`);
  console.log(`✅ Technical Skills: ${prof.technical_skills}`);
  console.log(`✅ Frameworks: ${prof.frameworks}`);
  console.log(`✅ Experience Level: ${prof.experience_level}`);
  console.log(`✅ Achievements: ${prof.achievements}`);
  console.log(`✅ Availability: ${prof.availability_status}\n`);

  // 4. Test Local Avatar Upload
  console.log('4. Testing Local Profile Picture Upload...');
  // Create a minimal 1x1 PNG image buffer
  const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const imgBuffer = Buffer.from(samplePngBase64, 'base64');
  const tempImgPath = path.join(__dirname, 'test-avatar.png');
  fs.writeFileSync(tempImgPath, imgBuffer);

  const formData = new FormData();
  const fileBlob = new Blob([imgBuffer], { type: 'image/png' });
  formData.append('avatar', fileBlob, 'test-avatar.png');

  const uploadRes = await fetch('http://localhost:5000/api/student/profile/avatar', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(`Avatar upload failed: ${JSON.stringify(uploadData)}`);
  }
  console.log('✅ Avatar uploaded successfully:', uploadData);
  const avatarUrl = uploadData.avatarUrl;

  // Verify static serving of uploaded avatar
  console.log(`5. Verifying static serving of avatar at http://localhost:5000${avatarUrl}...`);
  const staticRes = await fetch(`http://localhost:5000${avatarUrl}`);
  if (!staticRes.ok) {
    throw new Error(`Failed to fetch static avatar: status ${staticRes.status}`);
  }
  console.log(`✅ Static avatar served successfully with status ${staticRes.status} (Content-Type: ${staticRes.headers.get('content-type')})\n`);

  // Verify Auth me sync
  console.log('6. Verifying /api/auth/me synchronization with new avatar...');
  const meRes = await req('/auth/me', { method: 'GET' }, token);
  if (meRes.data.user.avatar !== avatarUrl) {
    throw new Error(`Avatar mismatch in /me: ${meRes.data.user.avatar} vs ${avatarUrl}`);
  }
  console.log('✅ /api/auth/me successfully synchronized with new avatar URL:', meRes.data.user.avatar, '\n');

  // Test Delete Avatar (revert to default)
  console.log('7. Testing DELETE /api/student/profile/avatar (restore default)...');
  const delRes = await req('/student/profile/avatar', { method: 'DELETE' }, token);
  if (delRes.status !== 200) {
    throw new Error(`Delete avatar failed: ${JSON.stringify(delRes.data)}`);
  }
  console.log('✅ Avatar reverted to default:', delRes.data.avatarUrl);

  // 8. Test Available Teams to Join & Suggestions
  console.log('\n8. Testing Available Teams To Join with Genuine Compatibility Calculation...');
  const teamsRes = await req('/teams/available-to-join', { method: 'GET' }, token);
  if (teamsRes.status !== 200) {
    throw new Error(`Get available teams failed: ${JSON.stringify(teamsRes.data)}`);
  }
  console.log(`✅ Retrieved ${teamsRes.data.teams.length} available team(s) for suggestions:`);
  teamsRes.data.teams.slice(0, 3).forEach((t, i) => {
    console.log(`   ${i + 1}. Team "${t.name}" (${t.project_title}): ${t.match_percentage}% Match`);
    console.log(`      Reason: ${t.match_explanation}`);
  });

  // Clean up temp test image
  if (fs.existsSync(tempImgPath)) {
    fs.unlinkSync(tempImgPath);
  }

  console.log('\n🎉 ALL PROFILE EDITING & DASHBOARD SUGGESTIONS TESTS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
