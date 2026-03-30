/* eslint-disable no-console */
import http from 'node:http';

// --- Mock Data ---

const users = [
  {
    id: "mock-user-123",
    email: "test.user@example.com",
    name: "Test User",
    role: "user",
    emailVerified: true,
    doneSetup: true,
    personalized: true,
    mfaEnabled: false,
    tenantRole: "admin"
  },
  {
    id: "mock-user-456",
    email: "teacher.smith@example.com",
    name: "Mr. Smith",
    role: "user",
    tenantRole: "moderator"
  },
  {
    id: "mock-user-789",
    email: "admin.doe@example.com",
    name: "Admin Doe",
    role: "superadmin",
    tenantRole: "admin"
  }
];

const mockItems = [
  // Group 1 Items
  {
    id: "item-1",
    type: "homework",
    title: "Math Exercises",
    subject: "Math",
    description: "Please complete exercises 1 through 15 on page 42. Show all your work for the algebraic equations.",
    images: [],
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // in 2 days
    createdBy: users[1].id,
    createdByEmail: users[1].email,
    createdByName: users[1].name,
    timeColor: "#3b82f6",
    editorNote: ""
  },
  {
    id: "item-2",
    type: "dalton",
    title: "History Essay Draft",
    subject: "History",
    description: "Write the first draft of your essay on the French Revolution. Minimum 500 words.",
    images: [],
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    createdBy: users[1].id,
    createdByEmail: users[1].email,
    createdByName: users[1].name,
    timeColor: "#ef4444",
    editorNote: "Make sure to cite at least 3 sources."
  },
  {
    id: "item-3",
    type: "exam",
    title: "Biology Midterm",
    subject: "Biology",
    description: "Covers chapters 1 through 4. Multiple choice and short answer questions.",
    images: [],
    dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    createdBy: users[2].id,
    createdByEmail: users[2].email,
    createdByName: users[2].name,
    timeColor: "#22c55e",
    editorNote: ""
  },
  
  // Group 2 Items
  {
    id: "item-4",
    type: "homework",
    title: "Physics Lab Report",
    subject: "Physics",
    description: "Write up the results from yesterday's pendulum experiment.",
    images: [],
    dueDate: new Date(Date.now() + 86400000 * 1).toISOString(),
    createdBy: users[1].id,
    createdByEmail: users[1].email,
    createdByName: users[1].name,
    timeColor: "#f59e0b",
    editorNote: ""
  },
  {
    id: "item-5",
    type: "dalton",
    title: "English Reading",
    subject: "English",
    description: "Read chapters 5 and 6 of 'To Kill a Mockingbird'. Prepare for discussion.",
    images: [],
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    createdBy: users[0].id, // Self created
    createdByEmail: users[0].email,
    createdByName: users[0].name,
    timeColor: "#8b5cf6",
    editorNote: ""
  },
  {
    id: "item-6",
    type: "exam",
    title: "Chemistry Quiz",
    subject: "Chemistry",
    description: "Periodic table and bonding concepts.",
    images: [],
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    createdBy: users[2].id,
    createdByEmail: users[2].email,
    createdByName: users[2].name,
    timeColor: "#ec4899",
    editorNote: ""
  }
];

// Generate a full schedule
const generateSchedule = () => {
  const schedule = [];
  const subjects = ['Math', 'English', 'History', 'Physics', 'Chemistry', 'Biology', 'PE', 'Art', 'Music', 'CS'];
  const rooms = ['R101', 'R102', 'R201', 'R202', 'Gym', 'ArtRm', 'MusRm', 'Lab1', 'Lab2'];
  
  let idCounter = 1;
  for (let day = 1; day <= 5; day++) {
    for (let slot = 1; slot <= 6; slot++) {
      // Randomly skip some slots to make it realistic
      if (Math.random() > 0.8) continue;
      
      const subjectIndex = Math.floor(Math.random() * subjects.length);
      const roomIndex = Math.floor(Math.random() * rooms.length);
      
      schedule.push({
        id: `lesson-${idCounter++}`,
        day: day,
        slot: slot,
        duration: 1,
        room: rooms[roomIndex],
        subject: subjects[subjectIndex],
        subjectAbbr: subjects[subjectIndex].substring(0, 3).toUpperCase(),
        courseId: `course-${subjectIndex}`
      });
    }
  }
  return schedule;
};

const mockSchedule = generateSchedule();

const mockAnnouncements = [
  {
    id: "ann-1",
    content: "Reminder: The library will be closed this Friday for maintenance. Please return your books beforehand.",
    color: "info",
    createdBy: users[2].id,
    createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
  },
  {
    id: "ann-2",
    content: "Urgent: Due to severe weather warnings, all after-school activities are cancelled today.",
    color: "danger",
    createdBy: users[2].id,
    createdAt: new Date().toISOString()
  }
];

const mockReadStatus = {
  "ann-1": true,
  "ann-2": false // This will trigger the notification dot
};

const mockSubs = [
  {
    id: "sub-1",
    lessonId: mockSchedule[0]?.id || "lesson-1",
    day: mockSchedule[0]?.day || 1,
    slot: mockSchedule[0]?.slot || 1,
    duration: 1,
    subject: "Cover",
    subjectAbbr: "COV",
    room: "Library",
    createdAt: new Date().toISOString()
  }
];


/**
 * Mock Backend for local development.
 * Simulates authentication, schedule, tasks, and session endpoints.
 */
const server = http.createServer((req, res) => {
  // Simulate network latency (200ms)
  const delay = 200;

  // JSON Helper
  const json = (data, status = 200) => {
    setTimeout(() => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }, delay);
  };

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(`[Mock API] ${req.method} ${req.url}`);

  // Base paths matching
  const urlPath = req.url.split('?')[0];

  // Endpoint: CSRF Init (always succeed)
  if (urlPath === '/api/system/csrf/init') {
    return json({ ok: true });
  }

  // Endpoint: Auth Check / User Data
  if (urlPath === '/api/auth/me') {
    return json({
      authenticated: true,
      ...users[0]
    });
  }

  // Endpoint: Group Status
  if (urlPath === '/api/groups/status') {
    return json({
      authenticated: true,
      group: { 
        id: "mock-group-2", 
        name: "Test Class 10A", 
        ownerId: "mock-user-123" 
      },
      groups: [
        {
          id: "mock-group-1", 
          name: "Test Class 9C", 
          role: "admin",
          hasUnreadContent: true // Triggers the notification dot
        },
        { 
          id: "mock-group-2", 
          name: "Test Class 10A", 
          role: "user",
          hasUnreadContent: false
        }
      ]
    });
  }

  // Endpoints: Items (Tasks/Homework)
  if (urlPath === '/api/items') {
    return json(mockItems);
  }

  // Endpoints: Schedule
  if (urlPath === '/api/schedule') {
    return json(mockSchedule);
  }

  if (urlPath === '/api/schedule/subs') {
    return json(mockSubs);
  }

  if (urlPath === '/api/schedule/announcements') {
    return json(mockAnnouncements);
  }

  if (urlPath === '/api/schedule/announcements/read-status') {
    return json(mockReadStatus);
  }

  // User Item State
  if (urlPath === '/api/user/checks') {
    return json(["item-1"]); // Mark first item as checked
  }

  if (urlPath === '/api/user/visibility') {
    return json([]); // Hidden items
  }

  if (urlPath === '/api/user/pins') {
    return json(["item-3"]); // Pinned item
  }

  if (urlPath === '/api/todos') {
    return json([]); // Personal todos
  }
  
  if (urlPath === '/api/auth/providers') {
    return json([]);
  }

  // Group Admin Endpoints
  if (urlPath === '/api/group-admin/members') {
    return json(users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.id === 'mock-user-123' ? 'owner' : (u.id === 'mock-user-456' ? 'admin' : 'user'),
      joinedAt: new Date().toISOString()
    })));
  }

  // Fallback for any other /api requests
  if (urlPath.startsWith('/api')) {
    return json({ ok: true, data: [] });
  }

  // 404
  res.writeHead(404);
  res.end();
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Mock Backend running at http://localhost:${PORT}`);
});
