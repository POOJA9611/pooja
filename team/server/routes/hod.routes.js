import express from 'express';
import { getDb } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { sanitizeString, validateAudience } from '../utils/validators.js';
import { createSystemNotification } from './notifications.routes.js';

const router = express.Router();

// Enforce HOD role across all routes in this router
router.use(authenticateToken, requireRole('hod'));

/**
 * 1. Dashboard Metrics
 * Counts: students, faculty, unassigned students, pending change requests
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const db = await getDb();

    const studentCountRow = await db.get(
      `SELECT COUNT(*) as count FROM users WHERE role = 'student'`
    );
    const facultyCountRow = await db.get(
      `SELECT COUNT(*) as count FROM users WHERE role = 'faculty'`
    );
    const unassignedCountRow = await db.get(
      `SELECT COUNT(*) as count FROM student_profiles WHERE faculty_id IS NULL`
    );
    const pendingRequestsCountRow = await db.get(
      `SELECT COUNT(*) as count FROM change_requests WHERE status = 'pending'`
    );
    const totalTeamsCountRow = await db.get(
      `SELECT COUNT(*) as count FROM teams`
    );
    const totalProjectsCountRow = await db.get(
      `SELECT COUNT(*) as count FROM projects`
    );

    return res.json({
      totalStudents: studentCountRow.count,
      totalFaculty: facultyCountRow.count,
      unassignedStudents: unassignedCountRow.count,
      pendingChangeRequests: pendingRequestsCountRow.count,
      totalTeams: totalTeamsCountRow.count,
      totalProjects: totalProjectsCountRow.count
    });
  } catch (error) {
    console.error('HOD stats error:', error);
    return res.status(500).json({ error: 'Failed to retrieve dashboard statistics.' });
  }
});

/**
 * 2. View-only Directory: Registered Students
 * Strictly VIEW-ONLY. No create, edit, or delete endpoints.
 */
router.get('/directory/students', async (req, res) => {
  try {
    const db = await getDb();
    const students = await db.all(
      `SELECT u.id, u.name, u.email, u.avatar, u.created_at,
              sp.reg_no, sp.department, sp.semester, sp.cgpa, sp.bio,
              sp.strength, sp.languages, sp.linkedin_url, sp.github_url,
              sp.faculty_id, f.name as faculty_name, f.email as faculty_email
       FROM users u
       JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN users f ON sp.faculty_id = f.id
       WHERE u.role = 'student'
       ORDER BY u.name ASC`
    );

    return res.json({ students });
  } catch (error) {
    console.error('HOD student directory error:', error);
    return res.status(500).json({ error: 'Failed to retrieve student directory.' });
  }
});

/**
 * 3. View-only Directory: Registered Faculty
 * Includes workload (number of assigned students), subjects, and languages.
 */
router.get('/directory/faculty', async (req, res) => {
  try {
    const db = await getDb();
    const faculty = await db.all(
      `SELECT u.id, u.name, u.email, u.avatar, u.created_at,
              fp.designation, fp.department, fp.bio, fp.subjects, fp.languages, fp.linkedin_url,
              (SELECT COUNT(*) FROM student_profiles WHERE faculty_id = u.id) as workload
       FROM users u
       JOIN faculty_profiles fp ON u.id = fp.user_id
       WHERE u.role = 'faculty'
       ORDER BY workload ASC, u.name ASC`
    );

    return res.json({ faculty });
  } catch (error) {
    console.error('HOD faculty directory error:', error);
    return res.status(500).json({ error: 'Failed to retrieve faculty directory.' });
  }
});

/**
 * 4. Assign / Reassign Students (Single and Bulk)
 * Body: { studentIds: [1, 2], facultyId: 3, note: "Assigned for IoT guidance" }
 * Logs every change in faculty_assignments and sends notifications.
 */
router.post('/assign-students', async (req, res) => {
  try {
    const { studentIds, facultyId, note } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'At least one student must be selected.' });
    }

    if (!facultyId) {
      return res.status(400).json({ error: 'A destination faculty must be specified.' });
    }

    const db = await getDb();

    // Verify faculty exists
    const faculty = await db.get(
      `SELECT id, name, email FROM users WHERE id = ? AND role = 'faculty'`,
      [facultyId]
    );

    if (!faculty) {
      return res.status(404).json({ error: 'Target faculty member not found.' });
    }

    const cleanNote = note ? sanitizeString(note) : 'Assigned by HOD';
    const assignedBy = req.user.id;

    const updatedStudents = [];

    for (const sId of studentIds) {
      const student = await db.get(
        `SELECT u.id, u.name, u.email, sp.faculty_id
         FROM users u
         JOIN student_profiles sp ON u.id = sp.user_id
         WHERE u.id = ? AND u.role = 'student'`,
        [sId]
      );

      if (!student) continue;

      const previousFacultyId = student.faculty_id;

      // Update student profile
      await db.run(
        `UPDATE student_profiles SET faculty_id = ? WHERE user_id = ?`,
        [facultyId, sId]
      );

      // Log to faculty_assignments
      await db.run(
        `INSERT INTO faculty_assignments (student_id, faculty_id, assigned_by, note)
         VALUES (?, ?, ?, ?)`,
        [sId, facultyId, assignedBy, cleanNote]
      );

      updatedStudents.push({
        id: student.id,
        name: student.name,
        previousFacultyId,
        newFacultyId: facultyId
      });
    }

    // Emit socket event if io is attached to app
    const io = req.app.get('io');
    if (io) {
      io.emit('assignments_updated', {
        facultyId,
        facultyName: faculty.name,
        assignedCount: updatedStudents.length
      });
    }

    return res.json({
      message: `Successfully assigned ${updatedStudents.length} student(s) to ${faculty.name}.`,
      updatedStudents
    });
  } catch (error) {
    console.error('Assign students error:', error);
    return res.status(500).json({ error: 'Failed to complete faculty assignment.' });
  }
});

/**
 * 5. Assignment History Log
 */
router.get('/assignments-history', async (req, res) => {
  try {
    const db = await getDb();
    const history = await db.all(
      `SELECT fa.id, fa.assigned_at, fa.note,
              s.name as student_name, s.email as student_email,
              f.name as faculty_name, f.email as faculty_email,
              a.name as assigned_by_name
       FROM faculty_assignments fa
       JOIN users s ON fa.student_id = s.id
       JOIN users f ON fa.faculty_id = f.id
       JOIN users a ON fa.assigned_by = a.id
       ORDER BY fa.assigned_at DESC
       LIMIT 100`
    );

    return res.json({ history });
  } catch (error) {
    console.error('Assignments history error:', error);
    return res.status(500).json({ error: 'Failed to retrieve assignment history.' });
  }
});

/**
 * 6. Change Requests Inbox: View all requests
 */
router.get('/change-requests', async (req, res) => {
  try {
    const db = await getDb();
    const requests = await db.all(
      `SELECT cr.id, cr.student_id, cr.current_faculty_id, cr.requested_faculty_id,
              cr.reason, cr.status, cr.hod_remark, cr.created_at, cr.decided_at,
              s.name as student_name, s.email as student_email,
              sp.reg_no, sp.strength, sp.cgpa,
              cf.name as current_faculty_name,
              rf.name as requested_faculty_name
       FROM change_requests cr
       JOIN users s ON cr.student_id = s.id
       JOIN student_profiles sp ON s.id = sp.user_id
       JOIN users cf ON cr.current_faculty_id = cf.id
       LEFT JOIN users rf ON cr.requested_faculty_id = rf.id
       ORDER BY CASE WHEN cr.status = 'pending' THEN 0 ELSE 1 END, cr.created_at DESC`
    );

    return res.json({ requests });
  } catch (error) {
    console.error('Get change requests error:', error);
    return res.status(500).json({ error: 'Failed to retrieve change requests.' });
  }
});

/**
 * 7. Decide Change Request: Approve or Reject
 * Body: { requestId, action: 'approve'|'reject', newFacultyId, remark }
 */
router.post('/change-requests/decide', async (req, res) => {
  try {
    const { requestId, action, newFacultyId, remark } = req.body;

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Valid requestId and action ("approve" or "reject") required.' });
    }

    const db = await getDb();

    const request = await db.get(
      `SELECT cr.*, s.name as student_name, s.email as student_email,
              cf.name as current_faculty_name
       FROM change_requests cr
       JOIN users s ON cr.student_id = s.id
       JOIN users cf ON cr.current_faculty_id = cf.id
       WHERE cr.id = ?`,
      [requestId]
    );

    if (!request) {
      return res.status(404).json({ error: 'Change request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request has already been decided (${request.status}).` });
    }

    const cleanRemark = remark ? sanitizeString(remark) : '';
    const now = new Date().toISOString();

    if (action === 'approve') {
      const finalFacultyId = newFacultyId || request.requested_faculty_id;
      if (!finalFacultyId) {
        return res.status(400).json({ error: 'A new faculty member must be selected for approval.' });
      }

      const newFaculty = await db.get(
        `SELECT id, name FROM users WHERE id = ? AND role = 'faculty'`,
        [finalFacultyId]
      );

      if (!newFaculty) {
        return res.status(404).json({ error: 'Selected replacement faculty does not exist.' });
      }

      // Update change request
      await db.run(
        `UPDATE change_requests
         SET status = 'approved', hod_remark = ?, decided_at = ?, requested_faculty_id = ?
         WHERE id = ?`,
        [cleanRemark, now, finalFacultyId, requestId]
      );

      // Update student profile
      await db.run(
        `UPDATE student_profiles SET faculty_id = ? WHERE user_id = ?`,
        [finalFacultyId, request.student_id]
      );

      // Log in faculty_assignments
      await db.run(
        `INSERT INTO faculty_assignments (student_id, faculty_id, assigned_by, note)
         VALUES (?, ?, ?, ?)`,
        [
          request.student_id,
          finalFacultyId,
          req.user.id,
          `Approved change request #${requestId}: ${cleanRemark}`
        ]
      );

      // Emit socket notification
      const io = req.app.get('io');
      if (io) {
        io.emit('change_request_decided', {
          requestId,
          studentId: request.student_id,
          status: 'approved',
          facultyName: newFaculty.name
        });
      }

      return res.json({
        message: `Change request approved. Student ${request.student_name} reassigned to ${newFaculty.name}.`
      });
    } else {
      // Rejection
      await db.run(
        `UPDATE change_requests
         SET status = 'rejected', hod_remark = ?, decided_at = ?
         WHERE id = ?`,
        [cleanRemark, now, requestId]
      );

      const io = req.app.get('io');
      if (io) {
        io.emit('change_request_decided', {
          requestId,
          studentId: request.student_id,
          status: 'rejected',
          remark: cleanRemark
        });
      }

      return res.json({
        message: `Change request rejected. Remark logged for student.`
      });
    }
  } catch (error) {
    console.error('Decide change request error:', error);
    return res.status(500).json({ error: 'Failed to process change request decision.' });
  }
});

/**
 * 8. Post Notification
 * Audience selector: 'students', 'faculty', or 'both'
 */
router.post('/notifications', async (req, res) => {
  try {
    const { title, body, audience, deadline } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return res.status(400).json({ error: 'Body/Message is required.' });
    }

    if (!audience || !validateAudience(audience)) {
      return res.status(400).json({ error: 'Audience must be "students", "faculty", or "both".' });
    }

    const db = await getDb();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    const cleanDeadline = deadline ? deadline.trim() : null;

    const result = await db.run(
      `INSERT INTO notifications (title, body, audience, posted_by, deadline)
       VALUES (?, ?, ?, ?, ?)`,
      [cleanTitle, cleanBody, audience, req.user.id, cleanDeadline]
    );

    const newNotification = await db.get(
      `SELECT n.*, u.name as posted_by_name
       FROM notifications n
       JOIN users u ON n.posted_by = u.id
       WHERE n.id = ?`,
      [result.lastID]
    );

    // Real-time broadcast to relevant audience via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new_notification', newNotification);
    }

    return res.status(201).json({
      message: 'Notification posted successfully.',
      notification: newNotification
    });
  } catch (error) {
    console.error('Post notification error:', error);
    return res.status(500).json({ error: 'Failed to post notification.' });
  }
});

/**
 * 9. Get Project Team Proposals with Filters & Metrics
 */
router.get('/team-proposals', async (req, res) => {
  try {
    const { status, domain, search } = req.query;
    const db = await getDb();

    // Summary counts
    const pendingCountRow = await db.get(
      `SELECT COUNT(*) as count FROM teams WHERE status = 'pending_approval'`
    );
    const awaitingMentorCountRow = await db.get(
      `SELECT COUNT(*) as count FROM teams WHERE status = 'approved' AND faculty_id IS NULL`
    );
    const mentorAssignedCountRow = await db.get(
      `SELECT COUNT(*) as count FROM teams WHERE status = 'approved' AND faculty_id IS NOT NULL`
    );
    const rejectedCountRow = await db.get(
      `SELECT COUNT(*) as count FROM teams WHERE status IN ('rejected', 'modification_requested')`
    );
    const totalCountRow = await db.get(`SELECT COUNT(*) as count FROM teams`);

    let query = `
      SELECT t.*,
             l.name as leader_name, l.email as leader_email, l.avatar as leader_avatar,
             f.name as faculty_name, f.email as faculty_email, f.avatar as faculty_avatar,
             fp.designation as faculty_designation,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      LEFT JOIN users l ON t.leader_id = l.id
      LEFT JOIN users f ON t.faculty_id = f.id
      LEFT JOIN faculty_profiles fp ON f.id = fp.user_id
      WHERE 1=1
    `;
    const params = [];

    if (status === 'pending_approval') {
      query += ` AND t.status = 'pending_approval'`;
    } else if (status === 'awaiting_mentor') {
      query += ` AND t.status = 'approved' AND t.faculty_id IS NULL`;
    } else if (status === 'mentor_assigned') {
      query += ` AND t.status = 'approved' AND t.faculty_id IS NOT NULL`;
    } else if (status === 'rejected') {
      query += ` AND t.status IN ('rejected', 'modification_requested')`;
    } else if (status && status !== 'all') {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (domain && domain !== 'all') {
      query += ` AND LOWER(t.domain) = LOWER(?)`;
      params.push(domain);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      query += ` AND (LOWER(t.name) LIKE ? OR LOWER(COALESCE(t.project_title, '')) LIKE ? OR LOWER(COALESCE(t.technologies, '')) LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY t.created_at DESC`;

    const teams = await db.all(query, params);

    // Fetch members for each team
    for (const team of teams) {
      const members = await db.all(
        `SELECT u.id, u.name, u.email, u.avatar, tm.role as team_role,
                sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department
         FROM team_members tm
         JOIN users u ON tm.student_id = u.id
         LEFT JOIN student_profiles sp ON u.id = sp.user_id
         WHERE tm.team_id = ?
         ORDER BY (CASE WHEN tm.role = 'leader' THEN 0 ELSE 1 END), u.name ASC`,
        [team.id]
      );
      team.members = members;
    }

    return res.json({
      proposals: teams,
      metrics: {
        pendingCount: pendingCountRow ? pendingCountRow.count : 0,
        awaitingMentorCount: awaitingMentorCountRow ? awaitingMentorCountRow.count : 0,
        mentorAssignedCount: mentorAssignedCountRow ? mentorAssignedCountRow.count : 0,
        rejectedCount: rejectedCountRow ? rejectedCountRow.count : 0,
        totalCount: totalCountRow ? totalCountRow.count : 0
      }
    });
  } catch (error) {
    console.error('HOD team proposals error:', error);
    return res.status(500).json({ error: 'Failed to retrieve team proposals.' });
  }
});

/**
 * 10. HOD: Decide Proposal (Approve, Reject, or Request Modifications)
 */
router.post('/team-proposals/:teamId/decide', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { action, remarks } = req.body; // 'approve', 'reject', 'request_modifications'
    const db = await getDb();

    if (!['approve', 'reject', 'request_modifications'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve, reject, or request_modifications.' });
    }

    const team = await db.get(`SELECT * FROM teams WHERE id = ?`, [teamId]);
    if (!team) {
      return res.status(404).json({ error: 'Team proposal not found.' });
    }

    const cleanRemarks = remarks ? sanitizeString(remarks) : '';
    const io = req.app.get('io');
    const hodId = req.user.id;

    // Fetch team members to notify all students
    const members = await db.all(`SELECT student_id FROM team_members WHERE team_id = ?`, [teamId]);

    if (action === 'approve') {
      await db.run(
        `UPDATE teams SET status = 'approved', hod_remarks = ? WHERE id = ?`,
        [cleanRemarks, teamId]
      );

      // Notify all team students
      for (const m of members) {
        await createSystemNotification(db, io, {
          title: 'Project Proposal Approved! 🎉',
          body: `HOD has approved your capstone team proposal "${team.name}" (${team.project_title || team.name}). A faculty mentor will be assigned shortly.`,
          audience: 'user',
          postedBy: hodId,
          targetUserId: m.student_id
        });
      }

      return res.json({ message: 'Project proposal approved successfully. Team is now ready for mentor assignment.' });
    } else if (action === 'reject') {
      await db.run(
        `UPDATE teams SET status = 'rejected', hod_remarks = ? WHERE id = ?`,
        [cleanRemarks, teamId]
      );

      for (const m of members) {
        await createSystemNotification(db, io, {
          title: 'Project Proposal Rejected',
          body: `HOD did not approve team proposal "${team.name}". Remark: ${cleanRemarks || 'Does not meet departmental capstone criteria.'}`,
          audience: 'user',
          postedBy: hodId,
          targetUserId: m.student_id
        });
      }

      return res.json({ message: 'Project proposal marked as rejected.' });
    } else if (action === 'request_modifications') {
      await db.run(
        `UPDATE teams SET status = 'modification_requested', hod_remarks = ? WHERE id = ?`,
        [cleanRemarks, teamId]
      );

      for (const m of members) {
        await createSystemNotification(db, io, {
          title: 'Proposal Modifications Requested',
          body: `HOD requested changes to proposal "${team.name}". Remark: ${cleanRemarks || 'Please update scope and technologies.'}`,
          audience: 'user',
          postedBy: hodId,
          targetUserId: m.student_id
        });
      }

      return res.json({ message: 'Modifications requested from team leader.' });
    }
  } catch (error) {
    console.error('Decide proposal error:', error);
    return res.status(500).json({ error: 'Failed to process proposal decision.' });
  }
});

/**
 * 11. HOD: Get Ranked Faculty Mentor Recommendations for a Project Team
 */
router.get('/team-proposals/:teamId/mentor-recommendations', async (req, res) => {
  try {
    const { teamId } = req.params;
    const db = await getDb();

    const team = await db.get(`SELECT * FROM teams WHERE id = ?`, [teamId]);
    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }

    // Retrieve all faculty members
    const facultyList = await db.all(
      `SELECT u.id, u.name, u.email, u.avatar,
              fp.designation, fp.department, fp.bio, fp.subjects, fp.languages, fp.linkedin_url
       FROM users u
       JOIN faculty_profiles fp ON u.id = fp.user_id
       WHERE u.role = 'faculty'
       ORDER BY u.name ASC`
    );

    // Dynamically calculate compatibility score for each faculty
    const { calculateFacultyMentorMatch } = await import('../utils/recommendations.js');
    const recommended = [];

    for (const fac of facultyList) {
      // Count current active teams mentored by this faculty
      const workloadRow = await db.get(
        `SELECT COUNT(*) as count FROM teams WHERE faculty_id = ? AND status = 'approved'`,
        [fac.id]
      );
      const activeMentoredCount = workloadRow ? workloadRow.count : 0;

      const match = calculateFacultyMentorMatch({
        faculty: fac,
        project: team,
        activeMentoredCount
      });

      recommended.push({
        ...fac,
        compatibility_score: match.score,
        compatibility_explanation: match.explanation,
        active_teams_count: activeMentoredCount,
        matched_technologies: match.matchedTech,
        domain_score: match.domainScore,
        tech_score: match.techScore,
        workload_score: match.workloadScore
      });
    }

    // Sort descending by compatibility score
    recommended.sort((a, b) => b.compatibility_score - a.compatibility_score);

    return res.json({
      team: {
        id: team.id,
        name: team.name,
        project_title: team.project_title,
        domain: team.domain,
        technologies: team.technologies,
        required_skills: team.required_skills
      },
      recommendations: recommended
    });
  } catch (error) {
    console.error('Mentor recommendations error:', error);
    return res.status(500).json({ error: 'Failed to generate mentor recommendations.' });
  }
});

/**
 * 12. HOD: Assign Faculty Mentor to Approved Team
 */
router.post('/team-proposals/:teamId/assign-mentor', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { facultyId, note = '' } = req.body;
    const db = await getDb();
    const hodId = req.user.id;

    if (!facultyId) {
      return res.status(400).json({ error: 'Please select a faculty mentor to assign.' });
    }

    const team = await db.get(`SELECT * FROM teams WHERE id = ?`, [teamId]);
    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }

    if (team.status !== 'approved') {
      return res.status(400).json({ error: 'Mentor can only be assigned to approved project teams.' });
    }

    const faculty = await db.get(
      `SELECT u.id, u.name, u.email FROM users u WHERE u.id = ? AND u.role = 'faculty'`,
      [facultyId]
    );
    if (!faculty) {
      return res.status(404).json({ error: 'Selected faculty mentor does not exist.' });
    }

    // 1. Assign mentor in teams table
    await db.run(
      `UPDATE teams SET faculty_id = ? WHERE id = ?`,
      [facultyId, teamId]
    );

    // 2. Add / Link faculty to team chat group
    let chatGroup = await db.get(`SELECT id FROM chat_groups WHERE team_id = ?`, [teamId]);
    if (chatGroup) {
      await db.run(
        `UPDATE chat_groups SET faculty_id = ? WHERE id = ?`,
        [facultyId, chatGroup.id]
      );
      await db.run(
        `INSERT OR IGNORE INTO chat_group_members (group_id, user_id) VALUES (?, ?)`,
        [chatGroup.id, facultyId]
      );
      // Post system announcement in chat
      await db.run(
        `INSERT INTO messages (group_id, sender_id, body)
         VALUES (?, ?, ?)`,
        [chatGroup.id, hodId, `📢 Department Update: Dr. ${faculty.name} has been assigned as the official Faculty Mentor for this team.`]
      );
    } else {
      // Create chat group if not existed
      const cgRes = await db.run(
        `INSERT INTO chat_groups (name, team_id, faculty_id, created_by) VALUES (?, ?, ?, ?)`,
        [`Team: ${team.name}`, teamId, facultyId, hodId]
      );
      const newGroupId = cgRes.lastID;
      await db.run(`INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)`, [newGroupId, facultyId]);
      const members = await db.all(`SELECT student_id FROM team_members WHERE team_id = ?`, [teamId]);
      for (const m of members) {
        await db.run(`INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)`, [newGroupId, m.student_id]);
      }
    }

    // 3. Log audit history
    const members = await db.all(`SELECT student_id FROM team_members WHERE team_id = ?`, [teamId]);
    for (const m of members) {
      await db.run(
        `INSERT INTO faculty_assignments (student_id, faculty_id, assigned_by, note)
         VALUES (?, ?, ?, ?)`,
        [m.student_id, facultyId, hodId, `Team Mentorship Allocation: ${team.name} (${note || 'Department Approved'})`]
      );
    }

    // 4. Send Notifications
    const io = req.app.get('io');
    // To faculty
    await createSystemNotification(db, io, {
      title: 'New Capstone Team Mentorship Assigned! 🎓',
      body: `You have been appointed as the faculty guide for team "${team.name}" (${team.project_title || team.name}). Access their project workspace and team chat.`,
      audience: 'user',
      postedBy: hodId,
      targetUserId: facultyId
    });

    // To all students in the team
    for (const m of members) {
      await createSystemNotification(db, io, {
        title: 'Faculty Mentor Assigned! 🎓',
        body: `Dr. ${faculty.name} has been assigned as your Faculty Mentor for team "${team.name}". You can now start collaborating in Team & Mentor Chat.`,
        audience: 'user',
        postedBy: hodId,
        targetUserId: m.student_id
      });
    }

    return res.json({
      message: `Successfully assigned Dr. ${faculty.name} as mentor for team "${team.name}".`,
      teamId,
      facultyId
    });
  } catch (error) {
    console.error('Assign mentor error:', error);
    return res.status(500).json({ error: 'Failed to assign faculty mentor.' });
  }
});

export default router;
