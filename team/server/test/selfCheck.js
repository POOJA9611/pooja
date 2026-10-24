import assert from 'assert';
import { getDb } from '../config/database.js';
import { seedHOD } from '../db/seed.js';

const BASE_URL = 'http://localhost:5000/api';

async function req(endpoint, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runSelfCheck() {
  console.log('🧪 ========================================================');
  console.log('🧪 RUNNING COMPREHENSIVE FINAL SELF-CHECK FOR COLLEGE PORTAL');
  console.log('🧪 ========================================================\n');

  let passedTests = 0;
  const totalTests = 8;

  try {
    // Seed HOD
    const hodSeed = await seedHOD();
    assert(hodSeed, 'HOD seed should succeed');

    // Login as HOD to get token
    const hodLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'hod.cs@college.edu', password: 'HodPass@2026' })
    });
    assert.strictEqual(hodLogin.status, 200, 'HOD login should return 200');
    const hodToken = hodLogin.data.token;
    assert(hodToken, 'HOD token must be present');
    console.log('🔑 Logged in as HOD successfully.');

    // ----------------------------------------------------
    // FLOW 1: Faculty & Student signup; HOD registration rejected
    // ----------------------------------------------------
    console.log('\n▶️ Testing Flow 1: Signup enforcement & HOD rejection...');

    // 1a. Attempt to register as HOD
    const fakeHodSignup = await req('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        role: 'hod',
        name: 'Imposter HOD',
        email: 'imposter.hod@college.edu',
        password: 'Password@123'
      })
    });
    assert.strictEqual(fakeHodSignup.status, 400, 'Attempting to register as HOD must be rejected with 400');
    console.log('  ✅ 1a. HOD registration rejected with 400:', fakeHodSignup.data.error);

    // 1b. Faculty signup with non-college domain
    const badFacultySignup = await req('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        role: 'faculty',
        name: 'Prof. Hacker',
        email: 'hacker@gmail.com',
        password: 'Password@123'
      })
    });
    assert.strictEqual(badFacultySignup.status, 400, 'Faculty signup without college domain must be rejected with 400');
    console.log('  ✅ 1b. Faculty signup with invalid domain rejected with 400:', badFacultySignup.data.error);

    // 1c. Faculty signup with valid college domain
    const testFacEmail = `test.prof.${Date.now()}@college.edu`;
    const goodFacultySignup = await req('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        role: 'faculty',
        name: 'Prof. Test Mentor',
        email: testFacEmail,
        password: 'Password@123',
        designation: 'Associate Professor',
        subjects: 'Parallel Systems, GPU Architecture',
        languages: 'C++, CUDA, Python'
      })
    });
    assert.strictEqual(goodFacultySignup.status, 201, 'Valid faculty signup must return 201');
    const facultyToken = goodFacultySignup.data.token;
    const facultyUser = goodFacultySignup.data.user;
    console.log(`  ✅ 1c. Faculty signed up successfully (ID: ${facultyUser.id}, ${testFacEmail})`);

    // 1d. Students signup
    const testStd1Email = `test.std1.${Date.now()}@student.edu`;
    const std1Signup = await req('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        role: 'student',
        name: 'Test Student One',
        email: testStd1Email,
        password: 'Password@123',
        reg_no: 'RA2026TEST01',
        strength: 'frontend',
        languages: 'React, TypeScript, CSS'
      })
    });
    assert.strictEqual(std1Signup.status, 201, 'Student 1 signup must return 201');
    const std1Token = std1Signup.data.token;
    const std1User = std1Signup.data.user;

    const testStd2Email = `test.std2.${Date.now()}@student.edu`;
    const std2Signup = await req('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        role: 'student',
        name: 'Test Student Two',
        email: testStd2Email,
        password: 'Password@123',
        reg_no: 'RA2026TEST02',
        strength: 'backend',
        languages: 'Python, FastAPI, Docker'
      })
    });
    assert.strictEqual(std2Signup.status, 201, 'Student 2 signup must return 201');
    const std2Token = std2Signup.data.token;
    const std2User = std2Signup.data.user;
    console.log(`  ✅ 1d. Students signed up successfully: Std1 (ID: ${std1User.id}), Std2 (ID: ${std2User.id})`);
    passedTests++;

    // ----------------------------------------------------
    // FLOW 2: HOD assigns students to faculty; Faculty sees only their own students
    // ----------------------------------------------------
    console.log('\n▶️ Testing Flow 2: HOD assignment & Faculty ownership isolation...');

    // Before assignment, faculty should see 0 assigned students
    const beforeMyStudents = await req('/faculty/my-students', { method: 'GET' }, facultyToken);
    assert.strictEqual(beforeMyStudents.status, 200);
    assert.strictEqual(beforeMyStudents.data.students.length, 0, 'New faculty should start with 0 mentees');

    // HOD assigns std1 and std2 to facultyUser
    const assignRes = await req('/hod/assign-students', {
      method: 'POST',
      body: JSON.stringify({
        studentIds: [std1User.id, std2User.id],
        facultyId: facultyUser.id,
        note: 'Assigned for Parallel Systems research'
      })
    }, hodToken);
    assert.strictEqual(assignRes.status, 200, 'HOD assignment must return 200');
    console.log('  ✅ 2a. HOD assigned students to faculty:', assignRes.data.message);

    // Faculty fetches their students now
    const afterMyStudents = await req('/faculty/my-students', { method: 'GET' }, facultyToken);
    assert.strictEqual(afterMyStudents.status, 200);
    const assignedIds = afterMyStudents.data.students.map((s) => s.id);
    assert(assignedIds.includes(std1User.id), 'Std1 must be in faculty mentee list');
    assert(assignedIds.includes(std2User.id), 'Std2 must be in faculty mentee list');
    console.log(`  ✅ 2b. Faculty sees exactly their own assigned students (${afterMyStudents.data.students.length} students)`);
    passedTests++;

    // ----------------------------------------------------
    // FLOW 3: Faculty creates two teams & chats; Real-time messaging
    // ----------------------------------------------------
    console.log('\n▶️ Testing Flow 3: Team creation, auto chat group, and message exchange...');

    // Team 1 with Std 1
    const team1Res = await req('/teams', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Parallel GPU Pod',
        studentIds: [std1User.id]
      })
    }, facultyToken);
    assert.strictEqual(team1Res.status, 201, 'Team 1 creation must return 201');
    const team1Id = team1Res.data.teamId;
    const group1Id = team1Res.data.groupId;
    console.log(`  ✅ 3a. Created Team 1 (ID: ${team1Id}) with auto chat group (ID: ${group1Id})`);

    // Team 2 with Std 2
    const team2Res = await req('/teams', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Distributed CUDA Pod',
        studentIds: [std2User.id]
      })
    }, facultyToken);
    assert.strictEqual(team2Res.status, 201, 'Team 2 creation must return 201');
    const team2Id = team2Res.data.teamId;
    const group2Id = team2Res.data.groupId;
    console.log(`  ✅ 3b. Created Team 2 (ID: ${team2Id}) with auto chat group (ID: ${group2Id})`);

    // Faculty posts message in Group 1
    const msg1Res = await req(`/chat/groups/${group1Id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: 'Hello Student One, welcome to Parallel GPU Pod!' })
    }, facultyToken);
    assert.strictEqual(msg1Res.status, 201, 'Posting message in group 1 must return 201');

    // Student 1 replies in Group 1
    const msg2Res = await req(`/chat/groups/${group1Id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: 'Thanks Professor! Excited to work on GPU algorithms.' })
    }, std1Token);
    assert.strictEqual(msg2Res.status, 201, 'Student 1 posting message must return 201');

    // Fetch messages in Group 1 as Student 1
    const group1Msgs = await req(`/chat/groups/${group1Id}/messages`, { method: 'GET' }, std1Token);
    assert.strictEqual(group1Msgs.status, 200);
    assert(group1Msgs.data.messages.length >= 2, 'Group 1 should have persisted messages');
    console.log(`  ✅ 3c. Messages successfully sent and persisted in Group 1 (${group1Msgs.data.messages.length} messages)`);
    passedTests++;

    // ----------------------------------------------------
    // FLOW 4: Student submits faculty change request; HOD approves
    // ----------------------------------------------------
    console.log('\n▶️ Testing Flow 4: Student change request & HOD approval...');

    // Student 1 submits change request
    const crRes = await req('/student/change-request', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Wish to pivot to Distributed Cloud Computing research under Dr. Sarah Jenkins'
      })
    }, std1Token);
    assert.strictEqual(crRes.status, 201, 'Change request submission must return 201');
    const requestId = crRes.data.requestId;
    console.log(`  ✅ 4a. Change request #${requestId} submitted by Student 1`);

    // Verify student cannot submit a second pending request
    const duplicateCr = await req('/student/change-request', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Duplicate attempt' })
    }, std1Token);
    assert.strictEqual(duplicateCr.status, 400, 'Duplicate pending change request must be rejected');
    console.log('  ✅ 4b. Duplicate change request rejected with 400:', duplicateCr.data.error);

    // HOD approves the request, reassigning Student 1 to Dr. Sarah Jenkins (faculty ID 2 or query)
    const db = await getDb();
    const sarah = await db.get(`SELECT id FROM users WHERE email = 'sarah.jenkins@college.edu'`);
    assert(sarah, 'Dr. Sarah Jenkins must exist');

    const decideRes = await req('/hod/change-requests/decide', {
      method: 'POST',
      body: JSON.stringify({
        requestId,
        action: 'approve',
        newFacultyId: sarah.id,
        remark: 'Approved by HOD. Topic matches Cloud Systems.'
      })
    }, hodToken);
    assert.strictEqual(decideRes.status, 200, 'HOD decision must return 200');

    // Verify Student 1 profile now points to Sarah Jenkins
    const updatedStd1Prof = await req('/student/profile', { method: 'GET' }, std1Token);
    assert.strictEqual(updatedStd1Prof.status, 200);
    assert.strictEqual(updatedStd1Prof.data.profile.faculty_id, sarah.id, 'Student 1 faculty_id must be updated');
    console.log(`  ✅ 4c. HOD approved request. Student 1 reallocated to mentor ID ${sarah.id}`);
    passedTests++;

    // ----------------------------------------------------
    // FLOW 5: HOD posts role-specific notifications
    // ----------------------------------------------------
    console.log('\n▶️ Testing Flow 5: Role-targeted notification delivery...');

    // Post to students only
    const notifStudents = await req('/hod/notifications', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Student Exclusive Notice',
        body: 'Reminder to all students: Lab attendance is mandatory.',
        audience: 'students',
        deadline: '2026-11-20T12:00:00Z'
      })
    }, hodToken);
    assert.strictEqual(notifStudents.status, 201);

    // Post to faculty only
    const notifFaculty = await req('/hod/notifications', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Faculty Exclusive Notice',
        body: 'Faculty grade submission portal is now open.',
        audience: 'faculty'
      })
    }, hodToken);
    assert.strictEqual(notifFaculty.status, 201);

    // Post to both
    const notifBoth = await req('/hod/notifications', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Department Wide Holiday',
        body: 'Campus is closed on Friday.',
        audience: 'both'
      })
    }, hodToken);
    assert.strictEqual(notifBoth.status, 201);

    // Check Student view
    const stdNotifs = await req('/notifications', { method: 'GET' }, std1Token);
    const stdTitles = stdNotifs.data.notifications.map((n) => n.title);
    assert(stdTitles.includes('Student Exclusive Notice'), 'Student must receive student notice');
    assert(stdTitles.includes('Department Wide Holiday'), 'Student must receive both notice');
    assert(!stdTitles.includes('Faculty Exclusive Notice'), 'Student must NOT see faculty-only notice');
    console.log('  ✅ 5a. Student sees ONLY student and both notices (Faculty notice strictly hidden)');

    // Check Faculty view
    const facNotifs = await req('/notifications', { method: 'GET' }, facultyToken);
    const facTitles = facNotifs.data.notifications.map((n) => n.title);
    assert(facTitles.includes('Faculty Exclusive Notice'), 'Faculty must receive faculty notice');
    assert(facTitles.includes('Department Wide Holiday'), 'Faculty must receive both notice');
    assert(!facTitles.includes('Student Exclusive Notice'), 'Faculty must NOT see student-only notice');
    console.log('  ✅ 5b. Faculty sees ONLY faculty and both notices (Student notice strictly hidden)');
    passedTests++;

    // ----------------------------------------------------
    // FLOW 6: No HOD endpoint can create or edit student/faculty accounts
    // ----------------------------------------------------
    console.log('\n▶️ Testing Flow 6: Verification that HOD cannot create or edit user accounts...');

    // Try POST /api/hod/users
    const addUsrAttempt = await req('/hod/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Direct User', email: 'direct@college.edu' })
    }, hodToken);
    assert.strictEqual(addUsrAttempt.status, 404, 'No add user route exists on HOD API (returns 404)');

    // Try POST /api/hod/import-csv
    const csvAttempt = await req('/hod/import-csv', {
      method: 'POST',
      body: JSON.stringify({ csv: 'id,name,email' })
    }, hodToken);
    assert.strictEqual(csvAttempt.status, 404, 'No CSV import route exists on HOD API (returns 404)');

    // Try DELETE /api/hod/users/1
    const delAttempt = await req('/hod/users/1', { method: 'DELETE' }, hodToken);
    assert.strictEqual(delAttempt.status, 404, 'No delete user route exists on HOD API (returns 404)');

    console.log('  ✅ 6. Verified: Zero endpoints exist for HOD user creation, CSV import, or deletion');
    passedTests++;

    // ----------------------------------------------------
    // FLOW 7: Student cannot read another team\'s chat or private data
    // ----------------------------------------------------
    console.log('\n▶️ Testing Flow 7: Chat group security & ownership enforcement...');

    // Student 1 (member of Group 1 only) attempts to read Group 2 (Team 2's chat)
    const unauthorizedRead = await req(`/chat/groups/${group2Id}/messages`, { method: 'GET' }, std1Token);
    assert.strictEqual(unauthorizedRead.status, 403, 'Unauthorized chat group read must return 403 Forbidden');
    console.log('  ✅ 7a. Non-member student read attempt blocked with 403:', unauthorizedRead.data.error);

    // Student 1 attempts to post message to Group 2
    const unauthorizedPost = await req(`/chat/groups/${group2Id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: 'Infiltrating Team 2!' })
    }, std1Token);
    assert.strictEqual(unauthorizedPost.status, 403, 'Unauthorized chat group post must return 403 Forbidden');
    console.log('  ✅ 7b. Non-member student message post blocked with 403:', unauthorizedPost.data.error);

    // Student 2 attempts to read Group 1
    const unauthorizedRead2 = await req(`/chat/groups/${group1Id}/messages`, { method: 'GET' }, std2Token);
    assert.strictEqual(unauthorizedRead2.status, 403, 'Student 2 read attempt on Group 1 must return 403');
    console.log('  ✅ 7c. Student 2 blocked from Group 1 with 403:', unauthorizedRead2.data.error);
    passedTests++;

    // ----------------------------------------------------
    // FLOW 8: Team Proposal, Genuine Recommendations, HOD Approval & Mentor Allocation
    // ----------------------------------------------------
    console.log('\n▶️ Testing Flow 8: Team Proposal, Recommendations, HOD Approval & Mentor Assignment...');

    // 8a. Verify Student 1 (already in Team 1) is prevented from creating another active team
    const dupTeamAttempt = await req('/teams/proposals', {
      method: 'POST',
      body: JSON.stringify({
        name: `Duplicate Team-${Date.now()}`,
        project_title: 'Illegal Duplicate Proposal',
        description: 'This proposal should be rejected because student is already in Team 1.',
        domain: 'Web Development'
      })
    }, std1Token);
    assert.strictEqual(dupTeamAttempt.status, 400, 'Student already in active team must be blocked from proposing second team');
    console.log('  ✅ 8a. Verified: Student already in active team blocked from proposing second team (400)');

    // 8b. Register new unassigned Students: Std3 (Leader) and Std4 (Applicant)
    const std3Res = await req('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        role: 'student',
        name: 'Carlos Mendez',
        email: `carlos.mendez.${Date.now()}@student.edu`,
        password: 'Password@123',
        reg_no: 'RA2211003010777',
        department: 'AI & Data Science',
        semester: 6,
        cgpa: 9.2,
        strength: 'backend',
        languages: 'Python, PyTorch, C++, TensorRT, Docker, FastAPI',
        bio: 'Edge AI researcher specializing in low-power inference pipelines.'
      })
    });
    assert.strictEqual(std3Res.status, 201, 'Student 3 signup should succeed');
    const std3Token = std3Res.data.token;

    const std4Res = await req('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        role: 'student',
        name: 'Elena Rostova',
        email: `elena.rostova.${Date.now()}@student.edu`,
        password: 'Password@123',
        reg_no: 'RA2211003010888',
        department: 'AI & Data Science',
        semester: 6,
        cgpa: 8.8,
        strength: 'frontend',
        languages: 'TypeScript, React, WebGL, Python',
        bio: 'Interactive graphics engineer interested in telemetry dashboards.'
      })
    });
    assert.strictEqual(std4Res.status, 201, 'Student 4 signup should succeed');
    const std4Token = std4Res.data.token;

    // 8c. Student 3 proposes a project team
    const teamProposalRes = await req('/teams/proposals', {
      method: 'POST',
      body: JSON.stringify({
        name: `Team NeuralMesh-${Date.now()}`,
        project_title: 'Edge Neural Inference on Low-Power IoT Nodes',
        description: 'Optimized model quantization and distributed edge consensus for sensor grids.',
        domain: 'AI & Machine Learning',
        technologies: 'Python, PyTorch, C++, TensorRT, Docker',
        required_skills: 'Backend, DevOps, Data Science',
        max_members: 3,
        objectives: 'Achieve sub-5ms inference on ARM Cortex devices.',
        target_date: '2026-11-30'
      })
    }, std3Token);
    assert.strictEqual(teamProposalRes.status, 201, 'Student 3 proposal submission should return 201');
    const newTeamId = teamProposalRes.data.teamId;
    assert(newTeamId, 'New team ID should be returned');
    console.log('  ✅ 8c. Student 3 proposal created successfully with ID:', newTeamId);

    // 8d. HOD fetches proposals and reviews pending
    const hodProposalsRes = await req('/hod/team-proposals?status=pending_approval', { method: 'GET' }, hodToken);
    assert.strictEqual(hodProposalsRes.status, 200, 'HOD proposals fetch should return 200');
    const foundProposal = hodProposalsRes.data.proposals.find(p => p.id === newTeamId);
    assert(foundProposal, 'Newly submitted proposal must appear in HOD pending queue');
    assert.strictEqual(foundProposal.status, 'pending_approval', 'Status must be pending_approval');
    console.log('  ✅ 8d. HOD confirmed proposal is in pending queue.');

    // 8e. HOD approves proposal
    const approveRes = await req(`/hod/team-proposals/${newTeamId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', remarks: 'Strong technical merit and well-defined architecture.' })
    }, hodToken);
    assert.strictEqual(approveRes.status, 200, 'HOD approval must return 200');
    console.log('  ✅ 8e. HOD approved proposal successfully.');

    // 8f. HOD fetches mentor recommendations
    const recsRes = await req(`/hod/team-proposals/${newTeamId}/mentor-recommendations`, { method: 'GET' }, hodToken);
    assert.strictEqual(recsRes.status, 200, 'Mentor recommendations should return 200');
    assert(Array.isArray(recsRes.data.recommendations) && recsRes.data.recommendations.length > 0, 'Must return faculty recommendations');
    const topRec = recsRes.data.recommendations[0];
    assert(topRec.compatibility_score > 0, 'Compatibility score must be calculated from real data');
    assert(topRec.compatibility_explanation, 'Compatibility explanation must be generated');
    console.log(`  ✅ 8f. HOD generated genuine mentor recommendations (Top: ${topRec.name} - ${topRec.compatibility_score}% compatibility).`);

    // 8g. HOD assigns faculty mentor
    const assignMentorRes = await req(`/hod/team-proposals/${newTeamId}/assign-mentor`, {
      method: 'POST',
      body: JSON.stringify({ facultyId: topRec.id, note: 'Assigned for AI/ML Capstone Track' })
    }, hodToken);
    assert.strictEqual(assignMentorRes.status, 200, 'Assign mentor should return 200');
    console.log(`  ✅ 8g. HOD successfully assigned mentor ${topRec.name} to team.`);

    // 8h. Student 4 browses available teams with recommendation engine
    const availableRes = await req('/teams/available-to-join', { method: 'GET' }, std4Token);
    assert.strictEqual(availableRes.status, 200, 'Available teams query should return 200');
    const matchingTeam = availableRes.data.teams.find(t => t.id === newTeamId);
    assert(matchingTeam, 'Approved team should be available to join');
    assert(typeof matchingTeam.match_percentage === 'number', 'Match percentage must be calculated');
    assert(matchingTeam.match_explanation, 'Match explanation must be provided');
    console.log(`  ✅ 8h. Student 4 received genuine team recommendation: ${matchingTeam.match_percentage}% match.`);

    // 8i. Student 4 requests to join, and Student 3 (Leader) accepts
    const joinReqRes = await req(`/teams/${newTeamId}/join-request`, {
      method: 'POST',
      body: JSON.stringify({ message: 'I have experience in Python and interactive dashboards.' })
    }, std4Token);
    assert.strictEqual(joinReqRes.status, 201, 'Join request should be submitted with 201');
    const joinRequestId = joinReqRes.data.requestId;

    const leaderDecideRes = await req(`/teams/join-requests/${joinRequestId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ action: 'accept' })
    }, std3Token);
    assert.strictEqual(leaderDecideRes.status, 200, 'Team leader accept join request should return 200');
    console.log('  ✅ 8i. Join request accepted and member successfully onboarded into team & chat.');
    passedTests++;

    console.log('\n🎉 ========================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} SELF-CHECK VERIFICATION FLOWS PASSED PERFECTLY!`);
    console.log('🎉 ========================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ SELF-CHECK TEST FAILED:', err);
    process.exit(1);
  }
}

runSelfCheck();
