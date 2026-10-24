import express from 'express';
import { getDb } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { sanitizeString } from '../utils/validators.js';
import { createSystemNotification } from './notifications.routes.js';
import { calculateStudentTeamMatch } from '../utils/recommendations.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * 1. Get Teams
 * - For Faculty: Returns all teams mentored by this faculty
 * - For Student: Returns only teams where this student is a member
 * - For HOD: Can see all teams with faculty and member counts
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const user = req.user;

    let teamsQuery = '';
    let params = [];

    if (user.role === 'faculty') {
      teamsQuery = `
        SELECT t.*, u.name as faculty_name, u.avatar as faculty_avatar,
               l.name as leader_name,
               (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
               cg.id as chat_group_id
        FROM teams t
        LEFT JOIN users u ON t.faculty_id = u.id
        LEFT JOIN users l ON t.leader_id = l.id
        LEFT JOIN chat_groups cg ON t.id = cg.team_id
        WHERE t.faculty_id = ?
        ORDER BY t.created_at DESC
      `;
      params = [user.id];
    } else if (user.role === 'student') {
      teamsQuery = `
        SELECT t.*, u.name as faculty_name, u.avatar as faculty_avatar,
               l.name as leader_name,
               (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
               cg.id as chat_group_id
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        LEFT JOIN users u ON t.faculty_id = u.id
        LEFT JOIN users l ON t.leader_id = l.id
        LEFT JOIN chat_groups cg ON t.id = cg.team_id
        WHERE tm.student_id = ?
        ORDER BY t.created_at DESC
      `;
      params = [user.id];
    } else if (user.role === 'hod') {
      teamsQuery = `
        SELECT t.*, u.name as faculty_name, u.avatar as faculty_avatar,
               l.name as leader_name,
               (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
               cg.id as chat_group_id
        FROM teams t
        LEFT JOIN users u ON t.faculty_id = u.id
        LEFT JOIN users l ON t.leader_id = l.id
        LEFT JOIN chat_groups cg ON t.id = cg.team_id
        ORDER BY t.created_at DESC
      `;
      params = [];
    }

    const teams = await db.all(teamsQuery, params);

    // Fetch members for each team
    for (const team of teams) {
      const members = await db.all(
        `SELECT u.id, u.name, u.email, u.avatar, tm.role as team_role,
                sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department
         FROM team_members tm
         JOIN users u ON tm.student_id = u.id
         LEFT JOIN student_profiles sp ON u.id = sp.user_id
         WHERE tm.team_id = ?`,
        [team.id]
      );
      team.members = members;

      // Also fetch associated projects
      const projects = await db.all(
        `SELECT * FROM projects WHERE team_id = ?`,
        [team.id]
      );
      team.projects = projects;
    }

    return res.json({ teams });
  } catch (error) {
    console.error('Get teams error:', error);
    return res.status(500).json({ error: 'Failed to retrieve teams.' });
  }
});

/**
 * 2. Student: Get My Team Details & Pending Requests
 */
router.get('/my-team', requireRole('student'), async (req, res) => {
  try {
    const db = await getDb();
    const studentId = req.user.id;

    // Check if student belongs to any team
    const team = await db.get(
      `SELECT t.*, tm.role as my_role, u.name as faculty_name, u.email as faculty_email,
              u.avatar as faculty_avatar, fp.designation as faculty_designation,
              fp.department as faculty_department, fp.subjects as faculty_subjects,
              cg.id as chat_group_id
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       LEFT JOIN users u ON t.faculty_id = u.id
       LEFT JOIN faculty_profiles fp ON u.id = fp.user_id
       LEFT JOIN chat_groups cg ON t.id = cg.team_id
       WHERE tm.student_id = ?
       ORDER BY t.created_at DESC
       LIMIT 1`,
      [studentId]
    );

    let members = [];
    let incomingRequests = [];
    if (team) {
      members = await db.all(
        `SELECT u.id, u.name, u.email, u.avatar, tm.role as team_role, tm.joined_at,
                sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department
         FROM team_members tm
         JOIN users u ON tm.student_id = u.id
         LEFT JOIN student_profiles sp ON u.id = sp.user_id
         WHERE tm.team_id = ?
         ORDER BY (CASE WHEN tm.role = 'leader' THEN 0 ELSE 1 END), u.name ASC`,
        [team.id]
      );

      // If user is team leader, fetch incoming join requests
      if (team.leader_id === studentId || team.my_role === 'leader') {
        incomingRequests = await db.all(
          `SELECT jr.*, u.name as student_name, u.email as student_email, u.avatar as student_avatar,
                  sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department, sp.bio
           FROM team_join_requests jr
           JOIN users u ON jr.student_id = u.id
           LEFT JOIN student_profiles sp ON u.id = sp.user_id
           WHERE jr.team_id = ?
           ORDER BY jr.created_at DESC`,
          [team.id]
        );
      }
    }

    // Also fetch outgoing join requests made by this student
    const outgoingRequests = await db.all(
      `SELECT jr.*, t.name as team_name, t.project_title, t.domain, t.status as team_status,
              l.name as leader_name
       FROM team_join_requests jr
       JOIN teams t ON jr.team_id = t.id
       LEFT JOIN users l ON t.leader_id = l.id
       WHERE jr.student_id = ?
       ORDER BY jr.created_at DESC`,
      [studentId]
    );

    return res.json({
      team: team ? { ...team, members } : null,
      incomingRequests,
      outgoingRequests
    });
  } catch (error) {
    console.error('Get my-team error:', error);
    return res.status(500).json({ error: 'Failed to retrieve team status.' });
  }
});

/**
 * 3. Student: Create a Project Team Proposal
 * Sets status to 'pending_approval' for HOD review. Auto-creates team chat group.
 */
router.post('/proposals', requireRole('student'), async (req, res) => {
  try {
    const {
      name,
      project_title,
      description,
      domain,
      technologies,
      required_skills,
      max_members = 4,
      objectives,
      target_date,
      invitedStudentIds = []
    } = req.body;

    const studentId = req.user.id;
    const db = await getDb();

    // Validations
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Team name is required.' });
    }
    if (!project_title || typeof project_title !== 'string' || project_title.trim().length === 0) {
      return res.status(400).json({ error: 'Project title is required.' });
    }
    if (!description || typeof description !== 'string' || description.trim().length < 15) {
      return res.status(400).json({ error: 'Project description and problem statement must be at least 15 characters.' });
    }
    if (!domain || typeof domain !== 'string' || domain.trim().length === 0) {
      return res.status(400).json({ error: 'Project domain / category is required.' });
    }

    // Check if student already belongs to an active team
    const existingTeam = await db.get(
      `SELECT t.id, t.name, t.status
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.student_id = ? AND t.status IN ('pending_approval', 'approved', 'modification_requested')`,
      [studentId]
    );

    if (existingTeam) {
      return res.status(400).json({
        error: `You already belong to an active team proposal ("${existingTeam.name}" - Status: ${existingTeam.status}). Students can only belong to one active capstone team at a time.`
      });
    }

    // Check team name uniqueness among active teams
    const nameCheck = await db.get(
      `SELECT id FROM teams WHERE LOWER(name) = LOWER(?) AND status IN ('pending_approval', 'approved')`,
      [name.trim()]
    );
    if (nameCheck) {
      return res.status(400).json({ error: 'A team with this name already exists. Please choose a unique team name.' });
    }

    const cleanName = sanitizeString(name);
    const cleanTitle = sanitizeString(project_title);
    const cleanDesc = sanitizeString(description);
    const cleanDomain = sanitizeString(domain);
    const cleanTech = Array.isArray(technologies) ? technologies.join(', ') : sanitizeString(technologies || '');
    const cleanSkills = Array.isArray(required_skills) ? required_skills.join(', ') : sanitizeString(required_skills || '');
    const cleanObjectives = sanitizeString(objectives || '');
    const cleanTargetDate = target_date ? sanitizeString(target_date) : '';
    const teamSize = Math.max(2, Math.min(6, parseInt(max_members, 10) || 4));

    // 1. Create Team record with status 'pending_approval' and NO faculty yet
    const teamResult = await db.run(
      `INSERT INTO teams (
        name, faculty_id, leader_id, created_by, project_title, description, domain,
        technologies, required_skills, max_members, objectives, target_date, status,
        is_accepting_members
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', 1)`,
      [
        cleanName,
        studentId,
        studentId,
        cleanTitle,
        cleanDesc,
        cleanDomain,
        cleanTech,
        cleanSkills,
        teamSize,
        cleanObjectives,
        cleanTargetDate
      ]
    );
    const teamId = teamResult.lastID;

    // 2. Add creator as team leader in team_members
    await db.run(
      `INSERT INTO team_members (team_id, student_id, role, joined_at)
       VALUES (?, ?, 'leader', CURRENT_TIMESTAMP)`,
      [teamId, studentId]
    );

    // 3. Process invited teammates if valid students
    if (Array.isArray(invitedStudentIds) && invitedStudentIds.length > 0) {
      for (const invId of invitedStudentIds) {
        if (invId === studentId) continue;
        const validStudent = await db.get(`SELECT id FROM users WHERE id = ? AND role = 'student'`, [invId]);
        if (validStudent) {
          // Check if invited student is already in a team
          const isBusy = await db.get(
            `SELECT t.id FROM teams t JOIN team_members tm ON t.id = tm.team_id WHERE tm.student_id = ? AND t.status IN ('pending_approval', 'approved')`,
            [invId]
          );
          if (!isBusy) {
            await db.run(
              `INSERT OR IGNORE INTO team_members (team_id, student_id, role, joined_at)
               VALUES (?, ?, 'member', CURRENT_TIMESTAMP)`,
              [teamId, invId]
            );
          }
        }
      }
    }

    // 4. Auto-create Team Chat Group (student team channel)
    const chatGroupResult = await db.run(
      `INSERT INTO chat_groups (name, team_id, faculty_id, created_by)
       VALUES (?, ?, NULL, ?)`,
      [`Team: ${cleanName}`, teamId, studentId]
    );
    const groupId = chatGroupResult.lastID;

    // Add leader and any invited members to chat group
    await db.run(
      `INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)`,
      [groupId, studentId]
    );

    if (Array.isArray(invitedStudentIds)) {
      for (const invId of invitedStudentIds) {
        if (invId !== studentId) {
          await db.run(
            `INSERT OR IGNORE INTO chat_group_members (group_id, user_id) VALUES (?, ?)`,
            [groupId, invId]
          );
        }
      }
    }

    // Initial chat message
    await db.run(
      `INSERT INTO messages (group_id, sender_id, body)
       VALUES (?, ?, ?)`,
      [groupId, studentId, `Team workspace initialized for "${cleanName}". Proposal submitted to HOD for approval.`]
    );

    // 5. Send Notification to HOD and Log audit
    const io = req.app.get('io');
    const hod = await db.get(`SELECT id FROM users WHERE role = 'hod' LIMIT 1`);
    if (hod) {
      await createSystemNotification(db, io, {
        title: 'New Team Proposal Submitted',
        body: `Student ${req.user.name} submitted a project proposal for "${cleanName}" (${cleanDomain}).`,
        audience: 'user',
        postedBy: studentId,
        targetUserId: hod.id
      });
    }

    // Notify student confirmation
    await createSystemNotification(db, io, {
      title: 'Proposal Submitted for HOD Review',
      body: `Your project proposal for "${cleanName}" has been received and is currently Pending HOD Approval.`,
      audience: 'user',
      postedBy: studentId,
      targetUserId: studentId
    });

    return res.status(201).json({
      message: 'Project team proposal created successfully and submitted to HOD for approval.',
      teamId,
      groupId
    });
  } catch (error) {
    console.error('Create team proposal error:', error);
    return res.status(500).json({ error: 'Failed to submit team proposal.' });
  }
});

/**
 * 4. Student: Browse Available Teams to Join with Genuine Recommendation Engine
 */
router.get('/available-to-join', requireRole('student'), async (req, res) => {
  try {
    const db = await getDb();
    const studentId = req.user.id;

    // 1. Fetch student's profile for recommendation matching
    const student = await db.get(
      `SELECT u.id, u.name, sp.*
       FROM users u
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       WHERE u.id = ?`,
      [studentId]
    );

    // Count student's active teams
    const activeTeamCountRow = await db.get(
      `SELECT COUNT(*) as count
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.student_id = ? AND t.status IN ('pending_approval', 'approved')`,
      [studentId]
    );
    const studentActiveTeamsCount = activeTeamCountRow ? activeTeamCountRow.count : 0;

    // 2. Fetch approved teams accepting members where student is NOT yet a member
    const teams = await db.all(
      `SELECT t.*, u.name as faculty_name, u.avatar as faculty_avatar,
              l.name as leader_name, l.avatar as leader_avatar,
              (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
       FROM teams t
       LEFT JOIN users u ON t.faculty_id = u.id
       LEFT JOIN users l ON t.leader_id = l.id
       WHERE t.status = 'approved'
         AND t.is_accepting_members = 1
         AND t.id NOT IN (SELECT team_id FROM team_members WHERE student_id = ?)
       ORDER BY t.created_at DESC`,
      [studentId]
    );

    // 3. For each team, fetch members and calculate genuine recommendation score
    const recommendedTeams = [];
    for (const team of teams) {
      // Exclude full teams
      if (team.member_count >= team.max_members) continue;

      const members = await db.all(
        `SELECT u.id, u.name, u.avatar, tm.role as team_role,
                sp.strength, sp.languages, sp.department
         FROM team_members tm
         JOIN users u ON tm.student_id = u.id
         LEFT JOIN student_profiles sp ON u.id = sp.user_id
         WHERE tm.team_id = ?`,
        [team.id]
      );
      team.members = members;

      // Check if student has pending join request
      const pendingRequest = await db.get(
        `SELECT id, status, created_at FROM team_join_requests
         WHERE team_id = ? AND student_id = ? AND status = 'pending'`,
        [team.id, studentId]
      );
      team.has_pending_request = !!pendingRequest;
      team.pending_request = pendingRequest || null;

      // Calculate Genuine Match Percentage
      const matchResult = calculateStudentTeamMatch({
        student,
        team,
        teamMembers: members,
        studentActiveTeamsCount
      });

      team.match_percentage = matchResult.score;
      team.match_explanation = matchResult.explanation;
      team.match_breakdown = {
        skillScore: matchResult.skillScore,
        techScore: matchResult.techScore,
        domainScore: matchResult.domainScore,
        availabilityScore: matchResult.availabilityScore,
        complementaryScore: matchResult.complementaryScore
      };

      recommendedTeams.push(team);
    }

    // Sort descending by match percentage
    recommendedTeams.sort((a, b) => b.match_percentage - a.match_percentage);

    return res.json({
      teams: recommendedTeams,
      studentProfileComplete: !!(student?.languages && student?.languages.trim().length > 0)
    });
  } catch (error) {
    console.error('Available teams error:', error);
    return res.status(500).json({ error: 'Failed to retrieve available teams.' });
  }
});

/**
 * 5. Student: Request to Join a Team
 */
router.post('/:teamId/join-request', requireRole('student'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { message = '' } = req.body;
    const studentId = req.user.id;
    const db = await getDb();

    // Check if team exists and is accepting members
    const team = await db.get(
      `SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as current_members
       FROM teams t WHERE t.id = ?`,
      [teamId]
    );

    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }

    if (team.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved teams can accept new members.' });
    }

    if (!team.is_accepting_members) {
      return res.status(400).json({ error: 'This team is currently closed to new members.' });
    }

    if (team.current_members >= team.max_members) {
      return res.status(400).json({ error: 'This team has already reached its maximum capacity.' });
    }

    // Check if student is already in this team
    const isMember = await db.get(
      `SELECT * FROM team_members WHERE team_id = ? AND student_id = ?`,
      [teamId, studentId]
    );
    if (isMember) {
      return res.status(400).json({ error: 'You are already a member of this team.' });
    }

    // Check if student belongs to another active team
    const inOtherTeam = await db.get(
      `SELECT t.name FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.student_id = ? AND t.status IN ('pending_approval', 'approved')`,
      [studentId]
    );
    if (inOtherTeam) {
      return res.status(400).json({
        error: `You are already a member of active team "${inOtherTeam.name}". Students can only be part of one capstone team.`
      });
    }

    // Check for duplicate pending join request
    const existingReq = await db.get(
      `SELECT id FROM team_join_requests WHERE team_id = ? AND student_id = ? AND status = 'pending'`,
      [teamId, studentId]
    );
    if (existingReq) {
      return res.status(400).json({ error: 'You already have an active pending join request for this team.' });
    }

    // Insert join request
    const cleanMsg = sanitizeString(message || 'I would like to join your project team.');
    const result = await db.run(
      `INSERT INTO team_join_requests (team_id, student_id, message, status)
       VALUES (?, ?, ?, 'pending')`,
      [teamId, studentId, cleanMsg]
    );

    // Notify Team Leader
    const io = req.app.get('io');
    if (team.leader_id) {
      await createSystemNotification(db, io, {
        title: 'New Team Join Request',
        body: `${req.user.name} sent a request to join your team "${team.name}".`,
        audience: 'user',
        postedBy: studentId,
        targetUserId: team.leader_id
      });
    }

    return res.status(201).json({
      message: 'Join request submitted to team leader successfully.',
      requestId: result.lastID
    });
  } catch (error) {
    console.error('Submit join request error:', error);
    return res.status(500).json({ error: 'Failed to submit join request.' });
  }
});

/**
 * 6. Team Leader: Decide Join Request (Accept or Reject)
 */
router.post('/join-requests/:requestId/decide', requireRole('student'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const studentId = req.user.id;
    const db = await getDb();

    if (action !== 'accept' && action !== 'reject') {
      return res.status(400).json({ error: 'Action must be "accept" or "reject".' });
    }

    // Retrieve join request and team
    const request = await db.get(
      `SELECT jr.*, t.name as team_name, t.leader_id, t.max_members,
              (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as current_members
       FROM team_join_requests jr
       JOIN teams t ON jr.team_id = t.id
       WHERE jr.id = ?`,
      [requestId]
    );

    if (!request) {
      return res.status(404).json({ error: 'Join request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `This request has already been ${request.status}.` });
    }

    // Verify current user is team leader
    if (request.leader_id !== studentId) {
      return res.status(403).json({ error: 'Only the team leader can accept or reject join requests.' });
    }

    const io = req.app.get('io');

    if (action === 'accept') {
      // Verify capacity
      if (request.current_members >= request.max_members) {
        return res.status(400).json({ error: 'Team is already at maximum capacity.' });
      }

      // Check if applicant has joined another team in the meantime
      const inOther = await db.get(
        `SELECT t.name FROM teams t
         JOIN team_members tm ON t.id = tm.team_id
         WHERE tm.student_id = ? AND t.status IN ('pending_approval', 'approved')`,
        [request.student_id]
      );
      if (inOther) {
        await db.run(
          `UPDATE team_join_requests SET status = 'rejected', decided_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [requestId]
        );
        return res.status(400).json({ error: 'This applicant has already joined another team.' });
      }

      // 1. Add student to team_members
      await db.run(
        `INSERT INTO team_members (team_id, student_id, role, joined_at)
         VALUES (?, ?, 'member', CURRENT_TIMESTAMP)`,
        [request.team_id, request.student_id]
      );

      // 2. Add student to team chat group
      const chatGroup = await db.get(`SELECT id FROM chat_groups WHERE team_id = ?`, [request.team_id]);
      if (chatGroup) {
        await db.run(
          `INSERT OR IGNORE INTO chat_group_members (group_id, user_id) VALUES (?, ?)`,
          [chatGroup.id, request.student_id]
        );
        // Post welcome message in chat
        const newMember = await db.get(`SELECT name FROM users WHERE id = ?`, [request.student_id]);
        await db.run(
          `INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)`,
          [chatGroup.id, studentId, `${newMember?.name || 'A new member'} has joined the team!`]
        );
      }

      // 3. Update team capacity status if filled
      if (request.current_members + 1 >= request.max_members) {
        await db.run(`UPDATE teams SET is_accepting_members = 0 WHERE id = ?`, [request.team_id]);
      }

      // 4. Update request status
      await db.run(
        `UPDATE team_join_requests SET status = 'accepted', decided_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [requestId]
      );

      // 5. Notify applicant
      await createSystemNotification(db, io, {
        title: 'Team Join Request Accepted! 🎉',
        body: `Congratulations! Your request to join team "${request.team_name}" was accepted by the team leader.`,
        audience: 'user',
        postedBy: studentId,
        targetUserId: request.student_id
      });

      return res.json({ message: 'Join request accepted and student added to team.' });
    } else {
      // Reject request
      await db.run(
        `UPDATE team_join_requests SET status = 'rejected', decided_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [requestId]
      );

      await createSystemNotification(db, io, {
        title: 'Team Join Request Update',
        body: `Your request to join team "${request.team_name}" was not accepted. You may explore other available teams.`,
        audience: 'user',
        postedBy: studentId,
        targetUserId: request.student_id
      });

      return res.json({ message: 'Join request rejected.' });
    }
  } catch (error) {
    console.error('Decide join request error:', error);
    return res.status(500).json({ error: 'Failed to process join request decision.' });
  }
});

/**
 * 7. Team Leader: Toggle Team Membership Status (Open / Closed)
 */
router.put('/:teamId/toggle-recruiting', requireRole('student'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const studentId = req.user.id;
    const db = await getDb();

    const team = await db.get(`SELECT * FROM teams WHERE id = ? AND leader_id = ?`, [teamId, studentId]);
    if (!team) {
      return res.status(403).json({ error: 'Only the team leader can modify team settings.' });
    }

    const nextState = team.is_accepting_members ? 0 : 1;
    await db.run(`UPDATE teams SET is_accepting_members = ? WHERE id = ?`, [nextState, teamId]);

    return res.json({
      message: `Team is now ${nextState ? 'open for new members' : 'closed for recruitment'}.`,
      is_accepting_members: nextState
    });
  } catch (error) {
    console.error('Toggle recruiting error:', error);
    return res.status(500).json({ error: 'Failed to update recruitment status.' });
  }
});

/**
 * 8. Create a Team (FACULTY ONLY) — Preserved for faculty backwards compatibility
 */
router.post('/', requireRole('faculty'), async (req, res) => {
  try {
    const { name, studentIds } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Team name is required.' });
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one assigned student for the team.' });
    }

    const db = await getDb();
    const facultyId = req.user.id;

    for (const studentId of studentIds) {
      const student = await db.get(
        `SELECT user_id FROM student_profiles WHERE user_id = ? AND faculty_id = ?`,
        [studentId, facultyId]
      );
      if (!student) {
        return res.status(403).json({
          error: `Student ID ${studentId} is not assigned to your guidance. Teams can only be formed from your assigned students.`
        });
      }
    }

    const cleanName = sanitizeString(name);

    const teamResult = await db.run(
      `INSERT INTO teams (name, faculty_id, leader_id, created_by, status, is_accepting_members)
       VALUES (?, ?, ?, ?, 'approved', 0)`,
      [cleanName, facultyId, studentIds[0], facultyId]
    );
    const teamId = teamResult.lastID;

    let isFirst = true;
    for (const studentId of studentIds) {
      await db.run(
        `INSERT INTO team_members (team_id, student_id, role)
         VALUES (?, ?, ?)`,
        [teamId, studentId, isFirst ? 'leader' : 'member']
      );
      isFirst = false;
    }

    const chatGroupResult = await db.run(
      `INSERT INTO chat_groups (name, team_id, faculty_id, created_by)
       VALUES (?, ?, ?, ?)`,
      [`Team: ${cleanName}`, teamId, facultyId, facultyId]
    );
    const groupId = chatGroupResult.lastID;

    await db.run(
      `INSERT INTO chat_group_members (group_id, user_id)
       VALUES (?, ?)`,
      [groupId, facultyId]
    );

    for (const studentId of studentIds) {
      await db.run(
        `INSERT INTO chat_group_members (group_id, user_id)
         VALUES (?, ?)`,
        [groupId, studentId]
      );
    }

    await db.run(
      `INSERT INTO messages (group_id, sender_id, body)
       VALUES (?, ?, ?)`,
      [groupId, facultyId, `Welcome to the team workspace for ${cleanName}! Use this chat for project discussions and updates.`]
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('team_created', {
        teamId,
        name: cleanName,
        facultyId,
        studentIds,
        groupId
      });
    }

    return res.status(201).json({
      message: 'Team and project group chat created successfully.',
      teamId,
      groupId
    });
  } catch (error) {
    console.error('Create team error:', error);
    return res.status(500).json({ error: 'Failed to create team.' });
  }
});

/**
 * 9. Add Members to Team (FACULTY ONLY, Owner only)
 */
router.post('/:teamId/members', requireRole('faculty'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { studentId } = req.body;
    const db = await getDb();
    const facultyId = req.user.id;

    const team = await db.get(
      `SELECT * FROM teams WHERE id = ? AND faculty_id = ?`,
      [teamId, facultyId]
    );
    if (!team) {
      return res.status(403).json({ error: 'Team not found or you are not the mentor faculty.' });
    }

    const student = await db.get(
      `SELECT user_id FROM student_profiles WHERE user_id = ? AND faculty_id = ?`,
      [studentId, facultyId]
    );
    if (!student) {
      return res.status(403).json({ error: 'Student is not assigned to your guidance.' });
    }

    await db.run(
      `INSERT OR IGNORE INTO team_members (team_id, student_id, role)
       VALUES (?, ?, 'member')`,
      [teamId, studentId]
    );

    const chatGroup = await db.get(`SELECT id FROM chat_groups WHERE team_id = ?`, [teamId]);
    if (chatGroup) {
      await db.run(
        `INSERT OR IGNORE INTO chat_group_members (group_id, user_id)
         VALUES (?, ?)`,
        [chatGroup.id, studentId]
      );
    }

    return res.json({ message: 'Member added to team and chat group successfully.' });
  } catch (error) {
    console.error('Add team member error:', error);
    return res.status(500).json({ error: 'Failed to add member to team.' });
  }
});

/**
 * 10. Remove Member from Team (FACULTY ONLY, Owner only)
 */
router.delete('/:teamId/members/:studentId', requireRole('faculty'), async (req, res) => {
  try {
    const { teamId, studentId } = req.params;
    const db = await getDb();
    const facultyId = req.user.id;

    const team = await db.get(
      `SELECT * FROM teams WHERE id = ? AND faculty_id = ?`,
      [teamId, facultyId]
    );
    if (!team) {
      return res.status(403).json({ error: 'Team not found or you are not the mentor faculty.' });
    }

    await db.run(
      `DELETE FROM team_members WHERE team_id = ? AND student_id = ?`,
      [teamId, studentId]
    );

    const chatGroup = await db.get(`SELECT id FROM chat_groups WHERE team_id = ?`, [teamId]);
    if (chatGroup) {
      await db.run(
        `DELETE FROM chat_group_members WHERE group_id = ? AND user_id = ?`,
        [chatGroup.id, studentId]
      );
    }

    return res.json({ message: 'Member removed from team and chat group.' });
  } catch (error) {
    console.error('Remove team member error:', error);
    return res.status(500).json({ error: 'Failed to remove member from team.' });
  }
});

export default router;
